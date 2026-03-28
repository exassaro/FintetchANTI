"""
FastAPI application entry point for the GST Classification Service.

Initialises structured logging, creates database tables, registers
CORS middleware, and mounts the classification API routes.
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import setup_logging
from app.api.routes import router
from app.db.base import Base
from app.db.session import engine

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Auditron - GST Classification Service",
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
    logger.info("Classification Service database tables created / verified")


app.include_router(router)


@app.get("/health")
def health():
    """Return health status for load-balancer probes."""
    return {"status": "ok"}



    