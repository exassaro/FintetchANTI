"""FastAPI application entry point for the Analytics Service.

Initialises structured logging, creates database tables, and mounts
the analytics API routers (forecast, review, dashboard, etc.).
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.logging import setup_logging

from app.db.base import Base
from app.db.session import engine
from app.api import forecast, review, dashboard, time_series, kpi, chatbot, distribution, news

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GST Analytics Service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", os.getenv("FRONTEND_URL", "https://fintetch-anti.vercel.app")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-create tables on startup (replace with Alembic for production)
Base.metadata.create_all(bind=engine)

app.include_router(forecast.router)
app.include_router(review.router)
app.include_router(dashboard.router)
app.include_router(time_series.router)
app.include_router(kpi.router)
app.include_router(chatbot.router)
app.include_router(distribution.router)
app.include_router(news.router)

@app.get("/health")
def health():
    """Return health status for load-balancer probes."""
    return {"status": "ok"}
