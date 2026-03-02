"""Dashboard API endpoints for the Analytics Service.

Provides summary KPIs, slab distribution, spend breakdowns,
anomaly statistics, and monthly trend data.
"""

# app/api/dashboard.py

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import models
from app.services.aggregation_engine import AggregationEngine

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

aggregation_engine = AggregationEngine()


# ======================================================
# HELPER: Validate Anomaly Run
# ======================================================

def _get_completed_anomaly_run(
    db: Session,
    upload_id: uuid.UUID
):
    """Validate that a completed anomaly run exists for the upload.

    Args:
        db: Database session.
        upload_id: UUID of the upload.

    Returns:
        AnomalyRun: The most recent completed anomaly run.

    Raises:
        HTTPException: 404 if no run exists, 400 if not completed.
    """

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
# SUMMARY KPI
# ======================================================

@router.get("/{upload_id}/summary")
def get_dashboard_summary(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Get high-level dashboard KPIs for an upload.

    Returns total transactions, spend, anomaly rate, and review status.
    """

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    result = aggregation_engine.compute_dashboard_summary(
        upload_id=upload_id,
        anomaly_file_path=anomaly_run.anomaly_file_path,
    )

    return {
        "upload_id": str(upload_id),
        "summary": result,
    }


# ======================================================
# SLAB DISTRIBUTION
# ======================================================

@router.get("/{upload_id}/slabs")
def get_slab_distribution(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Get GST slab distribution counts for an upload."""

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    result = aggregation_engine.compute_slab_distribution(
        upload_id=upload_id,
        anomaly_file_path=anomaly_run.anomaly_file_path,
    )

    return {
        "upload_id": str(upload_id),
        "slab_distribution": result,
    }


# ======================================================
# SLAB-WISE SPEND
# ======================================================

@router.get("/{upload_id}/slab-spend")
def get_slab_wise_spend(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Get total spend broken down by GST slab."""

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    result = aggregation_engine.compute_slab_wise_spend(
        upload_id=upload_id,
        anomaly_file_path=anomaly_run.anomaly_file_path,
    )

    return {
        "upload_id": str(upload_id),
        "slab_spend": result,
    }


# ======================================================
# ANOMALY STATISTICS
# ======================================================

@router.get("/{upload_id}/anomalies")
def get_anomaly_statistics(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Get anomaly severity statistics for an upload."""

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    result = aggregation_engine.compute_anomaly_statistics(
        upload_id=upload_id,
        anomaly_file_path=anomaly_run.anomaly_file_path,
    )

    return {
        "upload_id": str(upload_id),
        "anomaly_stats": result,
    }


# ======================================================
# MONTHLY TRENDS
# ======================================================

@router.get("/{upload_id}/monthly")
def get_monthly_trends(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Get monthly spend and anomaly counts for an upload."""

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    result = aggregation_engine.compute_monthly_trends(
        upload_id=upload_id,
        anomaly_file_path=anomaly_run.anomaly_file_path,
    )

    return {
        "upload_id": str(upload_id),
        "monthly_trends": result,
    }