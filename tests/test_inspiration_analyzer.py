"""
Unit tests for InspirationAnalyzer.
Run: pytest tests/test_inspiration_analyzer.py -v

All tests use mock data or the sample image.
No Ollama connection required for most tests —
scene understanding tests are skipped if Ollama is offline.
"""

import pytest
import numpy as np
from pathlib import Path
from PIL import Image

from inspira.understanding.inspiration_analyzer import InspirationAnalyzer
from inspira.utils.datatypes import InspirationImage, FurnitureItem, Affordance
from inspira.utils.constants import FURNITURE_CATEGORIES, AFFORDANCE_ACTIONS


# ── Fixtures ──────────────────────────────────────────────────────────── #

@pytest.fixture
def analyzer():
    """Analyzer with default LLaVA model."""
    return InspirationAnalyzer()

@pytest.fixture
def sample_image_path():
    path = Path("data/sample_inspirations/living_room_1.jpg")
    if not path.exists():
        pytest.skip("Sample image not found")
    return str(path)

@pytest.fixture
def mock_pil_image():
    """Synthetic room-like PIL image for fast tests."""
    arr = np.zeros((480, 640, 3), dtype=np.uint8)
    arr[300:, :]       = [180, 180, 175]   # grey floor
    arr[:300, :]       = [240, 238, 235]   # white walls
    arr[220:320, 150:450] = [101, 67, 33]  # brown sofa
    return Image.fromarray(arr)

@pytest.fixture
def mock_np_image(mock_pil_image):
    return np.array(mock_pil_image)


# ── Palette Tests ─────────────────────────────────────────────────────── #

class TestPaletteExtraction:

    def test_returns_correct_number_of_colours(self, analyzer, mock_pil_image):
        palette = analyzer._extract_palette(mock_pil_image, n_colours=3)
        assert len(palette) == 3

    def test_colours_are_valid_rgb(self, analyzer, mock_pil_image):
        palette = analyzer._extract_palette(mock_pil_image, n_colours=5)
        for r, g, b in palette:
            assert 0 <= r <= 255
            assert 0 <= g <= 255
            assert 0 <= b <= 255

    def test_dominant_colour_white_image(self, analyzer):
        white = np.full((50, 50, 3), 255, dtype=np.uint8)
        r, g, b = analyzer._dominant_colour(white)
        assert r > 200 and g > 200 and b > 200

    def test_dominant_colour_returns_tuple_of_three(self, analyzer):
        patch = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        result = analyzer._dominant_colour(patch)
        assert len(result) == 3


# ── Detection Tests ───────────────────────────────────────────────────── #

class TestFurnitureDetection:

    def test_returns_list_of_furniture_items(
        self, analyzer, sample_image_path
    ):
        pil    = Image.open(sample_image_path).convert("RGB")
        np_img = np.array(pil)
        items  = analyzer._detect_furniture(np_img, pil)
        assert isinstance(items, list)
        assert all(isinstance(i, FurnitureItem) for i in items)

    def test_labels_are_valid_categories(
        self, analyzer, sample_image_path
    ):
        pil    = Image.open(sample_image_path).convert("RGB")
        np_img = np.array(pil)
        items  = analyzer._detect_furniture(np_img, pil)
        for item in items:
            assert item.label in FURNITURE_CATEGORIES

    def test_confidence_in_valid_range(
        self, analyzer, sample_image_path
    ):
        pil    = Image.open(sample_image_path).convert("RGB")
        np_img = np.array(pil)
        items  = analyzer._detect_furniture(np_img, pil)
        for item in items:
            assert 0.0 <= item.confidence <= 1.0

    def test_sorted_by_confidence_descending(
        self, analyzer, sample_image_path
    ):
        pil    = Image.open(sample_image_path).convert("RGB")
        np_img = np.array(pil)
        items  = analyzer._detect_furniture(np_img, pil)
        if len(items) > 1:
            confs = [i.confidence for i in items]
            assert confs == sorted(confs, reverse=True)

    def test_capped_at_five_items(
        self, analyzer, sample_image_path
    ):
        pil    = Image.open(sample_image_path).convert("RGB")
        np_img = np.array(pil)
        items  = analyzer._detect_furniture(np_img, pil)
        assert len(items) <= 5


# ── Scene Understanding Tests ─────────────────────────────────────────── #

class TestSceneUnderstanding:

    def test_returns_three_values(self, analyzer, sample_image_path):
        """_understand_scene always returns a 3-tuple."""
        result = analyzer._understand_scene(sample_image_path, [])
        assert len(result) == 3

    def test_fallback_returns_valid_style(self, analyzer):
        """Fallback analysis returns a non-None style."""
        style, room, desc = analyzer._fallback_understand([])
        assert style is not None
        assert room  is not None
        assert desc  is not None

    def test_clean_response_strips_markdown(self, analyzer):
        """_clean_response correctly strips markdown fences."""
        raw = '```json\n{"style": "modern"}\n```'
        cleaned = analyzer._clean_response(raw)
        assert cleaned == '{"style": "modern"}'

    def test_clean_response_handles_plain_json(self, analyzer):
        """_clean_response passes through plain JSON unchanged."""
        raw = '{"style": "modern", "room_type": "living room"}'
        cleaned = analyzer._clean_response(raw)
        assert cleaned == raw

    def test_clean_response_handles_empty(self, analyzer):
        """_clean_response returns empty string for empty input."""
        assert analyzer._clean_response("") == ""
        assert analyzer._clean_response("   ") == ""


# ── Full Pipeline Tests ───────────────────────────────────────────────── #

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

    def test_result_has_furniture(
        self, analyzer, sample_image_path
    ):
        result = analyzer.analyze(sample_image_path)
        assert result.furniture_count > 0

    def test_result_has_style(
        self, analyzer, sample_image_path
    ):
        result = analyzer.analyze(sample_image_path)
        assert result.style is not None

    def test_result_has_room_type(
        self, analyzer, sample_image_path
    ):
        result = analyzer.analyze(sample_image_path)
        assert result.room_type is not None

    def test_result_has_layout_description(
        self, analyzer, sample_image_path
    ):
        result = analyzer.analyze(sample_image_path)
        assert result.layout_desc is not None
        assert len(result.layout_desc) > 10

    def test_nonexistent_image_raises(self, analyzer):
        with pytest.raises(AssertionError):
            analyzer.analyze("does_not_exist.jpg")


# ── Affordance Dataclass Tests ─────────────────────────────────────────── #

class TestAffordance:

    def test_valid_affordance_creates_successfully(self):
        a = Affordance(action="navigable_to", confidence=0.9)
        assert a.action == "navigable_to"

    def test_invalid_action_raises(self):
        with pytest.raises(AssertionError):
            Affordance(action="fly_through_air", confidence=0.5)

    def test_confidence_out_of_range_raises(self):
        with pytest.raises(AssertionError):
            Affordance(action="sittable", confidence=1.5)
