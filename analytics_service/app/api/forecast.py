# app/api/forecast.py

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.forecast_engine import ForecastEngine
from app.db import models

router = APIRouter(prefix="/forecast", tags=["Forecast"])

forecast_engine = ForecastEngine()


# ==========================================================
# VALID METRICS
# ==========================================================

VALID_METRICS = {
    "total_expenses",
    "net_amount",
    "gst_liability",
    "itc_eligible_amount",
    "txn_count",
}


# ==========================================================
# FORECAST ENDPOINT
# ==========================================================

@router.get("/{upload_id}")
def get_forecast(
    upload_id: uuid.UUID,
    metric: str = Query(
        "total_expenses",
        description="Metric to forecast"
    ),
    exclude_anomalies: bool = Query(
        True,
        description="Exclude confirmed anomalies"
    ),
    db: Session = Depends(get_db),
):

    # ------------------------------------------------------
    # Validate metric
    # ------------------------------------------------------

    if metric not in VALID_METRICS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid metric. Allowed: {VALID_METRICS}"
        )

    # ------------------------------------------------------
    # Validate anomaly run exists and completed
    # ------------------------------------------------------

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

    anomaly_file_path = anomaly_run.anomaly_file_path

    # ------------------------------------------------------
    # Execute forecast
    # ------------------------------------------------------

    try:
        result = forecast_engine.run_forecast(
            upload_id=upload_id,
            anomaly_file_path=anomaly_file_path,
            metric=metric,
            exclude_anomalies=exclude_anomalies,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Final dataset file not found."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Forecast failed: {str(e)}"
        )

    return {
        "upload_id": str(upload_id),
        "metric": metric,
        "result": result,
    }