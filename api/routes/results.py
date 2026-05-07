"""
Inspira API — Route: /api/result, /api/splat, /api/history
"""
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from api.jobs import job_manager
from api.models import HistoryItem, JobStatus, ResultResponse

router  = APIRouter()
PLY_DIR = Path("frontend/public/outputs/reconstructions")


@router.get("/api/result/{job_id}", response_model=ResultResponse)
async def get_result(job_id: str):
    record = job_manager.get_job(job_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    if record.status != JobStatus.COMPLETE:
        raise HTTPException(status_code=409, detail="Job not yet complete")

    result = record.result or {}
    return ResultResponse(
        job_id=job_id,
        style=result.get("style", "Custom"),
        furniture=result.get("furniture", []),
        palette=result.get("palette", []),
        confidence=result.get("confidence", 0.85),
        model_url=result.get("model_url", f"/outputs/reconstructions/{job_id}.ply"),
    )


@router.get("/api/splat/{job_id}")
async def get_splat(job_id: str):
    record = job_manager.get_job(job_id)
    if not record or record.status != JobStatus.COMPLETE:
        raise HTTPException(status_code=404, detail="Result not available")

    ply_path = PLY_DIR / f"{job_id}.ply"
    if not ply_path.exists():
        raise HTTPException(status_code=404, detail="PLY file not found on disk")

    return FileResponse(str(ply_path), media_type="application/octet-stream")


@router.get("/api/history")
async def get_history():
    jobs = job_manager.all_jobs()
    items = [
        HistoryItem(
            job_id=j.job_id,
            date=j.created_at,
            style=(j.result or {}).get("style", "Unknown"),
            status=j.status,
            thumbnail=None,
        )
        for j in jobs
        if j.status in (JobStatus.COMPLETE, JobStatus.FAILED)
    ]
    return items
