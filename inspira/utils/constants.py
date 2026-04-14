"""
Inspira — Global Constants
All configuration lives here. Never hardcode values elsewhere.
"""

import torch as _torch

# ── Image Processing ───────────────────────────────────────────────────
IMAGE_HEIGHT = 480
IMAGE_WIDTH  = 640
HFOV_DEG     = 90.0

# ── 3D Reconstruction (3DGS) ───────────────────────────────────────────
MAX_GAUSSIANS          = 100_000   # M1 safe. Colab: 500K+
DENSIFY_EVERY_N_STEPS  = 100
GAUSSIAN_LR            = 1e-3
OPACITY_RESET_INTERVAL = 3000
DENSIFY_GRAD_THRESHOLD = 2e-4

# ── Vision Models ──────────────────────────────────────────────────────
CLIP_MODEL             = "ViT-B/32"   # M1 safe. Colab: ViT-L/14
CLIP_DIM               = 512
DEPTH_MODEL            = "depth-anything/Depth-Anything-V2-Small-hf"
SAM_MODEL              = "facebook/sam-vit-base"
GROUNDING_DINO_MODEL   = "IDEA-Research/grounding-dino-tiny"

# ── Semantic Understanding ─────────────────────────────────────────────
FURNITURE_CATEGORIES = [
    "sofa", "chair", "table", "bed", "desk",
    "wardrobe", "bookshelf", "tv stand", "coffee table",
    "dining table", "lamp", "rug", "curtain", "plant",
    "mirror", "cabinet", "shelf", "stool", "ottoman",
    "sideboard",
]

SURFACE_CATEGORIES = [
    "floor", "wall", "ceiling", "window", "door",
    "pillar", "stairs",
]

STYLE_CATEGORIES = [
    "minimalist", "scandinavian", "industrial", "bohemian",
    "modern", "traditional", "mid-century modern",
    "contemporary", "rustic", "art deco",
]
# ── Affordance Actions ─────────────────────────────────────────────────
AFFORDANCE_ACTIONS = [
    "navigable_to",
    "pushable",
    "openable",
    "sittable",
    "pickable",
    "avoidable",
    "interactable",
    "containable",
    "supportive",
    "climbable",
]


# ── Adaptation Engine ──────────────────────────────────────────────────
MIN_CLEARANCE_M        = 0.6    # Minimum walkway width in metres
WINDOW_LIGHT_BUFFER_M  = 0.5   # Don't block within 0.5m of window
DOOR_CLEARANCE_M       = 1.0   # Keep 1m in front of every door

# ── API ────────────────────────────────────────────────────────────────
API_HOST               = "0.0.0.0"
API_PORT               = 8000
MAX_UPLOAD_SIZE_MB     = 50
ALLOWED_IMAGE_TYPES    = [".jpg", ".jpeg", ".png", ".webp"]

# ── Paths ──────────────────────────────────────────────────────────────
DATA_DIR               = "data"
OUTPUT_DIR             = "outputs"
RECON_DIR              = "outputs/reconstructions"
LOG_DIR                = "outputs/logs"

# ── Device ─────────────────────────────────────────────────────────────
def get_device():
    if _torch.cuda.is_available():
        return _torch.device("cuda"), _torch.cuda.get_device_name(0)
    elif _torch.backends.mps.is_available():
        return _torch.device("mps"), "Apple M1 (MPS)"
    return _torch.device("cpu"), "CPU"

DEVICE, DEVICE_NAME = get_device()
