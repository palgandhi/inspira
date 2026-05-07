"""
Inspira Backend — Service 3: Job Manager (The Conductor)
=========================================================
A single asyncio.Queue ensures only ONE training job runs at a time.
On M1 8GB, parallel Gaussian Splat training will crash the system.

Rules:
  - One active job at a time.
  - New submissions while a job is running → 429 Too Many Requests.
  - Completed jobs persist in memory for the session (result polling).
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from api.models import JobStatus

logger = logging.getLogger(__name__)
STATE_FILE = Path("data/jobs.json")


class JobRecord:
    """Mutable record tracking a single pipeline job."""

    def __init__(self, job_id: str):
        self.job_id    = job_id
        self.status    = JobStatus.QUEUED
        self.stage     = 0      # 0 = not started, 1–5 = pipeline stage
        self.progress  = 0      # 0–100 within current stage
        self.message   = "Job queued"
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str]             = None
        self.created_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id":     self.job_id,
            "status":     self.status.value,
            "stage":      self.stage,
            "progress":   self.progress,
            "message":    self.message,
            "result":     self.result,
            "error":      self.error,
            "created_at": self.created_at,
        }


class JobManager:
    """
    The Conductor — serialises all reconstruction jobs onto a single
    asyncio.Queue so the M1 GPU is never double-booked.
    """

    def __init__(self):
        self._queue:  asyncio.Queue         = asyncio.Queue()
        self._jobs:   Dict[str, JobRecord]  = {}
        self._lock:   asyncio.Lock          = asyncio.Lock()
        self._active: Optional[str]         = None   # currently running job_id
        self._load_state()

    def _save_state(self):
        try:
            STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
            data = {jid: job.to_dict() for jid, job in self._jobs.items()}
            STATE_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            logger.error("Failed to save job state: %s", e)

    def _load_state(self):
        if not STATE_FILE.exists():
            return
        try:
            data = json.loads(STATE_FILE.read_text())
            for jid, job_data in data.items():
                record = JobRecord(jid)
                record.status = JobStatus(job_data["status"])
                record.stage = job_data["stage"]
                record.progress = job_data["progress"]
                record.message = job_data["message"]
                record.result = job_data.get("result")
                record.error = job_data.get("error")
                record.created_at = job_data["created_at"]
                self._jobs[jid] = record
            logger.info("Loaded %d jobs from state file", len(self._jobs))
        except Exception as e:
            logger.error("Failed to load job state: %s", e)

    # ── Public API ────────────────────────────────────────────────────────

    def is_busy(self) -> bool:
        """Return True if a job is currently being trained."""
        return self._active is not None

    def queue_size(self) -> int:
        return self._queue.qsize()

    def create_job(self) -> JobRecord:
        job_id = str(uuid.uuid4())[:8]
        record = JobRecord(job_id)
        self._jobs[job_id] = record
        self._save_state()
        return record

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        return self._jobs.get(job_id)

    def all_jobs(self) -> list[JobRecord]:
        return list(self._jobs.values())

    async def enqueue(self, job_id: str, coro) -> None:
        """
        Enqueue a coroutine to run as the next (or current) job.
        Caller must check is_busy() and return 429 before calling this.
        """
        record = self._jobs.get(job_id)
        if record:
            record.status  = JobStatus.QUEUED
            record.message = "Job queued"
        await self._queue.put((job_id, coro))

    async def update(
        self,
        job_id:   str,
        stage:    int,
        progress: int,
        message:  str,
        status:   JobStatus = JobStatus.PROCESSING,
    ) -> None:
        record = self._jobs.get(job_id)
        if record:
            record.status   = status
            record.stage    = stage
            record.progress = progress
            record.message  = message
            self._save_state()

    async def complete(self, job_id: str, result: Dict[str, Any]) -> None:
        record = self._jobs.get(job_id)
        if record:
            record.status   = JobStatus.COMPLETE
            record.stage    = 5
            record.progress = 100
            record.message  = "Reconstruction complete"
            record.result   = result
            self._save_state()
        async with self._lock:
            self._active = None

    async def fail(self, job_id: str, error: str) -> None:
        record = self._jobs.get(job_id)
        if record:
            record.status  = JobStatus.FAILED
            record.message = "Job failed"
            record.error   = error
            self._save_state()
        async with self._lock:
            self._active = None

    # ── Worker loop (started at app startup) ────────────────────────────

    async def worker(self) -> None:
        """
        Long-running task: pulls one job at a time from the queue.
        Never runs two training jobs concurrently.
        """
        while True:
            job_id, coro = await self._queue.get()
            async with self._lock:
                self._active = job_id

            record = self._jobs.get(job_id)
            if record:
                record.status  = JobStatus.PROCESSING
                record.message = "Pipeline starting…"

            try:
                await coro
            except Exception as exc:  # pylint: disable=broad-except
                await self.fail(job_id, str(exc))
            finally:
                self._queue.task_done()


# Singleton — imported by routes and services
job_manager = JobManager()
