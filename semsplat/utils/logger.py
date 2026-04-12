"""
SemSplat-Nav — Centralized Logger
All modules use this. Never use print() in production code.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime


def get_logger(name: str, log_to_file: bool = False) -> logging.Logger:
    """
    Returns a configured logger for any module.

    Usage:
        from semsplat.utils.logger import get_logger
        log = get_logger(__name__)
        log.info("Module initialized")
    """
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger  # Already configured

    logger.setLevel(logging.DEBUG)

    # Console handler — INFO and above
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    fmt = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(name)s — %(message)s",
        datefmt="%H:%M:%S"
    )
    console.setFormatter(fmt)
    logger.addHandler(console)

    # File handler — DEBUG and above (optional)
    if log_to_file:
        log_dir = Path("outputs/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        fh = logging.FileHandler(log_dir / f"{name}_{timestamp}.log")
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(fmt)
        logger.addHandler(fh)

    return logger
