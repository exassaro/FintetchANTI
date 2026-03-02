"""
API routes for the Anomaly Detection Service.

Exposes endpoints to trigger anomaly detection on classified uploads
and check service health.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.db.models import AnomalyRun
from app.services.anomaly_orchestrator import run_anomaly_pipeline
from app.core.constants import STATUS_PENDING, STATUS_COMPLETED

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/anomaly", tags=["Anomaly"])


@router.post("/run/{upload_id}")
def run_anomaly(upload_id: str, db: Session = Depends(get_db)):
    """Trigger anomaly detection for a classified upload.

    Creates an ``AnomalyRun`` record and executes the full anomaly pipeline.
    Prevents duplicate runs by checking for existing completed runs.

    Args:
        upload_id: UUID string of the classified upload.
        db: Database session (injected via ``Depends``).

    Returns:
        dict: Pipeline result summary with status, counts, and scores.

    Raises:
        HTTPException: 400 if invalid UUID or already completed;
                       500 on unexpected pipeline failure.
    """
    # Validate UUID
    try:
        upload_uuid = uuid.UUID(upload_id)
    except ValueError:
        logger.warning("Invalid upload_id format received: %s", upload_id)
        raise HTTPException(status_code=400, detail="Invalid upload_id")

    # Prevent Duplicate Runs
    existing = db.query(AnomalyRun).filter_by(upload_id=upload_uuid).first()

    if existing:
        if existing.status == STATUS_COMPLETED:
            logger.info("Anomaly run already completed for upload %s", upload_id)
            raise HTTPException(
                status_code=400,
                detail="Anomaly run already completed"
            )
        else:
            # Allow re-run if failed
            logger.info("Removing failed anomaly run for upload %s", upload_id)
            db.delete(existing)
            db.commit()

    # Create New AnomalyRun Record
    run = AnomalyRun(
        upload_id=upload_uuid,
        schema_type="UNKNOWN",
        status=STATUS_PENDING,
        classified_file_path="TBD"
    )

    db.add(run)
    db.commit()
    db.refresh(run)

    logger.info("Created anomaly run %s for upload %s", run.id, upload_id)

    # Call Orchestrator
    try:
        result = run_anomaly_pipeline(upload_id, db)
    except Exception as exc:
        logger.error(
            "Anomaly pipeline failed for upload %s: %s",
            upload_id,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Anomaly detection failed: {exc}"
        )

    return result


@router.get("/health")
def health():
    """Return health status of the Anomaly Detection Service."""
    return {"status": "ok"}