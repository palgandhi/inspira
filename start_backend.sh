#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Inspira Backend Startup Script
# Configures M1/MPS environment and launches the FastAPI server.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Inspira Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Activate venv ─────────────────────────────────────────────────────────────
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    echo "✓ venv activated"
else
    echo "⚠  No .venv found — using system Python"
fi

# ── M1 / MPS environment flags ────────────────────────────────────────────────
# These must be set BEFORE uvicorn imports torch or nerfstudio
export PYTORCH_ENABLE_MPS_FALLBACK=1   # Fall back unsupported ops to CPU
export TORCH_COMPILE_DISABLE=1         # Avoid inductor SM error on MPS
export TORCHINDUCTOR_DISABLE=1         # Belt-and-suspenders
export QT_QPA_PLATFORM=offscreen       # Headless display for COLMAP/nerfstudio

echo "✓ MPS environment flags set"
echo "  PYTORCH_ENABLE_MPS_FALLBACK = 1"
echo "  TORCH_COMPILE_DISABLE       = 1"

# ── Verify COLMAP is available ────────────────────────────────────────────────
if command -v colmap &> /dev/null; then
    COLMAP_VER=$(colmap -h 2>&1 | head -1 || true)
    echo "✓ COLMAP found"
else
    echo "⚠  COLMAP not found — install with: brew install colmap"
    echo "   (Reconstruction jobs will fail; demo mode still works)"
fi

# ── Launch FastAPI ────────────────────────────────────────────────────────────
echo ""
echo "Starting Inspira API on http://localhost:8000"
echo "  Docs:    http://localhost:8000/docs"
echo "  Health:  http://localhost:8000/api/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

uvicorn api.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --reload-exclude "data/*" \
    --reload-exclude "frontend/*" \
    --log-level info
