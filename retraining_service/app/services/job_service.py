"""
Job Service — Retraining Orchestrator.

Controls the full retraining workflow:
    pending → running → (build dataset → train → evaluate → promote) → completed | failed

IMPORTANT: Creates its OWN database session for background execution.
FastAPI's request-scoped session (from Depends) closes after the HTTP
response is sent, so background tasks MUST NOT reuse it.
"""

import logging
import traceback
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.retraining_job import RetrainingJob
from app.services.dataset_builder import build_dataset
from app.services.trainer import train_model
from app.services.evaluator import evaluate_model
from app.services.mlflow_manager import log_and_maybe_promote

logger = logging.getLogger(__name__)


def run_retraining(job_id, schema_type: str):
    """
    Execute a complete retraining cycle.

    This function creates its own DB session because it runs as a
    BackgroundTask (outside the request lifecycle).
    """

    db: Session = SessionLocal()

    try:
        job = db.query(RetrainingJob).filter(RetrainingJob.id == job_id).first()

        if not job:
            logger.error(f"Retraining job {job_id} not found in database")
            return

        # Mark running
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()
        logger.info(f"Retraining job {job_id} started for schema {schema_type}")

        # 1) Build dataset
        dataset = build_dataset(schema_type, db)

        # 2) Train model
        model, X_test, y_test = train_model(dataset, schema_type)

        # 3) Evaluate
        metrics = evaluate_model(model, X_test, y_test)

        # 4) Log to MLflow and maybe promote
        old_v, new_v, promoted = log_and_maybe_promote(
            schema_type, model, metrics
        )

        # 5) Record results
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        job.old_model_version = str(old_v) if old_v else None
        job.new_model_version = str(new_v)
        job.promoted = promoted
        job.evaluation_metrics = metrics
        job.error_message = None
        db.commit()

        logger.info(
            f"Retraining job {job_id} completed — "
            f"promoted={promoted}, F1={metrics['macro_f1']:.4f}"
        )

    except Exception as e:
        logger.error(
            f"Retraining job {job_id} failed: {e}",
            exc_info=True,
        )

        try:
            job = db.query(RetrainingJob).filter(RetrainingJob.id == job_id).first()
            if job:
                job.status = "failed"
                job.completed_at = datetime.utcnow()
                job.error_message = f"{type(e).__name__}: {str(e)}"
                db.commit()
        except Exception:
            logger.error("Failed to update job status after error", exc_info=True)

    finally:
        db.close()