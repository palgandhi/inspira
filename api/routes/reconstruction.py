"""
Inspira API — Route: /api/upload-room-photos, /api/reconstruct, /api/job/{id}
"""
import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi import status as http_status
from typing import List, Optional

from api.jobs import job_manager
from api.models import JobStatus, JobStatusResponse, ReconstructRequest, UploadPhotosResponse

log = logging.getLogger(__name__)

router   = APIRouter()
DATA_DIR = Path("data/jobs")
PLY_DIR  = Path("frontend/public/outputs/reconstructions")


@router.post("/api/upload-room-photos", response_model=UploadPhotosResponse)
async def upload_room_photos(
    photos: List[UploadFile] = File(...),
    job_id: Optional[str] = Query(None, description="Reuse an existing job_id instead of creating a new one"),
):
    # Reuse existing job if job_id provided, otherwise create new
    if job_id:
        record = job_manager.get_job(job_id)
        if not record:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found. Create it via /api/analyze-inspiration first.")
    else:
        record = job_manager.create_job()
        job_id = record.job_id

    photo_dir = DATA_DIR / job_id / "photos"
    photo_dir.mkdir(parents=True, exist_ok=True)

    for photo in photos:
        dest = photo_dir / photo.filename
        dest.write_bytes(await photo.read())

    return UploadPhotosResponse(job_id=job_id, photo_count=len(photos))


@router.post("/api/reconstruct", status_code=http_status.HTTP_202_ACCEPTED)
async def reconstruct(req: ReconstructRequest):
    """
    Enqueue a reconstruction job.

    ── Conductor Rule ──────────────────────────────────────────────────────
    Only ONE job may run at a time on M1 8GB. If the GPU is busy, return
    429 Too Many Requests. Parallel splatfacto training WILL crash the IDE.
    """
    if job_manager.is_busy():
        raise HTTPException(
            status_code=http_status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "GPU busy",
                "message": (
                    "A reconstruction job is already running. "
                    "Please wait for it to complete before submitting a new one. "
                    "Parallel training on M1 8GB will exhaust unified memory."
                ),
                "active_queue": job_manager.queue_size(),
            },
        )

    record = job_manager.get_job(req.job_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Job {req.job_id} not found. Upload photos first.")

    # Build the async pipeline coroutine (The Conductor will execute it)
    coro = _run_pipeline(
        job_id        = req.job_id,
        style_prompt  = req.style_prompt or "modern interior design",
        global_lighting = req.global_lighting,
    )
    await job_manager.enqueue(req.job_id, coro)

    return {
        "job_id":  req.job_id,
        "status":  "queued",
        "message": "Job queued. Poll /api/job/{job_id} for progress.",
    }


@router.get("/api/job/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    record = job_manager.get_job(job_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return JobStatusResponse(
        job_id   = record.job_id,
        status   = record.status,
        stage    = record.stage,
        progress = record.progress,
        message  = record.message,
        error    = record.error,
    )


# ── Pipeline Coroutine ───────────────────────────────────────────────────────

async def _run_pipeline(job_id: str, style_prompt: str, global_lighting: str) -> None:
    """
    Full reconstruction pipeline executed by the Job Manager worker.

    Stages:
      1 — COLMAP SfM
      2 — Data processing
      3 — Splatfacto training (7k iterations)
      4 — PLY export
      5 — Outlier filter + copy to frontend
    """
    from services.splatting_service import SplattingService
    from services.styling_service   import StylingService

    project_root = Path(".")
    photo_dir    = DATA_DIR / job_id / "photos"
    styled_dir   = DATA_DIR / job_id / "styled"
    output_ply   = PLY_DIR / f"{job_id}.ply"
    PLY_DIR.mkdir(parents=True, exist_ok=True)

    # Progress callback → feeds the Job Manager for frontend polling
    async def report(stage: int, progress: int, message: str):
        await job_manager.update(job_id, stage, progress, message)

    def sync_report(stage: int, progress: int, message: str):
        asyncio.get_event_loop().call_soon_threadsafe(
            lambda: asyncio.ensure_future(report(stage, progress, message))
        )

    # ── Check for inspiration image ──────────────────────────────────────
    inspiration_candidates = list(Path("data/inspiration").glob(f"{job_id}_*"))
    inspiration_path       = inspiration_candidates[0] if inspiration_candidates else None

    # ── Stage 1–2: Style Transfer ────────────────────────────────────────
    photo_paths = sorted(photo_dir.glob("*.[jJpP][pPnN][gG]*"))
    if inspiration_path and photo_paths:
        try:
            await report(1, 5, "Extracting depth maps…")
            styler = StylingService()

            # Run in thread pool (CPU/GPU bound, not I/O)
            loop = asyncio.get_event_loop()
            styled_paths, _ = await loop.run_in_executor(
                None,
                lambda: styler.run(
                    image_paths      = photo_paths,
                    inspiration_path = inspiration_path,
                    output_dir       = styled_dir,
                    style_prompt     = style_prompt,
                    global_lighting  = global_lighting,
                    progress_callback = sync_report,
                ),
            )
            input_dir = styled_dir
            await report(2, 100, "Style transfer complete")
        except Exception as e:
            log.warning("Style transfer failed, using original photos: %s", e)
            input_dir = photo_dir
            await report(2, 100, "Style transfer skipped — using original photos")
    else:
        # No inspiration image — use original photos
        input_dir = photo_dir
        await report(2, 100, "Using original photos (no inspiration image)")

    # ── Stage 3–5: Splatting ─────────────────────────────────────────────
    sculptor = SplattingService(
        project_root=project_root,
        progress_cb=sync_report,
    )

    loop = asyncio.get_event_loop()
    final_ply = await loop.run_in_executor(
        None,
        lambda: sculptor.run(
            job_id     = job_id,
            image_dir  = input_dir,
            output_ply = output_ply,
        ),
    )

    # ── Complete ─────────────────────────────────────────────────────────
    # Extract real results from inspiration analysis if available
    result_style = style_prompt
    result_furniture = []
    result_palette = []
    result_confidence = 0.85

    if inspiration_path:
        try:
            from inspira.understanding.inspiration_analyzer import InspirationAnalyzer
            analyzer = InspirationAnalyzer()
            analysis = analyzer.analyze(str(inspiration_path))
            result_style = analysis.style or style_prompt
            result_furniture = [item.label for item in analysis.furniture]
            result_palette = [
                f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}" for c in analysis.palette
            ]
            result_confidence = 0.90
            log.info("Inspiration results: style=%s, furniture=%s", result_style, result_furniture)
        except Exception as e:
            log.warning("Could not extract inspiration results: %s", e)

    # Run AdaptationEngine to get layout
    layout_data = {}
    try:
        from inspira.adaptation.adapter import AdaptationEngine
        adapter = AdaptationEngine()
        layout = adapter.adapt(
        ply_path=str(final_ply),
        style=result_style,
        furniture_list=result_furniture,
        palette=result_palette,
        room_type="living room",
        confidence=result_confidence,
        )
        layout_data = layout.to_dict()
        log.info("Adaptation complete: %d placements", len(layout.placements))
    except Exception as e:
        log.warning("AdaptationEngine failed: %s", e)

    await job_manager.complete(job_id, {
        "style":       result_style,
        "furniture":   result_furniture,
        "palette":     result_palette,
        "confidence":   result_confidence,
        "model_url":   f"/outputs/reconstructions/{job_id}.ply",
        "layout":       layout_data,
        })
