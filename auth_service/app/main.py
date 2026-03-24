"""FastAPI application entry point for the Auth Service.

Manages user authentication via JWT tokens, seeds a default admin
user, and exposes the login/register/profile API routes.
"""

# app/main.py

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.api.auth import router as auth_router
from app.services.seed import seed_admin
from app.core.logging import setup_logging

setup_logging()
logger = logging.getLogger("auth_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle.

    On startup: creates DB tables and seeds the default admin.
    """
    # ── Startup ──
    logger.info("Auth Service starting up...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")

    # Seed default admin
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()

    yield

    # ── Shutdown ──
    logger.info("Auth Service shutting down.")


app = FastAPI(
    title="FintechAnti Auth Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", os.getenv("FRONTEND_URL", "https://fintetch-anti.vercel.app")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/health")
def health():
    """Return health status for load-balancer probes."""
    return {"status": "ok", "service": "auth"}
