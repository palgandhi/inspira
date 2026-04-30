"""
In-memory job store + background task runner.
Each job runs: COLMAP → gsplat training → PLY export → Module 1 analysis
"""
import asyncio, uuid, subprocess, shutil, json, time
from pathlib import Path
from typing import Dict, Optional
from .models import Job, JobStatus, JobStage

# ── Paths ────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent.parent.parent
JOBS_DIR     = BASE_DIR / "outputs" / "jobs"
COLMAP_BIN   = shutil.which("colmap") or "colmap"
JOBS_DIR.mkdir(parents=True, exist_ok=True)

# ── In-memory store ──────────────────────────────────────────────────
_jobs: Dict[str, Job] = {}

def create_job() -> str:
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = Job(job_id=job_id)
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / "images").mkdir(exist_ok=True)
    return job_id

def get_job(job_id: str) -> Optional[Job]:
    return _jobs.get(job_id)

def update_job(job_id: str, **kwargs):
    if job_id in _jobs:
        job = _jobs[job_id]
        for k, v in kwargs.items():
            setattr(job, k, v)

def job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id

# ── Background pipeline ──────────────────────────────────────────────
async def run_pipeline(job_id: str):
    """Full reconstruction pipeline — runs in background."""
    jdir = job_dir(job_id)
    img_dir = jdir / "images"

    try:
        # ── Stage 1: COLMAP ──────────────────────────────────────
        update_job(job_id,
            status=JobStatus.PROCESSING,
            stage=JobStage.COLMAP,
            progress=10,
            message="Estimating camera poses with COLMAP..."
        )

        sparse_dir = jdir / "sparse" / "0"
        sparse_dir.mkdir(parents=True, exist_ok=True)
        db_path = jdir / "colmap.db"

        # Feature extraction
        await _run(job_id, [
            COLMAP_BIN, "feature_extractor",
            "--database_path", str(db_path),
            "--image_path",    str(img_dir),
            "--ImageReader.camera_model",  "OPENCV",
            "--ImageReader.single_camera", "1",
            "--SiftExtraction.use_gpu",    "0",
        ], progress=20, message="Extracting image features...")

        # Matching
        await _run(job_id, [
            COLMAP_BIN, "exhaustive_matcher",
            "--database_path",       str(db_path),
            "--SiftMatching.use_gpu", "0",
        ], progress=30, message="Matching features across images...")

        # Sparse reconstruction
        await _run(job_id, [
            COLMAP_BIN, "mapper",
            "--database_path", str(db_path),
            "--image_path",    str(img_dir),
            "--output_path",   str(jdir / "sparse"),
        ], progress=40, message="Reconstructing camera positions...")

        # Convert to text
        await _run(job_id, [
            COLMAP_BIN, "model_converter",
            "--input_path",  str(sparse_dir),
            "--output_path", str(sparse_dir),
            "--output_type", "TXT",
        ], progress=45, message="Finalizing sparse model...")

        # Check COLMAP succeeded
        if not (sparse_dir / "points3D.txt").exists():
            raise RuntimeError("COLMAP failed — not enough matching features. Try more overlapping photos.")

        # ── Stage 2: 3DGS Training ───────────────────────────────
        update_job(job_id,
            stage=JobStage.TRAINING,
            progress=50,
            message="Training 3D Gaussian Splatting model..."
        )

        train_script = BASE_DIR / "inspira" / "reconstruction" / "train.py"
        ply_output   = jdir / "room.ply"

        proc = await asyncio.create_subprocess_exec(
            "python3", str(train_script),
            "--sparse_dir", str(sparse_dir),
            "--image_dir",  str(img_dir),
            "--output",     str(ply_output),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        # Stream progress from training script
        async for line in proc.stdout:
            text = line.decode().strip()
            if "Step" in text and "PSNR" in text:
                # Parse step progress
                try:
                    step = int(text.split("Step")[1].split("|")[0].strip())
                    pct  = 50 + int((step / 30000) * 35)
                    update_job(job_id, progress=pct, message=f"Training... {text}")
                except:
                    pass

        await proc.wait()
        if proc.returncode != 0:
            raise RuntimeError("3DGS training failed")

        # ── Stage 3: Verify export ───────────────────────────────
        update_job(job_id,
            stage=JobStage.EXPORTING,
            progress=88,
            message="Exporting point cloud..."
        )

        if not ply_output.exists():
            raise RuntimeError("PLY export failed")

        ply_size = ply_output.stat().st_size / 1e6
        update_job(job_id, progress=92,
            message=f"Exported {ply_size:.1f}MB point cloud")

        # ── Stage 4: Analysis ────────────────────────────────────
        update_job(job_id,
            stage=JobStage.DONE,
            progress=100,
            status=JobStatus.COMPLETE,
            message="Reconstruction complete"
        )

        # Save result metadata
        result = {
            "job_id":    job_id,
            "ply_path":  str(ply_output),
            "gaussians": _count_gaussians(ply_output),
            "style":     "Pending analysis",
            "furniture": [],
            "palette":   [],
        }
        (jdir / "result.json").write_text(json.dumps(result))

    except Exception as e:
        update_job(job_id,
            status=JobStatus.FAILED,
            message=str(e),
            error=str(e)
        )
        print(f"[Job {job_id}] Failed: {e}")

async def _run(job_id: str, cmd: list, progress: int, message: str):
    update_job(job_id, progress=progress, message=message)
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    await proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd[:2])}")

def _count_gaussians(ply_path: Path) -> int:
    try:
        with open(ply_path, 'rb') as f:
            for line in f:
                line = line.decode('ascii', errors='ignore').strip()
                if line.startswith('element vertex'):
                    return int(line.split()[-1])
    except:
        pass
    return 0
