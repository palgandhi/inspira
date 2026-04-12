"""
SemSplat-Nav — Global Constants
All magic numbers live here. Never hardcode these in other files.
"""

# Camera defaults (Habitat-Sim / AI2-THOR compatible)
IMAGE_HEIGHT = 480
IMAGE_WIDTH = 640
HFOV_DEG = 90.0  # Horizontal field of view

# Gaussian Mapper
MAX_GAUSSIANS = 80_000          # M1-safe cap (full runs: 300K on GPU)
DENSIFY_EVERY_N_STEPS = 100
GAUSSIAN_LR = 1e-3
OPACITY_RESET_INTERVAL = 3000
DENSIFY_GRAD_THRESHOLD = 2e-4

# Semantic Embedder
CLIP_MODEL = "ViT-B/32"        # M1-safe (full runs: ViT-L/14)
CLIP_DIM = 512
EMA_ALPHA = 0.3                # Feature update weight
LABEL_ASSIGN_THRESHOLD = 0.75  # Cosine similarity threshold
MIN_FRAMES_FOR_LABEL = 10      # Frames before assigning a label

# Affordance Engine
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

# Navigation
VOXEL_SIZE_M = 0.05            # 5cm voxel grid
SUCCESS_THRESHOLD_M = 1.0      # ObjectNav success distance
MAX_STEPS_PER_EPISODE = 500

# Evaluation
SCANNET_20_CATEGORIES = [
    "wall", "floor", "cabinet", "bed", "chair",
    "sofa", "table", "door", "window", "bookshelf",
    "picture", "counter", "desk", "curtain", "refrigerator",
    "shower curtain", "toilet", "sink", "bathtub", "otherfurniture",
]

# Paths
DATA_DIR = "data"
OUTPUT_DIR = "outputs"
CHECKPOINT_DIR = "outputs/checkpoints"
LOG_DIR = "outputs/logs"
VIZ_DIR = "outputs/visualizations"
