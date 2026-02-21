# app/api/review.py
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import models
from app.services.review_engine import ReviewEngine
from app.db.schemas import ReviewDecisionCreate, ReviewDecisionResponse

router = APIRouter(prefix="/review", tags=["Review"])

review_engine = ReviewEngine()


# ======================================================
# HELPER: Validate Anomaly Run
# ======================================================

def _get_completed_anomaly_run(
    db: Session,
    upload_id: uuid.UUID
):

    anomaly_run = (
        db.query(models.AnomalyRun)
        .filter(models.AnomalyRun.upload_id == upload_id)
        .order_by(models.AnomalyRun.created_at.desc())
        .first()
    )

    if not anomaly_run:
        raise HTTPException(
            status_code=404,
            detail="No anomaly run found for this upload_id."
        )

    if anomaly_run.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Anomaly run not completed yet."
        )

    return anomaly_run


# ======================================================
# 1️⃣ GET REVIEW QUEUE
# ======================================================

@router.get("/{upload_id}/queue")
def get_review_queue(
    upload_id: uuid.UUID,
    filter_type: Optional[str] = Query(
        None,
        description="Optional filter: anomaly_only"
    ),
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    try:
        result = review_engine.get_review_queue(
            upload_id=upload_id,
            anomaly_file_path=anomaly_run.anomaly_file_path,
            filter_type=filter_type
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    return {
        "upload_id": str(upload_id),
        "total_flagged": len(result),
        "records": result,
    }


# ======================================================
# 2️⃣ CREATE REVIEW DECISION
# ======================================================

@router.post("/{upload_id}/decision", response_model=ReviewDecisionResponse)
def create_review_decision(
    upload_id: uuid.UUID,
    payload: ReviewDecisionCreate,
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    try:
        review_record = review_engine.create_review_decision(
            db=db,
            upload_id=upload_id,
            anomaly_run_id=anomaly_run.id,
            anomaly_file_path=anomaly_run.anomaly_file_path,
            row_index=payload.row_index,
            decision=payload.decision,
            corrected_gst_slab=payload.corrected_gst_slab,
            reviewer_id="human",
            review_notes=payload.rationale,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return review_record


# ======================================================
# 3️⃣ DOWNLOAD REVIEWED FILE
# ======================================================

@router.get("/{upload_id}/download")
def download_reviewed_file(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    reviewed_path = review_engine.get_reviewed_csv_path(upload_id)

    if not reviewed_path or not os.path.exists(reviewed_path):
        raise HTTPException(
            status_code=404,
            detail="Reviewed file not found."
        )

    return FileResponse(
        reviewed_path,
        media_type="text/csv",
        filename=f"{upload_id}_reviewed.csv"
    )