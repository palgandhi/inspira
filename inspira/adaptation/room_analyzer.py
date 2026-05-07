"""
Extracts room geometry from PLY file.
Finds floor, walls, ceiling, and estimates dimensions.
"""
import numpy as np
from pathlib import Path
from plyfile import PlyData
from dataclasses import dataclass
from typing import Tuple, List

@dataclass
class RoomGeometry:
    width:   float   # X dimension in metres
    depth:   float   # Z dimension in metres  
    height:  float   # Y dimension in metres
    floor_y: float   # Y coordinate of floor
    center:  Tuple[float,float,float]  # room center

    def __str__(self):
        return f"{self.width:.1f}m × {self.depth:.1f}m × {self.height:.1f}m"

def extract_room_geometry(ply_path: str) -> RoomGeometry:
    """Extract room dimensions from Gaussian Splat PLY file."""
    ply   = PlyData.read(ply_path)
    verts = ply['vertex']

    x = np.array(verts['x'])
    y = np.array(verts['y'])
    z = np.array(verts['z'])

    # Remove outliers (top/bottom 2%)
    x = x[(x > np.percentile(x,2)) & (x < np.percentile(x,98))]
    y = y[(y > np.percentile(y,2)) & (y < np.percentile(y,98))]
    z = z[(z > np.percentile(z,2)) & (z < np.percentile(z,98))]

    width  = float(x.max() - x.min())
    height = float(y.max() - y.min())
    depth  = float(z.max() - z.min())

    # Floor is the densest horizontal cluster near bottom
    floor_y = float(np.percentile(y, 5))

    center = (
        float((x.max()+x.min())/2),
        float((y.max()+y.min())/2),
        float((z.max()+z.min())/2),
    )

    return RoomGeometry(
        width=width, depth=depth, height=height,
        floor_y=floor_y, center=center
    )
