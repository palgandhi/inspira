"""
Inspira Backend — Pydantic Models
Request/response contracts for all API endpoints.
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


# ── Job Status ──────────────────────────────────────────────────────────────

class JobStatus(str, Enum):
    QUEUED     = "queued"
    PROCESSING = "processing"
    COMPLETE   = "complete"
    FAILED     = "failed"


# ── Request Models ───────────────────────────────────────────────────────────

class ReconstructRequest(BaseModel):
    job_id: str
    style_prompt: Optional[str] = None   # e.g. "Scandinavian minimalist"
    global_lighting: str = "cinematic lighting, soft shadows"


# ── Response Models ──────────────────────────────────────────────────────────

class AnalyzeInspirationResponse(BaseModel):
    job_id: str
    style: str
    furniture: List[str]
    palette: List[str]


class UploadPhotosResponse(BaseModel):
    job_id: str
    photo_count: int


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    stage: int       # 1–5
    progress: int    # 0–100
    message: str = ""
    error: Optional[str] = None


class ResultResponse(BaseModel):
    job_id: str
    style: str
    furniture: List[str]
    palette: List[str]
    confidence: float
    model_url: str   # relative path served from /static/


class HistoryItem(BaseModel):
    job_id: str
    date: str
    style: str
    status: JobStatus
    thumbnail: Optional[str] = None
