# app/api/time_series.py

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import models
from app.services.forecast_engine import ForecastEngine
from app.services.csv_reader import CSVReader
from app.services.cache_manager import CacheManager

import pandas as pd

router = APIRouter(prefix="/time-series", tags=["Time Series"])

forecast_engine = ForecastEngine()
csv_reader = CSVReader()
cache = CacheManager()


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
# GENERIC HISTORY VS FORECAST
# ======================================================

def _history_vs_forecast(
    upload_id: uuid.UUID,
    anomaly_file_path: str,
    metric: str
):

    cache_key = f"time_series:{metric}"
    cached = cache.get(upload_id, cache_key)
    if cached:
        return cached

    result = forecast_engine.run_forecast(
        upload_id=upload_id,
        anomaly_file_path=anomaly_file_path,
        metric=metric,
        exclude_anomalies=True,
    )

    cache.set(upload_id, cache_key, result)
    return result


# ======================================================
# GENERIC ENDPOINT (Used by frontend getTimeSeries)
# ======================================================

@router.get("/{upload_id}")
def get_time_series_generic(
    upload_id: uuid.UUID,
    metric: str = "total_expenses",
    db: Session = Depends(get_db)
):
    anomaly_run = _get_completed_anomaly_run(db, upload_id)
    result = _history_vs_forecast(
        upload_id,
        anomaly_run.anomaly_file_path,
        metric=metric
    )
    return result



# ======================================================
# 1️⃣ TOTAL EXPENSES
# ======================================================

@router.get("/{upload_id}/expenses")
def get_total_expenses(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    result = _history_vs_forecast(
        upload_id,
        anomaly_run.anomaly_file_path,
        metric="total_expenses"
    )

    return {
        "upload_id": str(upload_id),
        "metric": "total_expenses",
        "data": result
    }


# ======================================================
# 2️⃣ GST LIABILITY
# ======================================================

@router.get("/{upload_id}/gst")
def get_gst_liability(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    result = _history_vs_forecast(
        upload_id,
        anomaly_run.anomaly_file_path,
        metric="gst_liability"
    )

    return {
        "upload_id": str(upload_id),
        "metric": "gst_liability",
        "data": result
    }


# ======================================================
# 3️⃣ ITC ELIGIBLE AMOUNT
# ======================================================

@router.get("/{upload_id}/itc")
def get_itc_eligible_amount(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    result = _history_vs_forecast(
        upload_id,
        anomaly_run.anomaly_file_path,
        metric="itc_eligible_amount"
    )

    return {
        "upload_id": str(upload_id),
        "metric": "itc_eligible_amount",
        "data": result
    }


# ======================================================
# 4️⃣ ITC CONTRIBUTION RATIO OVER TIME
# ======================================================

@router.get("/{upload_id}/itc-ratio")
def get_itc_ratio_over_time(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    cache_key = "time_series:itc_ratio"
    cached = cache.get(upload_id, cache_key)
    if cached:
        return cached

    df = csv_reader.load_dataframe(
        upload_id,
        anomaly_run.anomaly_file_path
    )

    df = csv_reader.ensure_effective_slab_column(df)
    date_col = csv_reader.detect_date_column(df)

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col])

    df["_month"] = df[date_col].dt.to_period("M").dt.to_timestamp()

    # Derive GST features
    df["gst_rate"] = df["gst_slab_effective"] / 100
    df["gst_liability"] = df["amount"] * df["gst_rate"]
    df["itc_eligible_flag"] = df["gst_slab_effective"].isin({5, 18, 40})
    df["itc_eligible_amount"] = df["amount"].where(
        df["itc_eligible_flag"], 0
    )

    grouped = (
        df.groupby("_month")
        .agg(
            gst_liability=("gst_liability", "sum"),
            itc_eligible_amount=("itc_eligible_amount", "sum"),
        )
        .reset_index()
        .sort_values("_month")
    )

    result = []

    for _, row in grouped.iterrows():
        ratio = (
            row["itc_eligible_amount"] / row["gst_liability"]
            if row["gst_liability"] > 0 else 0
        )

        result.append({
            "month": row["_month"].strftime("%Y-%m-01"),
            "gst_liability": float(row["gst_liability"]),
            "itc_eligible_amount": float(row["itc_eligible_amount"]),
            "itc_ratio": round(ratio, 4),
        })

    response = {
        "upload_id": str(upload_id),
        "metric": "itc_ratio",
        "data": result
    }

    cache.set(upload_id, cache_key, response)

    return response