#!/bin/bash
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
