"""
Inspira — InspirationAnalyzer
Maps to SRS: FR-01 (Inspiration Image Understanding)

Responsibility:
    Take any interior design image as input.
    Detect and segment every furniture item.
    Extract style, colour palette, and room type.
    Output a structured InspirationImage object.

Pipeline:
    Image → CLIP (furniture detection)
          → K-means (colour palette)
          → Qwen3-VL:2b local (style, room type, layout)
          → InspirationImage

No external API keys required. Runs entirely on-device.
"""

import json
import base64
import re
from pathlib import Path
from typing import List, Tuple, Optional

import numpy as np
import torch
from PIL import Image

from inspira.utils.datatypes import InspirationImage, FurnitureItem
from inspira.utils.constants import (
    DEVICE, CLIP_MODEL, FURNITURE_CATEGORIES,
    STYLE_CATEGORIES,
)
from inspira.utils.logger import get_logger

log = get_logger(__name__)


class InspirationAnalyzer:
    """
    Analyzes an interior design inspiration image.

    All inference runs locally — no API keys needed.
    Uses CLIP for furniture detection and Qwen3-VL:2b
    for scene understanding via Ollama.

    Usage:
        analyzer = InspirationAnalyzer()
        result   = analyzer.analyze("path/to/image.jpg")

        print(result.style)           # "scandinavian"
        print(result.furniture_count) # 4
    """

    def __init__(self, qwen_model: str = "qwen3-vl:2b"):
        self.qwen_model       = qwen_model
        self._clip_model      = None
        self._clip_preprocess = None
        self._ollama_client   = None
        self._last_palette    = []

        log.info(
            f"InspirationAnalyzer created | "
            f"vision_model={qwen_model} | "
            f"device={DEVICE}"
        )

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

        pil_image = Image.open(path).convert("RGB")
        np_image  = np.array(pil_image)

        log.info(f"Image loaded: {np_image.shape[1]}x{np_image.shape[0]} px")

        # Step 1 — Colour palette
        palette = self._extract_palette(pil_image, n_colours=5)
        self._last_palette = palette
        log.info(f"Palette extracted: {len(palette)} colours")

        # Step 2 — Furniture detection
        furniture_items = self._detect_furniture(np_image, pil_image)
        log.info(f"Furniture detected: {len(furniture_items)} items")

        # Step 3 — Scene understanding
        style, room_type, layout_desc = self._understand_scene(
            image_path, furniture_items
        )
        log.info(f"Style: {style} | Room: {room_type}")

        result = InspirationImage(
            image_path  = str(path),
            raw_image   = np_image,
            furniture   = furniture_items,
            style       = style,
            palette     = palette,
            room_type   = room_type,
            layout_desc = layout_desc,
        )

        log.info(
            f"Analysis complete ✅ | "
            f"{result.furniture_count} items | "
            f"style={result.style}"
        )
        return result

    # ------------------------------------------------------------------ #
    #  Step 1: Colour Palette                                              #
    # ------------------------------------------------------------------ #

    def _extract_palette(
        self,
        image: Image.Image,
        n_colours: int = 5
    ) -> List[Tuple[int, int, int]]:
        """
        Extract dominant colours using K-means clustering.

        Why K-means?
            Every pixel is a point in 3D RGB space.
            K-means finds the N cluster centers — these
            are the N most representative colours in the image.
            Sorted by cluster size = most dominant colour first.
        """
        from sklearn.cluster import KMeans

        small  = image.resize((150, 150))
        pixels = np.array(small).reshape(-1, 3).astype(np.float32)

        kmeans = KMeans(n_clusters=n_colours, random_state=42, n_init=10)
        kmeans.fit(pixels)

        counts  = np.bincount(kmeans.labels_)
        centres = kmeans.cluster_centers_[np.argsort(-counts)]

        return [
            (int(c[0]), int(c[1]), int(c[2]))
            for c in centres
        ]

    # ------------------------------------------------------------------ #
    #  Step 2: Furniture Detection                                         #
    # ------------------------------------------------------------------ #

    def _detect_furniture(
        self,
        np_image: np.ndarray,
        pil_image: Image.Image,
    ) -> List[FurnitureItem]:
        """
        Detect furniture using CLIP zero-shot classification
        on a sliding grid of overlapping image patches.

        Why a grid?
            CLIP classifies whole images, not regions.
            By splitting into patches we can localise
            which part of the image contains each object.
            3x3 grid with 20% overlap = 9 patches, good
            coverage without being too slow.
        """
        self._load_clip()

        import clip

        h, w = np_image.shape[:2]

        # Encode all furniture category text labels once
        # We only do this once per call — not per patch
        text_tokens = clip.tokenize(
            [f"a {cat} in an interior room"
             for cat in FURNITURE_CATEGORIES]
        ).to(DEVICE)

        with torch.no_grad():
            text_features = self._clip_model.encode_text(text_tokens)
            text_features = text_features / text_features.norm(
                dim=-1, keepdim=True
            )

        # Grid parameters
        grid_rows, grid_cols = 3, 3
        overlap  = 0.20
        step_h   = int(h / (grid_rows - overlap))
        step_w   = int(w / (grid_cols - overlap))
        patch_h  = int(h / grid_rows * (1 + overlap))
        patch_w  = int(w / grid_cols * (1 + overlap))

        seen_labels = {}

        for row in range(grid_rows):
            for col in range(grid_cols):
                y1 = min(row * step_h, h - patch_h)
                x1 = min(col * step_w, w - patch_w)
                y2 = min(y1 + patch_h, h)
                x2 = min(x1 + patch_w, w)

                patch       = pil_image.crop((x1, y1, x2, y2))
                image_input = self._clip_preprocess(patch).unsqueeze(0).to(DEVICE)

                with torch.no_grad():
                    image_features = self._clip_model.encode_image(image_input)
                    image_features = image_features / image_features.norm(
                        dim=-1, keepdim=True
                    )

                similarities = (
                    image_features @ text_features.T
                ).squeeze(0).cpu().numpy()

                best_idx   = int(np.argmax(similarities))
                best_conf  = float(similarities[best_idx])
                best_label = FURNITURE_CATEGORIES[best_idx]

                if best_conf > 0.20:
                    bbox   = np.array([x1, y1, x2, y2], dtype=np.float32)
                    colour = self._dominant_colour(np_image[y1:y2, x1:x2])

                    if (best_label not in seen_labels or
                            best_conf > seen_labels[best_label].confidence):
                        seen_labels[best_label] = FurnitureItem(
                            label      = best_label,
                            confidence = best_conf,
                            bbox_2d    = bbox,
                            mask       = None,
                            colour     = colour,
                        )

        items = list(seen_labels.values())
        items.sort(key=lambda x: x.confidence, reverse=True)
        return items

    def _dominant_colour(
        self,
        patch: np.ndarray
    ) -> Tuple[int, int, int]:
        median = np.median(
            patch.reshape(-1, 3), axis=0
        ).astype(int)
        return (int(median[0]), int(median[1]), int(median[2]))

    # ------------------------------------------------------------------ #
    #  Step 3: Scene Understanding — Qwen3-VL:2b (local, free)            #
    # ------------------------------------------------------------------ #

    def _understand_scene(
        self,
        image_path: str,
        furniture_items: List[FurnitureItem],
    ) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Use Qwen3-VL:2b via Ollama to extract style, room type,
        and layout description from the image.

        Key implementation details:
            Qwen3 is a THINKING model — it wraps its reasoning
            in <think>...</think> tags before the final answer.
            We must strip these tags before parsing JSON.

            We also use /no_think flag in the prompt to suppress
            the thinking step entirely and get faster responses.

        Returns:
            (style, room_type, layout_description)
            All None if Ollama is not running.
        """
        self._load_ollama()
        if self._ollama_client is None:
            return None, None, None

        # Build context from what we already know
        furniture_list = ", ".join(
            [item.label for item in furniture_items[:6]]
        ) or "unknown"

        # /no_think suppresses Qwen3's chain-of-thought reasoning.
        # This makes responses 3-5x faster and returns clean text.
        prompt = f"""/no_think
