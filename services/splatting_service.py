"""
Inspira Backend — Service 2: SplattingService (The Sculptor)
=============================================================
Orchestrates the full 3D Gaussian Splat reconstruction pipeline:
  1. COLMAP Structure-from-Motion  (exhaustive if <20 photos, sequential otherwise)
  2. Nerfstudio ns-process-data    (maps COLMAP output to nerfstudio format)
  3. Nerfstudio splatfacto         (7,000 iterations — M1 sweet spot)
  4. ns-export gaussian-splat      (generates .ply)
  5. Open3D outlier removal        (nb_neighbors=20, std_ratio=2.0)
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger(__name__)

# M1 / MPS environment flags — set before any torch/nerfstudio subprocess
MPS_ENV = {
    **os.environ,
    "PYTORCH_ENABLE_MPS_FALLBACK": "1",   # fallback unsupported ops to CPU
    "TORCH_COMPILE_DISABLE":       "1",   # avoids inductor SM error on MPS
    "TORCHINDUCTOR_DISABLE":       "1",   # belt-and-suspenders
    "QT_QPA_PLATFORM":             "offscreen",  # headless display
}

# Splatfacto iteration count — 7k = quality/speed sweet spot on M1
SPLATFACTO_ITERATIONS = 7_000


class SplattingService:
    """
    The Sculptor — decoupled 3D reconstruction service.

    Completely independent of StylingService; accepts any directory of
    images (original or styled) and returns a path to a filtered .ply file.
    """

    def __init__(
        self,
        project_root: Path,
        progress_cb:  Optional[Callable[[int, int, str], None]] = None,
    ):
        """
        Args:
            project_root: root of the inspira project (all paths relative here).
            progress_cb:  optional callback(stage, progress, message) for live
                          updates to the Job Manager.
        """
        self.root        = project_root
        self.progress_cb = progress_cb or (lambda s, p, m: None)

    # ── Helpers ───────────────────────────────────────────────────────────

    def _report(self, stage: int, progress: int, message: str) -> None:
        logger.info("[Stage %d | %3d%%] %s", stage, progress, message)
        self.progress_cb(stage, progress, message)

    def _run(self, cmd: list[str], stage: int, desc: str) -> None:
        """Run a subprocess with MPS env vars; stream stdout to logger."""
        logger.info("Running: %s", " ".join(cmd))
        proc = subprocess.Popen(
            cmd,
            env=MPS_ENV,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        for line in proc.stdout:
            line = line.rstrip()
            if line:
                logger.debug("[%s] %s", desc, line)
        proc.wait()
        if proc.returncode != 0:
            raise RuntimeError(f"{desc} exited with code {proc.returncode}")

    # ── Stage 1: COLMAP SfM ───────────────────────────────────────────────

    def _run_colmap(self, image_dir: Path, colmap_dir: Path, photo_count: int) -> None:
        """
        Run COLMAP feature extraction + matching + mapping.

        Matcher choice (per spec):
          < 20 photos → exhaustive_matcher  (checks every pair, maximises accuracy)
          ≥ 20 photos → sequential_matcher  (assumes temporal ordering, much faster)
        """
        colmap_dir.mkdir(parents=True, exist_ok=True)
        db_path = colmap_dir / "database.db"

        matcher = "exhaustive_matcher" if photo_count < 20 else "sequential_matcher"
        logger.info("COLMAP: %d photos → using %s", photo_count, matcher)

        self._report(1, 10, "Extracting image features (COLMAP)…")
        self._run([
            "colmap", "feature_extractor",
            "--database_path", str(db_path),
            "--image_path",    str(image_dir),
            "--ImageReader.camera_model", "SIMPLE_RADIAL",
            "--ImageReader.single_camera", "1",
            "--SiftExtraction.use_gpu", "0",   # M1 has no CUDA
        ], stage=1, desc="colmap feature_extractor")

        self._report(1, 30, f"Matching features ({matcher})…")
        self._run([
            "colmap", matcher,
            "--database_path", str(db_path),
        ], stage=1, desc=f"colmap {matcher}")

        self._report(1, 60, "Mapping scene (sparse reconstruction)…")
        sparse_dir = colmap_dir / "sparse"
        sparse_dir.mkdir(exist_ok=True)
        self._run([
            "colmap", "mapper",
            "--database_path",   str(db_path),
            "--image_path",      str(image_dir),
            "--output_path",     str(sparse_dir),
        ], stage=1, desc="colmap mapper")

    # ── Stage 2: ns-process-data ───────────────────────────────────────────

    def _ns_process(self, image_dir: Path, processed_dir: Path) -> None:
        self._report(2, 10, "Processing images for Nerfstudio…")
        self._run([
            "ns-process-data", "images",
            "--data",       str(image_dir),
            "--output-dir", str(processed_dir),
        ], stage=2, desc="ns-process-data")

    # ── Stage 3: splatfacto training ──────────────────────────────────────

    def _ns_train(self, processed_dir: Path, train_out: Path) -> Path:
        self._report(3, 5, f"Training splatfacto ({SPLATFACTO_ITERATIONS} iterations)…")
        self._run([
            "ns-train", "splatfacto",
            "--data",                         str(processed_dir),
            "--output-dir",                   str(train_out),
            "--vis",                          "wandb",         # prevents viser hang
            "--viewer.quit-on-train-completion", "True",
            "--max-num-iterations",           str(SPLATFACTO_ITERATIONS),
            "--steps-per-save",               "1000",
            "--pipeline.model.sh-degree",     "0",
            "--pipeline.model.use-scale-regularization", "True",
        ], stage=3, desc="ns-train")

        # Find the latest config in the output dir
        configs = sorted(train_out.rglob("config.yml"))
        if not configs:
            raise RuntimeError("No config.yml found after splatfacto training")
        return configs[-1]

    # ── Stage 4: ns-export ────────────────────────────────────────────────

    def _ns_export(self, config_path: Path, export_dir: Path) -> Path:
        self._report(4, 10, "Exporting Gaussian Splat (.ply)…")
        export_dir.mkdir(parents=True, exist_ok=True)
        self._run([
            "ns-export", "gaussian-splat",
            "--load-config", str(config_path),
            "--output-dir",  str(export_dir),
        ], stage=4, desc="ns-export")

        plys = list(export_dir.glob("*.ply"))
        if not plys:
            raise RuntimeError("No .ply file found after ns-export")
        return plys[0]

    # ── Stage 5: Open3D outlier filter ────────────────────────────────────

    def outlier_filter(self, ply_path: Path, output_path: Path) -> Path:
        """
        Remove 'floater' artifacts using Open3D statistical outlier removal.

        Parameters (per spec):
            nb_neighbors = 20   — neighbourhood size for mean distance calculation
            std_ratio    = 2.0  — points beyond 2 std deviations are removed

        This is the step that makes AI 3D look clean rather than messy.
        """
        import open3d as o3d  # lazy import — heavy library

        self._report(5, 20, "Filtering outliers (Open3D)…")
        logger.info("Loading PLY: %s", ply_path)

        pcd = o3d.io.read_point_cloud(str(ply_path))
        before = len(pcd.points)
        logger.info("Point count before filter: %d", before)

        _, inlier_idx = pcd.remove_statistical_outlier(
            nb_neighbors=20,
            std_ratio=2.0,
        )
        pcd_clean = pcd.select_by_index(inlier_idx)
        after = len(pcd_clean.points)
        logger.info(
            "Outlier removal: %d → %d points (removed %d floaters)",
            before, after, before - after,
        )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        o3d.io.write_point_cloud(str(output_path), pcd_clean)
        self._report(5, 80, f"Filtered PLY saved ({after:,} points)")
        return output_path

    # ── Main entry point ──────────────────────────────────────────────────

    def run(
        self,
        job_id:     str,
        image_dir:  Path,
        output_ply: Path,
    ) -> Path:
        """
        Run the full sculpture pipeline.

        Args:
            job_id:     Unique job identifier (used for directory namespacing).
            image_dir:  Directory of input images (original or styled).
            output_ply: Final destination for the filtered .ply file.

        Returns:
            Path to the final, filtered .ply file.
        """
        work_dir = self.root / "data" / "jobs" / job_id

        photo_count = len(list(image_dir.glob("*.jpg")) + list(image_dir.glob("*.JPG")) +
                         list(image_dir.glob("*.png")) + list(image_dir.glob("*.PNG")))

        # Stage 1 — COLMAP
        colmap_dir = work_dir / "colmap"
        self._run_colmap(image_dir, colmap_dir, photo_count)
        self._report(1, 100, "COLMAP mapping complete")

        # Stage 2 — ns-process-data
        processed_dir = work_dir / "processed"
        self._ns_process(image_dir, processed_dir)
        self._report(2, 100, "Data processing complete")

        # Stage 3 — splatfacto training
        train_out  = work_dir / "trained"
        config_path = self._ns_train(processed_dir, train_out)
        self._report(3, 100, "Training complete")

        # Stage 4 — export
        export_dir = work_dir / "exported"
        raw_ply    = self._ns_export(config_path, export_dir)
        self._report(4, 100, "Export complete")

        # Stage 5 — outlier filter
        filtered_ply = self.outlier_filter(raw_ply, output_ply)
        self._report(5, 100, "Reconstruction complete")

        return filtered_ply
