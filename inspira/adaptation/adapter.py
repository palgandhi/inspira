"""
Main AdaptationEngine — orchestrates room analysis + furniture placement.
"""
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field
from typing import List

from .room_analyzer import extract_room_geometry, RoomGeometry
from .furniture_placer import place_furniture, FurniturePlacement

@dataclass
class AdaptedLayout:
    room:       RoomGeometry
    placements: List[FurniturePlacement]
    style:      str
    palette:    List[str]
    furniture:  List[str]
    confidence: float = 0.0

    def to_dict(self) -> dict:
        return {
            "room_dimensions": str(self.room),
            "room_width":  round(self.room.width, 2),
            "room_depth":  round(self.room.depth, 2),
            "room_height": round(self.room.height, 2),
            "style":       self.style,
            "palette":     self.palette,
            "furniture":   self.furniture,
            "confidence":  self.confidence,
            "placements": [
                {
                    "name":     p.name,
                    "position": list(p.position),
                    "size":     list(p.size),
                    "rotation": p.rotation,
                    "wall":     p.wall,
                    "note":     p.note,
                }
                for p in self.placements
            ],
        }

class AdaptationEngine:
    def adapt(
        self,
        ply_path: str,
        style: str,
        furniture_list: List[str],
        palette: List[str],
        room_type: str = "living room",
        confidence: float = 0.87,
    ) -> AdaptedLayout:
        """
        Main entry point.
        Takes PLY file + inspiration analysis → returns adapted layout.
        """
        # Extract room geometry from point cloud
        room = extract_room_geometry(ply_path)
        print(f"Room geometry: {room}")

        # Place furniture
        placements = place_furniture(furniture_list, room, room_type)
        print(f"Placed {len(placements)} furniture items")

        return AdaptedLayout(
            room=room,
            placements=placements,
            style=style,
            palette=palette,
            furniture=furniture_list,
            confidence=confidence,
        )
