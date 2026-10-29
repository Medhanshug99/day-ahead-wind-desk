"""
Vercel Serverless Function entry point.

Exports the FastAPI `app` instance for Vercel's Python runtime.
Bundles immutable data snapshots from `backend/data/`.
"""

import sys
from pathlib import Path

# Add backend directory to Python module search path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure DATA_DIR points to backend/data when running serverless
import os
os.environ.setdefault("DATA_DIR", str(BACKEND_DIR / "data"))

from app.main import app
from app.data_loader import data_store

# Ensure data snapshots are loaded on function cold start
if not data_store.is_loaded:
    data_store.load(BACKEND_DIR / "data")

