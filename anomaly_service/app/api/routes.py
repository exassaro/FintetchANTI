import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.db.models import AnomalyRun
from app.services.anomaly_orchestrator import run_anomaly_pipeline
from app.core.constants import STATUS_PENDING,STATUS_COMPLETED

router = APIRouter(prefix="/anomaly", tags=["Anomaly"])


@router.post("/run/{upload_id}")
def run_anomaly(upload_id: str, db: Session = Depends(get_db)):

    # Validate UUID
    

    try:
        upload_uuid = uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload_id")


    # Prevent Duplicate Runs


    existing = db.query(AnomalyRun)\
        .filter_by(upload_id=upload_uuid)\
        .first()

    if existing:
        if existing.status == STATUS_COMPLETED:
            raise HTTPException(
                status_code=400,
                detail="Anomaly run already completed"
            )
        else:
            # allow re-run if failed
            db.delete(existing)
            db.commit()
    
    # if existing and existing.status == STATUS_COMPLETED:
    #     return {
    #         "status": existing.status,
    #         "total_records": existing.total_records,
    #         "anomaly_count": existing.anomaly_count,
    #         "avg_anomaly_score": existing.avg_anomaly_score,
    #         "threshold_used": existing.threshold_used
    #     }


    # Create New AnomalyRun Record


    run = AnomalyRun(
        upload_id=upload_uuid,
        schema_type="UNKNOWN",   # update later if needed
        status=STATUS_PENDING,
        classified_file_path="TBD"
    )

    db.add(run)
    db.commit()
    db.refresh(run)


    # Call Orchestrator


    result = run_anomaly_pipeline(upload_id, db)

    return result


@router.get("/health")
def health():
    return {"status": "ok"}