Look at this interior design image carefully.

Detected furniture: {furniture_list}

Reply with ONLY this JSON and nothing else:
{{"style": "STYLE", "room_type": "ROOM", "layout_description": "DESCRIPTION"}}

For STYLE use exactly one of: {', '.join(STYLE_CATEGORIES)}
For ROOM use: living room, bedroom, dining room, home office, or kitchen
For DESCRIPTION write 1-2 sentences about the room's layout and feel.

JSON only. No other text."""

        try:
            with open(image_path, "rb") as f:
                b64_image = base64.b64encode(f.read()).decode("utf-8")

            log.info("Querying Qwen3-VL:2b for scene understanding...")

            response = self._ollama_client.chat(
                model=self.qwen_model,
                messages=[{
                    "role": "user",
                    "content": prompt,
                    "images": [b64_image],
                }],
                options={
                    "temperature": 0.1,
                    "num_predict": 200,
                }
            )

            raw = response["message"]["content"]
            log.info(f"Raw response: {raw[:150]}")

            # Clean the response
            cleaned = self._clean_response(raw)
            log.info(f"Cleaned response: {cleaned}")

            if not cleaned:
                log.warning("Empty response after cleaning")
                return self._fallback_understand(furniture_items)

            data = json.loads(cleaned)

            style    = data.get("style", "").lower().strip() or None
            room     = data.get("room_type", "").lower().strip() or None
            desc     = data.get("layout_description", "").strip() or None

            # Validate style against our categories
            if style and style not in STYLE_CATEGORIES:
                style = next(
                    (s for s in STYLE_CATEGORIES if s in style),
                    STYLE_CATEGORIES[0]
                )

            return style, room, desc

        except json.JSONDecodeError as e:
            log.warning(f"JSON parse failed: {e} | attempting fallback")
            return self._fallback_understand(furniture_items)
        except Exception as e:
            log.warning(f"Qwen3-VL query failed: {e}")
            return None, None, None

    def _clean_response(self, raw: str) -> str:
        """
        Clean Qwen3-VL response to extract pure JSON.

        Qwen3 thinking models can produce:
            1. <think>reasoning...</think>{"style": ...}
            2. ```json\n{"style": ...}\n```
            3. Some text before {"style": ...}
            4. Pure {"style": ...}  ← what we want

        This method handles all four cases.
        """
        if not raw or not raw.strip():
            return ""

        # Strip <think>...</think> blocks
        # re.DOTALL makes . match newlines too
        cleaned = re.sub(
            r"<think>.*?</think>",
            "",
            raw,
            flags=re.DOTALL | re.IGNORECASE
        ).strip()

        # Strip markdown code fences
        if "```" in cleaned:
            parts = cleaned.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    cleaned = part
                    break

        # Find the JSON object boundaries
        start = cleaned.find("{")
        end   = cleaned.rfind("}") + 1

        if start >= 0 and end > start:
            return cleaned[start:end]

        return ""

    def _fallback_understand(
        self,
        furniture_items: List[FurnitureItem],
    ) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Rule-based fallback when the model returns unparseable output.

        Uses furniture composition to make educated guesses about
        style and room type. Not as good as the VLM but better
        than returning None for everything.
        """
        labels = [item.label for item in furniture_items]

        # Guess room type from furniture composition
        room_type = "living room"  # default
        if "bed" in labels:
            room_type = "bedroom"
        elif "dining table" in labels:
            room_type = "dining room"
        elif "desk" in labels:
            room_type = "home office"

        # Guess style from palette
        # Neutral palette = minimalist, warm palette = scandinavian
        style = "modern"
        if self._last_palette:
            r, g, b = self._last_palette[0]
            brightness = (r + g + b) / 3
            warmth     = r - b
            if brightness > 200:
                style = "minimalist"
            elif warmth > 30:
                style = "scandinavian"
            elif brightness < 100:
                style = "industrial"

        desc = (
            f"A {style} {room_type} featuring "
            f"{', '.join(labels[:3]) or 'various furniture'} "
            f"with a cohesive design aesthetic."
        )

        log.info(f"Fallback analysis: style={style}, room={room_type}")
        return style, room_type, desc

    # ------------------------------------------------------------------ #
    #  Lazy Loading                                                        #
    # ------------------------------------------------------------------ #

    def _load_clip(self):
        """Load CLIP on first use."""
        if self._clip_model is not None:
            return
        log.info(f"Loading CLIP ({CLIP_MODEL})...")
        import clip
        self._clip_model, self._clip_preprocess = clip.load(
            CLIP_MODEL, device=DEVICE
        )
        self._clip_model.eval()
        log.info("CLIP loaded ✅")

    def _load_ollama(self):
        """
        Connect to local Ollama service on first use.

        Gracefully degrades if Ollama isn't running —
        the rest of the pipeline continues without style analysis.
        """
        if self._ollama_client is not None:
            return
        try:
            import ollama
            ollama.list()
            self._ollama_client = ollama
            log.info(f"Ollama connected ✅ | model={self.qwen_model}")
        except Exception as e:
            log.warning(
                f"Ollama not available: {e} | "
                f"Run 'ollama serve' in another terminal. "
                f"Continuing without scene understanding."
            )
            self._ollama_client = None
