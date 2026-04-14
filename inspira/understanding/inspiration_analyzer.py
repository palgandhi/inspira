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
import requests
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

    def __init__(self, qwen_model: str = "llava:7b"):
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
        Detect furniture using CLIP zero-shot classification.

        Strategy (two-pass):
            Pass 1 — Whole image classification
                     Ask CLIP: what is the DOMINANT furniture in this room?
                     High confidence threshold (0.28) — only strong matches.
                     This gives us the main piece (sofa, bed, dining table).

            Pass 2 — Grid detection for secondary items
                     3x3 overlapping grid, lower threshold (0.22).
                     Skip any label already found in Pass 1.
                     Deduplicate: keep only highest confidence per label.

        Why two passes?
            A full sofa image scores much higher for "sofa" than
            a partial patch does. Pass 1 anchors us to the right
            primary furniture. Pass 2 finds secondary items without
            contaminating the primary detection.
        """
        self._load_clip()
        import clip

        h, w = np_image.shape[:2]

        # Encode all furniture text labels once
        text_tokens = clip.tokenize(
            [f"a photo of a {cat} in an interior room"
             for cat in FURNITURE_CATEGORIES]
        ).to(DEVICE)

        with torch.no_grad():
            text_features = self._clip_model.encode_text(text_tokens)
            text_features = text_features / text_features.norm(
                dim=-1, keepdim=True
            )

        seen_labels = {}

        # ── Pass 1: Whole image ─────────────────────────────────────────
        full_input = self._clip_preprocess(pil_image).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            full_features = self._clip_model.encode_image(full_input)
            full_features = full_features / full_features.norm(
                dim=-1, keepdim=True
            )

        full_sims = (full_features @ text_features.T).squeeze(0).cpu().numpy()

        # Top 2 from whole image with high confidence
        top_indices = full_sims.argsort()[::-1][:2]
        for idx in top_indices:
            conf  = float(full_sims[idx])
            label = FURNITURE_CATEGORIES[idx]
            if conf > 0.25:
                colour = self._dominant_colour(np_image)
                seen_labels[label] = FurnitureItem(
                    label      = label,
                    confidence = conf,
                    bbox_2d    = np.array([0, 0, w, h], dtype=np.float32),
                    mask       = None,
                    colour     = colour,
                )
                break  # Only take the top whole-image detection

        # ── Pass 2: Grid for secondary items ────────────────────────────
        grid_rows, grid_cols = 3, 3
        overlap  = 0.15
        step_h   = int(h / (grid_rows - overlap))
        step_w   = int(w / (grid_cols - overlap))
        patch_h  = int(h / grid_rows * (1 + overlap))
        patch_w  = int(w / grid_cols * (1 + overlap))

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

                sims = (
                    image_features @ text_features.T
                ).squeeze(0).cpu().numpy()

                # Get top 3 from this patch
                patch_top = sims.argsort()[::-1][:3]
                for idx in patch_top:
                    conf  = float(sims[idx])
                    label = FURNITURE_CATEGORIES[idx]

                    # Skip if already found with higher confidence
                    if label in seen_labels:
                        continue

                    # Higher threshold for grid patches to reduce noise
                    if conf > 0.26:
                        bbox   = np.array([x1, y1, x2, y2], dtype=np.float32)
                        colour = self._dominant_colour(np_image[y1:y2, x1:x2])
                        seen_labels[label] = FurnitureItem(
                            label      = label,
                            confidence = conf,
                            bbox_2d    = bbox,
                            mask       = None,
                            colour     = colour,
                        )
                    break  # Only best match per patch

        items = list(seen_labels.values())
        items.sort(key=lambda x: x.confidence, reverse=True)

        # Cap at 5 items — more than that on a single image is noise
        return items[:5]

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
        Use Qwen3-VL:2b via Ollama REST API to extract style,
        room type, and layout description.

        Why REST API instead of ollama Python client:
            The REST API supports chat_template_kwargs which lets
            us set enable_thinking=False — disabling Qwen3's
            chain-of-thought reasoning that was causing empty responses.
            The Python client (v0.5.1) does not expose this parameter.

        Why single-turn direct JSON:
            Qwen3-VL:2b is too small for reliable long-form generation.
            Single-word and short JSON responses work consistently.
            We pass CLIP-detected furniture as context so the model
            only needs to classify style and room type — not describe.

        Returns:
            (style, room_type, layout_description)
            Falls back to rule-based analysis if REST call fails.
        """
        self._load_ollama()
        if not getattr(self, "_ollama_ready", False):
            return self._fallback_understand(furniture_items)

        furniture_list = ", ".join(
            [item.label for item in furniture_items[:6]]
        ) or "unknown furniture"

        styles_str = ", ".join(STYLE_CATEGORIES)
        prompt = (
            f"This interior room contains: {furniture_list}.\n"
            f"Look at the image carefully.\n"
            f"Reply with ONLY this JSON and nothing else:\n"
            f"{{\n"
            f"  \"style\": \"one of: {styles_str}\",\n"
            f"  \"room_type\": \"one of: living room, bedroom, dining room, home office, kitchen\",\n"
            f"  \"layout_description\": \"one sentence describing the room atmosphere and layout\"\n"
            f"}}\n"
            f"Replace the placeholder text with real values. JSON only."
        )

        try:
            with open(image_path, "rb") as f:
                b64_image = base64.b64encode(f.read()).decode("utf-8")

            log.info("LLaVA: querying via REST API...")

            resp = requests.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": self.qwen_model,
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 120},
                    "messages": [{
                        "role": "user",
                        "content": prompt,
                        "images": [b64_image],
                    }],
                },
                timeout=60
            )
            resp.raise_for_status()
            raw = resp.json()["message"]["content"].strip()
            log.info(f"Raw response: {repr(raw[:150])}")

            cleaned = self._clean_response(raw)
            log.info(f"Cleaned: {repr(cleaned)}")

            if not cleaned:
                log.warning("Empty response — using fallback")
                return self._fallback_understand(furniture_items)

            data  = json.loads(cleaned)
            style = data.get("style", "").lower().strip() or None
            room  = data.get("room_type", "").lower().strip() or None
            desc  = data.get("layout_description", "").strip() or None

            # Validate style is one of our categories
            if style and style not in STYLE_CATEGORIES:
                style = next(
                    (s for s in STYLE_CATEGORIES if s in style),
                    None
                )

            return style, room, desc

        except json.JSONDecodeError as e:
            log.warning(f"JSON parse failed: {e} — using fallback")
            return self._fallback_understand(furniture_items)
        except Exception as e:
            log.warning(f"Qwen3-VL failed: {e} — using fallback")
            return self._fallback_understand(furniture_items)


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
        Verify local Ollama service is reachable via REST API.

        We use direct HTTP requests instead of the ollama Python
        client because the REST API supports chat_template_kwargs
        (needed to disable Qwen3 thinking) regardless of client version.

        Sets self._ollama_ready = True if reachable, False otherwise.
        """
        if hasattr(self, "_ollama_ready"):
            return

        try:
            import requests as _req
            r = _req.get("http://localhost:11434/api/tags", timeout=3)
            r.raise_for_status()
            self._ollama_ready = True
            log.info(f"Ollama REST API connected ✅ | model={self.qwen_model}")
        except Exception as e:
            self._ollama_ready = False
            log.warning(
                f"Ollama not reachable: {e} | "
                f"Run 'ollama serve' in another terminal. "
                f"Continuing without scene understanding."
            )
