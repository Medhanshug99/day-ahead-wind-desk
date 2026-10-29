"""
FastAPI application entry point.

Run with:
    cd backend
    uvicorn app.main:app --reload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .data_loader import data_store
from .routes import router

logger = logging.getLogger("wind_forecast")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load data snapshots on startup."""
    data_dir = Path(__file__).resolve().parent.parent / settings.data_dir
    try:
        data_store.load(data_dir)
        logger.info(
            "Data loaded: %d FUELHH, %d WINDFOR rows",
            len(data_store.fuelhh), len(data_store.windfor),
        )
    except FileNotFoundError as exc:
        logger.warning("Data snapshots not found: %s", exc)
    yield


app = FastAPI(
    title="UK Wind Forecast Accuracy",
    description=(
        "Day-ahead wind generation forecast accuracy analysis for "
        "UK energy trading.  Compares BMRS WINDFOR forecasts against "
        "FUELHH actuals for January 2026 delivery days."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Mount frontend static distribution if built
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")

