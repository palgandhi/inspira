"""
Inspira API — Route: /api/analyze-inspiration
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from api.models import AnalyzeInspirationResponse

router = APIRouter()
UPLOADS = Path("data/inspiration")


@router.post("/api/analyze-inspiration", response_model=AnalyzeInspirationResponse)
async def analyze_inspiration(image: UploadFile = File(...), job_id: str = None):
    from api.jobs import job_manager
    
    # Use provided job_id or create a new one (and register it!)
    if not job_id:
        record = job_manager.create_job()
        job_id = record.job_id
    else:
        # Ensure job exists in manager
        if not job_manager.get_job(job_id):
            record = job_manager.create_job()
            job_id = record.job_id

    UPLOADS.mkdir(parents=True, exist_ok=True)
    # Save with job_id prefix so reconstruction.py can find it
    img_path = UPLOADS / f"{job_id}_{image.filename}"
    img_path.write_bytes(await image.read())

    # Run Module 1 — InspirationAnalyzer
    try:
        from inspira.understanding.inspiration_analyzer import InspirationAnalyzer
        analyzer = InspirationAnalyzer()
        result   = analyzer.analyze(str(img_path))
        return AnalyzeInspirationResponse(
            job_id=job_id,
            style=result.style or "Modern",
            furniture=[item.label for item in (result.furniture or [])],
            palette=[f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}" for c in (result.palette or [])],
        )
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(
            status_code=500,
            detail=f"Inspiration analysis failed: {str(exc)}"
        )
