"""
Places furniture in the room based on:
- Room geometry (dimensions, floor position)
- Detected furniture from inspiration image
- Interior design placement rules
"""
from dataclasses import dataclass
from typing import List, Tuple, Dict
from .room_analyzer import RoomGeometry

@dataclass
class FurniturePlacement:
    name:        str
    position:    Tuple[float,float,float]  # x,y,z in room space
    size:        Tuple[float,float,float]  # width,height,depth
    rotation:    float = 0.0               # Y rotation in degrees
    wall:        str   = "none"            # which wall it's against
    note:        str   = ""

# Standard furniture dimensions (metres)
FURNITURE_SIZES = {
    "sofa":         (2.2, 0.85, 0.90),
    "couch":        (2.2, 0.85, 0.90),
    "chair":        (0.80, 0.90, 0.80),
    "armchair":     (0.90, 0.90, 0.85),
    "coffee table": (1.20, 0.45, 0.60),
    "side table":   (0.50, 0.55, 0.50),
    "dining table": (1.60, 0.75, 0.90),
    "desk":         (1.40, 0.75, 0.70),
    "bed":          (1.60, 0.55, 2.00),
    "wardrobe":     (1.80, 2.10, 0.60),
    "bookshelf":    (0.80, 1.80, 0.30),
    "tv stand":     (1.50, 0.50, 0.45),
    "floor lamp":   (0.30, 1.60, 0.30),
    "plant":        (0.40, 1.00, 0.40),
    "dresser":      (1.00, 0.80, 0.50),
}

def get_furniture_size(name: str) -> Tuple[float,float,float]:
    name_lower = name.lower()
    for key, size in FURNITURE_SIZES.items():
        if key in name_lower or name_lower in key:
            return size
    return (1.0, 1.0, 1.0)  # default

def place_furniture(
    furniture_list: List[str],
    room: RoomGeometry,
    room_type: str = "living room"
) -> List[FurniturePlacement]:
    """
    Apply placement rules based on room type and furniture.
    Returns list of placements with 3D positions.
    """
    placements = []
    W, H, D = room.width, room.height, room.depth
    cy = room.floor_y
    cx, _, cz = room.center

    # Placement rules per furniture type
    rules = {
        "sofa":         {"wall":"back",   "offset":0.5,  "note":"Against main wall, facing room"},
        "couch":        {"wall":"back",   "offset":0.5,  "note":"Against main wall"},
        "coffee table": {"wall":"center", "offset":0.0,  "note":"Center of room, in front of sofa"},
        "chair":        {"wall":"side",   "offset":0.3,  "note":"Beside sofa or across from it"},
        "armchair":     {"wall":"side",   "offset":0.3,  "note":"Corner placement"},
        "floor lamp":   {"wall":"corner", "offset":0.2,  "note":"Corner near sofa"},
        "plant":        {"wall":"corner", "offset":0.2,  "note":"Corner near window"},
        "tv stand":     {"wall":"front",  "offset":0.3,  "note":"Facing sofa on opposite wall"},
        "wardrobe":     {"wall":"side",   "offset":0.2,  "note":"Against side wall"},
        "bed":          {"wall":"back",   "offset":0.4,  "note":"Centered on main wall"},
        "desk":         {"wall":"window", "offset":0.3,  "note":"Near window for natural light"},
        "bookshelf":    {"wall":"side",   "offset":0.15, "note":"Against side wall"},
        "dining table": {"wall":"center", "offset":0.0,  "note":"Center of dining area"},
        "dresser":      {"wall":"side",   "offset":0.2,  "note":"Against side wall"},
    }

    for item in furniture_list:
        name  = item.strip()
        size  = get_furniture_size(name)
        key   = next((k for k in rules if k in name.lower()), None)
        rule  = rules.get(key, {"wall":"side","offset":0.3,"note":"Side wall placement"})

        # Compute position based on wall rule
        wall  = rule["wall"]
        off   = rule["offset"]
        fw,fh,fd = size

        if wall == "back":
            pos = (cx, cy + fh/2, cz - D/2 + fd/2 + off)
        elif wall == "front":
            pos = (cx, cy + fh/2, cz + D/2 - fd/2 - off)
        elif wall == "side":
            pos = (cx - W/2 + fw/2 + off, cy + fh/2, cz)
        elif wall == "corner":
            pos = (cx - W/2 + fw/2 + off, cy + fh/2, cz - D/2 + fd/2 + off)
        elif wall == "window":
            pos = (cx + W/2 - fw/2 - off, cy + fh/2, cz - D/2 + fd/2 + off)
        else:  # center
            pos = (cx, cy + fh/2, cz)

        placements.append(FurniturePlacement(
            name=name,
            position=pos,
            size=size,
            wall=wall,
            note=rule["note"],
        ))

    return placements
