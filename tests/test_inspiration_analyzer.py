"""
Unit tests for InspirationAnalyzer.
Run: pytest tests/test_inspiration_analyzer.py -v
"""

import pytest
import numpy as np
from pathlib import Path
from unittest.mock import patch, MagicMock

from inspira.understanding.inspiration_analyzer import InspirationAnalyzer
from inspira.utils.datatypes import InspirationImage, FurnitureItem
from inspira.utils.constants import FURNITURE_CATEGORIES


# ── Fixtures ──────────────────────────────────────────────────────────── #

@pytest.fixture
def analyzer():
    """Analyzer without API key — skips GPT calls."""
    return InspirationAnalyzer(openai_api_key=None)

@pytest.fixture
def sample_image_path():
    path = Path("data/sample_inspirations/living_room_1.jpg")
    if not path.exists():
        pytest.skip("Sample image not downloaded yet")
    return str(path)

@pytest.fixture
def mock_rgb_image():
    """Synthetic room-like image for fast tests."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Grey floor
    img[300:, :] = [180, 180, 175]
    # White walls
    img[:300, :] = [240, 238, 235]
    # Brown sofa shape
    img[220:320, 150:450] = [101, 67, 33]
    return img


# ── Palette Tests ─────────────────────────────────────────────────────── #

class TestPaletteExtraction:

    def test_returns_correct_number_of_colours(self, analyzer):
        from PIL import Image
        img = Image.fromarray(
            np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        )
        palette = analyzer._extract_palette(img, n_colours=3)
        assert len(palette) == 3

    def test_colours_are_valid_rgb(self, analyzer):
        from PIL import Image
        img = Image.fromarray(
            np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        )
        palette = analyzer._extract_palette(img, n_colours=5)
        for r, g, b in palette:
            assert 0 <= r <= 255
            assert 0 <= g <= 255
            assert 0 <= b <= 255

    def test_dominant_colour_white_image(self, analyzer):
        white = np.full((50, 50, 3), 255, dtype=np.uint8)
        r, g, b = analyzer._dominant_colour(white)
        assert r > 200 and g > 200 and b > 200


# ── Detection Tests ───────────────────────────────────────────────────── #

class TestFurnitureDetection:

    def test_returns_list_of_furniture_items(
        self, analyzer, sample_image_path
    ):
        from PIL import Image
        pil = Image.open(sample_image_path).convert("RGB")
        np_img = np.array(pil)
        items = analyzer._detect_furniture(np_img, pil)
        assert isinstance(items, list)
        assert all(isinstance(i, FurnitureItem) for i in items)

    def test_labels_are_valid_categories(
        self, analyzer, sample_image_path
    ):
        from PIL import Image
        pil = Image.open(sample_image_path).convert("RGB")
        np_img = np.array(pil)
        items = analyzer._detect_furniture(np_img, pil)
        for item in items:
            assert item.label in FURNITURE_CATEGORIES

    def test_confidence_in_valid_range(
        self, analyzer, sample_image_path
    ):
        from PIL import Image
        pil = Image.open(sample_image_path).convert("RGB")
        np_img = np.array(pil)
        items = analyzer._detect_furniture(np_img, pil)
        for item in items:
            assert 0.0 <= item.confidence <= 1.0

    def test_sorted_by_confidence_descending(
        self, analyzer, sample_image_path
    ):
        from PIL import Image
        pil = Image.open(sample_image_path).convert("RGB")
        np_img = np.array(pil)
        items = analyzer._detect_furniture(np_img, pil)
        if len(items) > 1:
            confs = [i.confidence for i in items]
            assert confs == sorted(confs, reverse=True)


# ── Scene Understanding Tests ─────────────────────────────────────────── #

class TestSceneUnderstanding:

    def test_returns_none_without_api_key(self, analyzer):
        style, room, desc = analyzer._understand_scene(
            "fake_path.jpg", []
        )
        assert style is None
        assert room  is None
        assert desc  is None


# ── Full Pipeline Test ────────────────────────────────────────────────── #

class TestFullPipeline:

    def test_analyze_returns_inspiration_image(
        self, analyzer, sample_image_path
    ):
        result = analyzer.analyze(sample_image_path)
        assert isinstance(result, InspirationImage)

    def test_result_has_palette(
        self, analyzer, sample_image_path
    ):
        result = analyzer.analyze(sample_image_path)
        assert len(result.palette) > 0

    def test_result_has_raw_image(
        self, analyzer, sample_image_path
    ):
        result = analyzer.analyze(sample_image_path)
        assert result.raw_image is not None
        assert result.raw_image.ndim == 3

    def test_nonexistent_image_raises(self, analyzer):
        with pytest.raises(AssertionError):
            analyzer.analyze("does_not_exist.jpg")
