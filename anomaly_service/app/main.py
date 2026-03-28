"""
FastAPI application entry point for the Anomaly Detection Service.

Initialises the database tables, registers CORS middleware, and
mounts the anomaly detection API routes.
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import setup_logging
from app.db.base import Base
from app.db.session import engine
from app.api.routes import router
from app.db import models  # noqa: F401 — required for table registration

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Auditron - Anomaly Detection Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", os.getenv("FRONTEND_URL", "https://auditron.vercel.app")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables():
    """Create all database tables on application startup."""
    Base.metadata.create_all(bind=engine)
    logger.info("Anomaly Service database tables created / verified")


app.include_router(router)


@app.get("/")
def root():
    """Return service identification information."""
    return {"service": "Anomaly Detection Service"}


@app.get("/health")
def health():
    """Return health status for load-balancer probes."""
    return {"status": "ok"}



    