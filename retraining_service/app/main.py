"""FastAPI application entry point for the Retraining Service.

Initialises database tables, optionally starts the APScheduler for
monthly retraining CRON, and mounts the retraining API routes.
"""

import logging
import os

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.api import retraining_routes
from app.database import engine, Base
from app.config import ENABLE_SCHEDULER
from app.services.scheduler import scheduled_monthly_retrain

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Scheduler instance
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle.

    On startup: creates DB tables and optionally starts the scheduler.
    On shutdown: gracefully stops the scheduler if running.
    """
    # Startup actions
    logger.info("Initializing Database Tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Retraining Service tables created / verified.")
    
    # Initialize Scheduler if enabled via env var
    if ENABLE_SCHEDULER:
        logger.info("APScheduler Enabled: Starting monthly background CRON...")
        # Fire once a month (on the 1st of every month at Midnight 00:00)
        scheduler.add_job(
            scheduled_monthly_retrain,
            trigger="cron",
            day=1,
            hour=0,
            minute=0
        )
        scheduler.start()

    yield
    
    # Shutdown actions
    if ENABLE_SCHEDULER:
        logger.info("Shutting down APScheduler...")
        scheduler.shutdown()

# ==========================================================
# FastAPI APPLICATION
# ==========================================================
app = FastAPI(
    title="Auditron - Retraining Service",
    description="Microservice for background ML pipeline retraining and promotion",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", os.getenv("FRONTEND_URL", "https://auditron.vercel.app")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(retraining_routes.router, prefix="/retraining")


@app.get("/health")
def health():
    """Return health status for load-balancer probes."""
    return {"status": "ok", "service": "retraining"}



    