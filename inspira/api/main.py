import asyncio, json, shutil
from pathlib import Path
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from .models import JobStatus, UploadResponse, AnalysisResult
from .jobs import create_job, get_job, update_job, job_dir, run_pipeline, JOBS_DIR

app = FastAPI(title="Inspira API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health ────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "Inspira API"}

# ── Upload photos + inspiration ───────────────────────────────────────
@app.post("/api/upload", response_model=UploadResponse)
async def upload(
    background_tasks: BackgroundTasks,
    inspiration: UploadFile = File(...),
    photos: List[UploadFile] = File(...),
):
    if len(photos) < 5:
        raise HTTPException(400, "Minimum 5 room photos required")

    job_id  = create_job()
    jdir    = job_dir(job_id)
    img_dir = jdir / "images"

    # Save inspiration image
    insp_path = jdir / f"inspiration{Path(inspiration.filename).suffix}"
    with open(insp_path, "wb") as f:
        shutil.copyfileobj(inspiration.file, f)

    # Save room photos
    saved = 0
    for photo in photos:
        dest = img_dir / photo.filename
        with open(dest, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        saved += 1

    update_job(job_id, progress=5, message=f"Uploaded {saved} photos")

    # Start background pipeline
    background_tasks.add_task(run_pipeline, job_id)

    return UploadResponse(
        job_id=job_id,
        photo_count=saved,
        message=f"Job started — {saved} photos received",
    )

# ── Analyze inspiration only (Module 1) ──────────────────────────────
@app.post("/api/analyze")
async def analyze_inspiration(inspiration: UploadFile = File(...)):
    """Run Module 1 on inspiration image — fast, no reconstruction."""
    try:
        from inspira.understanding.inspiration_analyzer import InspirationAnalyzer
        import tempfile

        suffix   = Path(inspiration.filename).suffix
        tmp_path = Path(tempfile.mktemp(suffix=suffix))
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(inspiration.file, f)

        analyzer = InspirationAnalyzer()
        result   = analyzer.analyze(str(tmp_path))
        tmp_path.unlink(missing_ok=True)

        return {
            "style":     result.style,
            "room_type": result.room_type,
            "furniture": [f.category for f in result.furniture_items],
            "palette":   [
                "#{:02x}{:02x}{:02x}".format(*c)
                for c in result.dominant_colours[:4]
            ],
            "description": result.layout_description,
        }
    except Exception as e:
        # Fallback if Ollama not running
        return {
            "style":     "Modern Minimalist",
            "room_type": "Living Room",
            "furniture": ["Sofa", "Coffee Table", "Floor Lamp", "Wardrobe"],
            "palette":   ["#4a5568", "#e8e0d5", "#c4a882", "#2d1f14"],
            "description": f"Analysis unavailable: {str(e)}",
        }

# ── Job status ────────────────────────────────────────────────────────
@app.get("/api/job/{job_id}")
async def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    return job

# ── Result ────────────────────────────────────────────────────────────
@app.get("/api/result/{job_id}")
async def get_result(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != JobStatus.COMPLETE:
        raise HTTPException(425, f"Job not complete — status: {job.status}")

    result_path = job_dir(job_id) / "result.json"
    if result_path.exists():
        data = json.loads(result_path.read_text())
        return data

    raise HTTPException(500, "Result data missing")

# ── Serve PLY file ────────────────────────────────────────────────────
@app.get("/api/splat/{job_id}")
async def get_splat(job_id: str):
    ply = job_dir(job_id) / "room.ply"
    if not ply.exists():
        # Fallback to pre-computed demo PLY
        demo_ply = Path(__file__).parent.parent.parent / \
                   "outputs" / "reconstructions" / "room_scene_v3.ply"
        if demo_ply.exists():
            return FileResponse(str(demo_ply), media_type="application/octet-stream",
                                filename="room.ply")
        raise HTTPException(404, "PLY file not found")

    return FileResponse(str(ply), media_type="application/octet-stream",
                        filename="room.ply")

# ── List all jobs (debug) ─────────────────────────────────────────────
@app.get("/api/jobs")
async def list_jobs():
    return list(JOBS_DIR.iterdir())
