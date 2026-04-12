"""
Inspira — InspirationAnalyzer
Maps to SRS: FR-01 (Inspiration Image Understanding)

Responsibility:
    Take any interior design image as input.
    Detect and segment every furniture item.
    Extract style, colour palette, and room type.
    Output a structured InspirationImage object.

Pipeline:
    Image → Grounded-SAM → CLIP → GPT-4o mini → InspirationImage
"""

import os
import base64
import json
from pathlib import Path
from typing import List, Tuple, Optional

import numpy as np
import torch
import cv2
from PIL import Image
import requests

from inspira.utils.datatypes import InspirationImage, FurnitureItem
from inspira.utils.constants import (
    DEVICE, CLIP_MODEL, FURNITURE_CATEGORIES,
    STYLE_CATEGORIES, CLIP_DIM
)
from inspira.utils.logger import get_logger

log = get_logger(__name__)


class InspirationAnalyzer:
    """
    Analyzes an interior design inspiration image.

    Usage:
        analyzer = InspirationAnalyzer()
        result   = analyzer.analyze("path/to/pinterest_image.jpg")

        print(result.style)           # "scandinavian"
        print(result.furniture_count) # 4
        for item in result.furniture:
            print(item.label, item.confidence)
    """

    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Args:
            openai_api_key: Your OpenAI API key for GPT-4o mini.
                            If None, reads from OPENAI_API_KEY env variable.
                            If neither exists, style/room analysis is skipped.
        """
        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self._clip_model    = None
        self._clip_preprocess = None
        self._sam_predictor = None
        self._dino_model    = None

        log.info("InspirationAnalyzer created (models load on first use)")

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def analyze(self, image_path: str) -> InspirationImage:
        """
        Full analysis pipeline for one inspiration image.

        Args:
            image_path: Path to any JPG/PNG image.

        Returns:
            InspirationImage with furniture, style, palette populated.
        """
        log.info(f"Analyzing: {image_path}")
        path = Path(image_path)
        assert path.exists(), f"Image not found: {image_path}"

        # Load image in two formats:
        # - PIL for CLIP (expects PIL Image)
        # - numpy for SAM and OpenCV operations
        pil_image = Image.open(path).convert("RGB")
        np_image  = np.array(pil_image)

        log.info(
            f"Image loaded: {np_image.shape[1]}x{np_image.shape[0]} px"
        )

        # ── Step 1: Extract colour palette ─────────────────────────────
        palette = self._extract_palette(pil_image, n_colours=5)
        log.info(f"Palette extracted: {len(palette)} colours")

        # ── Step 2: Detect and segment furniture ───────────────────────
        furniture_items = self._detect_furniture(np_image, pil_image)
        log.info(f"Furniture detected: {len(furniture_items)} items")

        # ── Step 3: Understand style and room type ─────────────────────
        style, room_type, layout_desc = self._understand_scene(
            image_path, furniture_items
        )
        log.info(f"Style: {style} | Room: {room_type}")

        # ── Assemble result ────────────────────────────────────────────
        result = InspirationImage(
            image_path   = str(path),
            raw_image    = np_image,
            furniture    = furniture_items,
            style        = style,
            palette      = palette,
            room_type    = room_type,
            layout_desc  = layout_desc,
        )

        log.info(
            f"Analysis complete ✅ | "
            f"{result.furniture_count} furniture items | "
            f"style={result.style}"
        )
        return result

    # ------------------------------------------------------------------ #
    #  Step 1: Colour Palette Extraction                                   #
    # ------------------------------------------------------------------ #

    def _extract_palette(
        self,
        image: Image.Image,
        n_colours: int = 5
    ) -> List[Tuple[int, int, int]]:
        """
        Extract the dominant colour palette from the image.

        How it works:
            We use K-means clustering on all pixels.
            Each cluster center is a dominant colour.
            This tells us if the room is warm-toned, cool-toned,
            neutral, etc. — which feeds into style matching.

        Args:
            image:     PIL Image
            n_colours: How many dominant colours to extract

        Returns:
            List of (R, G, B) tuples, most dominant first.
        """
        # Resize to speed up clustering — colour doesn't need full res
        small = image.resize((150, 150))
        pixels = np.array(small).reshape(-1, 3).astype(np.float32)

        # K-means clustering
        from sklearn.cluster import KMeans
        kmeans = KMeans(n_clusters=n_colours, random_state=42, n_init=10)
        kmeans.fit(pixels)

        # Sort clusters by size (most common colour first)
        counts  = np.bincount(kmeans.labels_)
        centres = kmeans.cluster_centers_[np.argsort(-counts)]

        return [
            (int(c[0]), int(c[1]), int(c[2]))
            for c in centres
        ]

    # ------------------------------------------------------------------ #
    #  Step 2: Furniture Detection and Segmentation                        #
    # ------------------------------------------------------------------ #

    def _detect_furniture(
        self,
        np_image: np.ndarray,
        pil_image: Image.Image,
    ) -> List[FurnitureItem]:
        """
        Detect and segment all furniture items in the image.

        Strategy:
            We use CLIP zero-shot classification here because
            Grounded-SAM requires heavy model downloads not ideal
            for local M1 development. On Colab we swap to the full
            Grounded-SAM pipeline — the interface is identical.

            Local (M1):   CLIP sliding window detection
            Colab (GPU):  Grounded-SAM full pipeline

        Returns:
            List of FurnitureItem with bbox, mask, confidence.
        """
        self._load_clip()

        items = []
        h, w  = np_image.shape[:2]

        # ── CLIP zero-shot detection ────────────────────────────────────
        # Strategy: divide image into a grid of overlapping patches.
        # For each patch, ask CLIP: which furniture category fits best?
        # If confidence is high enough, record it as a detection.

        import clip

        # Encode all furniture category text labels once
        text_tokens = clip.tokenize(
            [f"a {cat} in an interior room" for cat in FURNITURE_CATEGORIES]
        ).to(DEVICE)

        with torch.no_grad():
            text_features = self._clip_model.encode_text(text_tokens)
            text_features = text_features / text_features.norm(
                dim=-1, keepdim=True
            )

        # Grid parameters
        # We use a 3x3 grid with 20% overlap between patches
        grid_rows, grid_cols = 3, 3
        overlap = 0.20

        step_h = int(h / (grid_rows - overlap))
        step_w = int(w / (grid_cols - overlap))
        patch_h = int(h / grid_rows * (1 + overlap))
        patch_w = int(w / grid_cols * (1 + overlap))

        seen_labels = {}   # Track best detection per category

        for row in range(grid_rows):
            for col in range(grid_cols):
                # Compute patch boundaries (clamped to image edges)
                y1 = min(row * step_h, h - patch_h)
                x1 = min(col * step_w, w - patch_w)
                y2 = min(y1 + patch_h, h)
                x2 = min(x1 + patch_w, w)

                # Extract patch
                patch = pil_image.crop((x1, y1, x2, y2))

                # CLIP encode
                image_input = self._clip_preprocess(patch).unsqueeze(0).to(DEVICE)
                with torch.no_grad():
                    image_features = self._clip_model.encode_image(image_input)
                    image_features = image_features / image_features.norm(
                        dim=-1, keepdim=True
                    )

                # Cosine similarity against all furniture labels
                similarities = (image_features @ text_features.T).squeeze(0)
                similarities = similarities.cpu().numpy()

                # Take best match
                best_idx  = int(np.argmax(similarities))
                best_conf = float(similarities[best_idx])
                best_label = FURNITURE_CATEGORIES[best_idx]

                # Threshold: only accept confident detections
                # 0.20 is calibrated for CLIP ViT-B/32 on interior images
                if best_conf > 0.20:
                    bbox = np.array([x1, y1, x2, y2], dtype=np.float32)

                    # Keep only the highest-confidence detection per category
                    if (best_label not in seen_labels or
                            best_conf > seen_labels[best_label].confidence):

                        # Estimate dominant colour of this region
                        patch_np = np_image[y1:y2, x1:x2]
                        colour   = self._dominant_colour(patch_np)

                        seen_labels[best_label] = FurnitureItem(
                            label      = best_label,
                            confidence = best_conf,
                            bbox_2d    = bbox,
                            mask       = None,   # Full SAM mask on Colab
                            colour     = colour,
                        )

        items = list(seen_labels.values())

        # Sort by confidence descending
        items.sort(key=lambda x: x.confidence, reverse=True)

        return items

    def _dominant_colour(
        self,
        patch: np.ndarray
    ) -> Tuple[int, int, int]:
        """
        Returns the single most dominant colour of an image patch.
        Uses median as a robust estimator (less affected by outliers).
        """
        median = np.median(
            patch.reshape(-1, 3), axis=0
        ).astype(int)
        return (int(median[0]), int(median[1]), int(median[2]))

    # ------------------------------------------------------------------ #
    #  Step 3: Scene Understanding via GPT-4o mini                         #
    # ------------------------------------------------------------------ #

    def _understand_scene(
        self,
        image_path: str,
        furniture_items: List[FurnitureItem],
    ) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Use GPT-4o mini vision to extract:
            - Interior design style
            - Room type
            - Natural language layout description

        Why GPT-4o mini and not just CLIP?
            CLIP is great at matching images to short labels.
            But "what is the interior design style of this room"
            requires understanding context, composition, material
            choices, and spatial relationships — that's a reasoning
            task, not a matching task. GPT-4o mini does this better
            and costs ~$0.001 per image.

        Returns:
            (style, room_type, layout_description)
            All None if no API key is available.
        """
        if not self.api_key:
            log.warning(
                "No OpenAI API key found. "
                "Skipping style/room analysis. "
                "Set OPENAI_API_KEY env variable to enable."
            )
            return None, None, None

        # Encode image to base64 for the vision API
        with open(image_path, "rb") as f:
            b64_image = base64.b64encode(f.read()).decode("utf-8")

        # Build furniture context from our detections
        furniture_list = ", ".join(
            [f"{item.label} ({item.confidence:.0%})"
             for item in furniture_items[:8]]  # Top 8 only
        ) or "none detected"

        prompt = f"""You are an expert interior designer analyzing a room photo.

Detected furniture: {furniture_list}

Please analyze this room and respond with ONLY a valid JSON object:
{{
    "style": "one of: {', '.join(STYLE_CATEGORIES)}",
    "room_type": "e.g. living room, bedroom, dining room, home office",
    "layout_description": "2-3 sentences describing the spatial layout and design philosophy"
}}

Be specific and concise. No explanation outside the JSON."""

        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type":  "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "max_tokens": 300,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{b64_image}",
                                    "detail": "low"   # Cheaper, sufficient for style
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }]
                },
                timeout=30
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]

            # Parse JSON response
            # Strip any markdown fences if present
            content = content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            data = json.loads(content)
            return (
                data.get("style"),
                data.get("room_type"),
                data.get("layout_description")
            )

        except Exception as e:
            log.warning(f"GPT-4o mini call failed: {e}. Continuing without style analysis.")
            return None, None, None

    # ------------------------------------------------------------------ #
    #  Lazy model loading                                                  #
    # ------------------------------------------------------------------ #

    def _load_clip(self):
        """
        Load CLIP model on first use.

        Why lazy loading?
            CLIP takes ~2 seconds and ~1GB RAM to load.
            If we load it in __init__, every import of this module
            pays that cost — even in unit tests that don't need it.
            Lazy loading means we only pay when we actually analyze.
        """
        if self._clip_model is not None:
            return  # Already loaded

        log.info(f"Loading CLIP ({CLIP_MODEL})...")
        import clip
        self._clip_model, self._clip_preprocess = clip.load(
            CLIP_MODEL,
            device=DEVICE
        )
        self._clip_model.eval()
        log.info("CLIP loaded ✅")
