from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class JobStatus(str, Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    COMPLETE   = "complete"
    FAILED     = "failed"

class JobStage(str, Enum):
    UPLOADING     = "uploading"
    ANALYZING     = "analyzing"
    COLMAP        = "colmap"
    TRAINING      = "training"
    EXPORTING     = "exporting"
    DONE          = "done"

class Job(BaseModel):
    job_id:   str
    status:   JobStatus = JobStatus.PENDING
    stage:    JobStage  = JobStage.UPLOADING
    progress: int       = 0          # 0-100
    message:  str       = ""
    error:    Optional[str] = None

class AnalysisResult(BaseModel):
    job_id:    str
    style:     str
    furniture: List[str]
    palette:   List[str]
    room_dims: Optional[str] = None
    gaussians: Optional[int] = None
    coverage:  Optional[str] = None

class UploadResponse(BaseModel):
    job_id:      str
    photo_count: int
    message:     str
