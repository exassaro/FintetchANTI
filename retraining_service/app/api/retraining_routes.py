"""API routes for the Retraining Service.

Exposes endpoints to trigger retraining jobs, check job status,
and list all retraining jobs with filtering and pagination.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.retraining_job import RetrainingJob
from app.config import SCHEMA_MLFLOW_URIS
from app.schemas.retraining_schema import (
    RetrainingTrigger,
    RetrainingResponse,
    RetrainingStatusResponse,
    RetrainingJobList,
)
from app.services.job_service import run_retraining

logger = logging.getLogger(__name__)

VALID_SCHEMAS = set(SCHEMA_MLFLOW_URIS.keys())

router = APIRouter()


# ==========================================================
# POST /trigger — Trigger a retraining job
# ==========================================================

@router.post("/trigger", response_model=RetrainingResponse)
def trigger_retraining(
    payload: RetrainingTrigger,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Trigger retraining for one or all schemas.

    Creates pending job records, then launches background retraining.
    Skips schemas that already have a running or pending job.

    Args:
        payload: Request body with schema_type and triggered_by.
        background_tasks: FastAPI background task manager.
        db: Database session (injected via ``Depends``).

    Returns:
        RetrainingResponse: Message and list of job UUIDs.

    Raises:
        HTTPException: 400 if schema_type is invalid.
    """
    schemas_to_run = []
    
    if payload.schema_type.upper() == "ALL":
        schemas_to_run = list(VALID_SCHEMAS)
    elif payload.schema_type in VALID_SCHEMAS:
        schemas_to_run = [payload.schema_type]
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid schema_type '{payload.schema_type}'. "
                   f"Must be one of {sorted(VALID_SCHEMAS)} or 'ALL'",
        )

    job_ids = []
    
    for schema in schemas_to_run:
        # Concurrency guard: block if already running for this schema
        existing = db.query(RetrainingJob).filter(
            RetrainingJob.schema_type == schema,
            RetrainingJob.status.in_(["pending", "running"]),
        ).first()

        if existing:
            logger.info(f"Skipping {schema}; job already running/pending (ID: {existing.id})")
            job_ids.append(existing.id)
            continue

        # Create job record
        job = RetrainingJob(
            schema_type=schema,
            status="pending",
            triggered_by=payload.triggered_by,
        )

        db.add(job)
        db.commit()
        db.refresh(job)

        logger.info(
            f"Created retraining job {job.id} for schema {schema} "
            f"(triggered by {payload.triggered_by})"
        )

        # Launch in background
        background_tasks.add_task(
            run_retraining,
            job.id,
            schema,
        )
        job_ids.append(job.id)

    msg = f"Triggered {len(schemas_to_run)} schema retraining jobs."
    return RetrainingResponse(message=msg, job_ids=job_ids)


# ==========================================================
# GET /status/{job_id} — Get a single job status
# ==========================================================

@router.get("/status/{job_id}", response_model=RetrainingStatusResponse)
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve the status of a single retraining job.

    Args:
        job_id: UUID string of the retraining job.
        db: Database session (injected via ``Depends``).

    Returns:
        RetrainingStatusResponse: Full job status and metrics.

    Raises:
        HTTPException: 400 on invalid UUID, 404 if not found.
    """
    try:
        uuid_obj = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job_id format")

    job = db.query(RetrainingJob).filter(RetrainingJob.id == uuid_obj).first()

    if not job:
        raise HTTPException(status_code=404, detail="Retraining job not found")

    return job


# ==========================================================
# GET /jobs — List all retraining jobs (most recent first)
# ==========================================================

@router.get("/jobs", response_model=RetrainingJobList)
def list_jobs(
    schema_type: str = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """List retraining jobs, most recent first.

    Args:
        schema_type: Optional filter by schema.
        limit: Maximum number of jobs to return. Defaults to 20.
        db: Database session (injected via ``Depends``).

    Returns:
        RetrainingJobList: Jobs list and total count.
    """
    query = db.query(RetrainingJob)

    if schema_type:
        query = query.filter(RetrainingJob.schema_type == schema_type)

    total = query.count()
    jobs = query.order_by(RetrainingJob.created_at.desc()).limit(limit).all()

    return RetrainingJobList(jobs=jobs, total=total)