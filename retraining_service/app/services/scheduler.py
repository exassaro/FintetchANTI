import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.retraining_job import RetrainingJob
from app.config import SCHEMA_MLFLOW_URIS
from app.services.job_service import run_retraining

logger = logging.getLogger(__name__)

# Same schema dictionary we use everywhere
VALID_SCHEMAS = list(SCHEMA_MLFLOW_URIS.keys())

def scheduled_monthly_retrain():
    """
    Triggered automatically by APScheduler every month.
    Iterates through all valid schemas and dispatches background
    jobs (the exact same execution pipeline as the API endpoint).
    """
    logger.info("CRON: Initiating Monthly Automatic Retraining...")
    db: Session = SessionLocal()
    
    try:
        for schema in VALID_SCHEMAS:
            # Check if one is already running right now
            existing = db.query(RetrainingJob).filter(
                RetrainingJob.schema_type == schema,
                RetrainingJob.status.in_(["pending", "running"]),
            ).first()

            if existing:
                logger.info(f"CRON: Skipping {schema}; job already running/pending (ID: {existing.id})")
                continue

            # Schedule the newly triggered job
            job = RetrainingJob(
                schema_type=schema,
                status="pending",
                triggered_by="automatic_monthly_scheduler",
            )
            
            db.add(job)
            db.commit()
            db.refresh(job)

            logger.info(
                f"CRON: Scheduled retraining job {job.id} for schema {schema}"
            )

            # Fire the exact same worker function independently
            run_retraining(job.id, schema)

        logger.info("CRON: Finished dispatching automated monthly retraining.")

    except Exception as e:
        logger.error(f"CRON: Failed to run scheduled monthly retrain: {e}")
    finally:
        db.close()
