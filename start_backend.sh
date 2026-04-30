#!/bin/bash
cd ~/inspira
source .venv/bin/activate
uvicorn inspira.api.main:app --reload --host 0.0.0.0 --port 8000
