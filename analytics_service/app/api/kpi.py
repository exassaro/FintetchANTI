# app/api/kpi.py

import uuid
import pandas as pd

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import models
from app.services.csv_reader import CSVReader
from app.services.cache_manager import CacheManager
from app.config import settings


router = APIRouter(prefix="/kpi", tags=["KPI"])

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
            detail="No anomaly run found."
        )

    if anomaly_run.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Anomaly run not completed."
        )

    return anomaly_run


# ======================================================
# 1️⃣ FINANCIAL KPI
# ======================================================

@router.get("/{upload_id}/financial")
def get_financial_kpis(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    cache_key = "kpi:financial"
    cached = cache.get(upload_id, cache_key)
    if cached:
        return cached

    df = csv_reader.load_dataframe(
        upload_id,
        anomaly_run.anomaly_file_path
    )

    df = csv_reader.ensure_effective_slab_column(df)

    # Derive GST features
    df["gst_rate"] = df["gst_slab_effective"] / 100
    df["gst_liability"] = df["amount"] * df["gst_rate"]

    df["itc_eligible_flag"] = df["gst_slab_effective"].isin({5, 18, 40})
    df["itc_eligible_amount"] = df["amount"].where(
        df["itc_eligible_flag"], 0
    )

    total_expenses = float(df["amount"].sum())
    total_gst_liability = float(df["gst_liability"].sum())
    total_itc = float(df["itc_eligible_amount"].sum())

    net_gst_payable = max(total_gst_liability - total_itc, 0)

    effective_tax_rate = (
        total_gst_liability / total_expenses
        if total_expenses > 0 else 0
    )

    itc_utilization_ratio = (
        total_itc / total_gst_liability
        if total_gst_liability > 0 else 0
    )

    result = {
        "upload_id": str(upload_id),
        "financial_kpis": {
            "total_expenses": total_expenses,
            "total_gst_liability": total_gst_liability,
            "total_itc_eligible": total_itc,
            "net_gst_payable": net_gst_payable,
            "effective_tax_rate": round(effective_tax_rate, 4),
            "itc_utilization_ratio": round(itc_utilization_ratio, 4),
        }
    }

    cache.set(upload_id, cache_key, result)

    return result


# ======================================================
# 2️⃣ COMPLIANCE KPI
# ======================================================

@router.get("/{upload_id}/compliance")
def get_compliance_kpis(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    cache_key = "kpi:compliance"
    cached = cache.get(upload_id, cache_key)
    if cached:
        return cached

    df = csv_reader.load_dataframe(
        upload_id,
        anomaly_run.anomaly_file_path
    )

    total_transactions = len(df)
    
    # Ensure robust bool casting for `is_anomaly`
    if "is_anomaly" in df.columns:
        df["is_anomaly"] = df["is_anomaly"].astype(str).str.strip().str.lower() == "true"

    anomaly_count = int(df["is_anomaly"].sum())
    anomaly_rate = (
        anomaly_count / total_transactions
        if total_transactions > 0 else 0
    )

    high_severity = int((df["anomaly_score"] >= 0.75).sum())
    high_severity_ratio = (
        high_severity / total_transactions
        if total_transactions > 0 else 0
    )

    low_confidence = int(
        (df["gst_confidence"] < settings.LOW_CONFIDENCE_THRESHOLD).sum()
    )

    low_confidence_ratio = (
        low_confidence / total_transactions
        if total_transactions > 0 else 0
    )

    reviewed_ratio = 0
    if "review_status" in df.columns:
        reviewed_ratio = (
            (df["review_status"] == "reviewed").sum()
            / total_transactions
            if total_transactions > 0 else 0
        )

    # Simple weighted compliance risk score (0-100)
    compliance_risk_score = round(
        (
            anomaly_rate * 40 +
            high_severity_ratio * 30 +
            low_confidence_ratio * 20 +
            (1 - reviewed_ratio) * 10
        ) * 100,
        2
    )

    result = {
        "upload_id": str(upload_id),
        "compliance_kpis": {
            "total_transactions": total_transactions,
            "anomaly_rate": round(anomaly_rate, 4),
            "high_severity_ratio": round(high_severity_ratio, 4),
            "low_confidence_ratio": round(low_confidence_ratio, 4),
            "reviewed_ratio": round(reviewed_ratio, 4),
            "compliance_risk_score": compliance_risk_score
        }
    }

    cache.set(upload_id, cache_key, result)

    return result