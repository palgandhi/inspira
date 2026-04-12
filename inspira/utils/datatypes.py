"""
Inspira — Core Dataclasses
Data contracts between all modules.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple
import numpy as np


@dataclass
class InspirationImage:
    """
    A parsed interior design inspiration image.
    Produced by: InspirationAnalyzer
    Consumed by: AdaptationEngine
    """
    image_path:   str
    raw_image:    np.ndarray              # (H, W, 3) uint8

    # Detected furniture items
    furniture:    List[FurnitureItem]     = field(default_factory=list)

    # Room style and palette
    style:        Optional[str]           = None   # e.g. "minimalist"
    palette:      List[Tuple[int,int,int]]= field(default_factory=list)  # RGB colours

    # Spatial understanding
    room_type:    Optional[str]           = None   # e.g. "living room"
    layout_desc:  Optional[str]           = None   # Natural language description

    @property
    def furniture_count(self) -> int:
        return len(self.furniture)

    @property
    def primary_colour(self) -> Optional[Tuple[int,int,int]]:
        return self.palette[0] if self.palette else None


@dataclass
class FurnitureItem:
    """
    A single detected furniture piece from an inspiration image.
    """
    label:        str                     # e.g. "sofa", "coffee table"
    confidence:   float                   # Detection confidence 0-1
    bbox_2d:      np.ndarray             # (4,) [x1, y1, x2, y2] pixels
    mask:         Optional[np.ndarray]   # (H, W) bool segmentation mask
    colour:       Optional[Tuple[int,int,int]] = None  # Dominant colour
    estimated_size_m: Optional[Tuple[float,float]] = None  # (width, depth)


@dataclass
class RoomScan:
    """
    A user's room captured as multiple photos.
    Produced by: user upload
    Consumed by: RoomReconstructor
    """
    room_id:      str
    image_paths:  List[str]              # Paths to uploaded photos
    room_type:    Optional[str]   = None  # e.g. "living room"

    # Filled after reconstruction
    dimensions_m: Optional[Tuple[float,float,float]] = None  # W, H, D
    gaussian_scene_path: Optional[str] = None  # Path to .splat file
    surface_labels: Optional[Dict]     = None  # floor/wall/window/door locations

    @property
    def photo_count(self) -> int:
        return len(self.image_paths)

    @property
    def is_reconstructed(self) -> bool:
        return self.gaussian_scene_path is not None


@dataclass
class AdaptedLayout:
    """
    The inspiration design adapted to fit the user's actual room.
    Produced by: AdaptationEngine
    Consumed by: frontend viewer
    """
    room_scan:          RoomScan
    inspiration:        InspirationImage

    # Adapted furniture placements
    placements:         List[FurniturePlacement] = field(default_factory=list)

    # AI validation results
    warnings:           List[str]  = field(default_factory=list)   # e.g. "blocks window"
    suggestions:        List[str]  = field(default_factory=list)   # e.g. "rotate 90°"

    # Style match score
    style_match_score:  float      = 0.0    # 0-1, how close to inspiration

    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0


@dataclass
class FurniturePlacement:
    """
    A single piece of furniture placed in the 3D room.
    """
    furniture_item:   FurnitureItem
    position_3d:      np.ndarray         # (3,) world coordinates
    rotation_deg:     float              # Y-axis rotation in degrees
    scale:            float = 1.0        # Scale factor
    is_valid:         bool  = True       # Passes collision/clearance checks
    validation_note:  str   = ""         # Why invalid if is_valid=False
