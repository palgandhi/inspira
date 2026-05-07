"""
Inspira Backend — FastAPI Application Entry Point
=================================================
Starts the three services and registers all routes.
"""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.jobs import job_manager
from api.routes import inspiration, reconstruction, results

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("inspira.api")

app = FastAPI(
    title="Inspira API",
    description="AI-powered 3D interior design reconstruction backend",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (serves .ply files directly to Three.js) ────────────────────
PLY_DIR = Path("frontend/public/outputs/reconstructions")
PLY_DIR.mkdir(parents=True, exist_ok=True)
app.mount(
    "/outputs",
    StaticFiles(directory="frontend/public/outputs"),
    name="outputs",
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(inspiration.router)
app.include_router(reconstruction.router)
app.include_router(results.router)


# ── Startup / Shutdown ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("Inspira API starting up…")
    # Ensure data directories exist
    for d in ["data/jobs", "data/inspiration", "frontend/public/outputs/reconstructions"]:
        Path(d).mkdir(parents=True, exist_ok=True)
    # Start The Conductor — single worker loop
    asyncio.create_task(job_manager.worker())
    logger.info("Job Manager (The Conductor) worker started")


@app.on_event("shutdown")
async def shutdown():
    logger.info("Inspira API shutting down…")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status":      "ok",
        "gpu_busy":    job_manager.is_busy(),
        "queue_depth": job_manager.queue_size(),
        "active_jobs": len(job_manager.all_jobs()),
    }
