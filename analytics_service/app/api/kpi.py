# app/api/kpi.py

import uuid
import pandas as pd

from fastapi import APIRouter, Depends, HTTPException, Response
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

    import numpy as np

    gst_app = df.get("gst_applicable", pd.Series([True]*len(df), index=df.index)).fillna(True).astype(bool)
    itc_elig = df.get("itc_eligible", pd.Series([True]*len(df), index=df.index)).fillna(True).astype(bool)

    # Derive GST features
    df["gst_rate"] = df["gst_slab_effective"] / 100
    
    mask_gst = gst_app & (df["gst_slab_effective"] > 0)
    df["taxable_value"] = np.where(mask_gst, df["amount"] / (1 + df["gst_rate"]), df["amount"])
    df["gst_liability"] = np.where(mask_gst, df["amount"] - df["taxable_value"], 0.0)

    mask_itc = mask_gst & itc_elig
    df["itc_eligible_amount"] = np.where(mask_itc, df["gst_liability"], 0.0)

    total_expenses = float(df["amount"].sum())
    total_gst_liability = round(float(df["gst_liability"].sum()), 2)
    total_itc = round(float(df["itc_eligible_amount"].sum()), 2)

    net_gst_payable_raw = total_gst_liability - total_itc
    net_gst_payable = round(max(net_gst_payable_raw, 0.0), 2)
    carry_forward_itc = round(abs(net_gst_payable_raw) if net_gst_payable_raw < 0 else 0.0, 2)

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
            "net_amount": round(float(df["taxable_value"].sum()), 2),
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


# ======================================================
# 3️⃣ EXPORT SUMMARY CSV
# ======================================================

@router.get("/{upload_id}/export")
def export_summary_csv(
    upload_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    anomaly_run = _get_completed_anomaly_run(db, upload_id)
    df = csv_reader.load_dataframe(upload_id, anomaly_run.anomaly_file_path)
    df = csv_reader.ensure_effective_slab_column(df)

    import numpy as np

    gst_app = df.get("gst_applicable", pd.Series([True]*len(df), index=df.index)).fillna(True).astype(bool)
    itc_elig = df.get("itc_eligible", pd.Series([True]*len(df), index=df.index)).fillna(True).astype(bool)

    # Derive GST features
    df["gst_rate"] = df["gst_slab_effective"] / 100
    mask_gst = gst_app & (df["gst_slab_effective"] > 0)
    df["taxable_value"] = np.where(mask_gst, df["amount"] / (1 + df["gst_rate"]), df["amount"])
    df["gst_liability"] = np.where(mask_gst, df["amount"] - df["taxable_value"], 0.0)

    mask_itc = mask_gst & itc_elig
    df["itc_eligible_amount"] = np.where(mask_itc, df["gst_liability"], 0.0)

    date_col = csv_reader.detect_date_column(df)
    if date_col and date_col in df.columns:
        df["transaction_date"] = df[date_col]
    else:
        df["transaction_date"] = None
    
    export_df = pd.DataFrame()
    export_df["transaction_id"] = df.get("transaction_id", range(1, len(df)+1))
    export_df["transaction_date"] = df["transaction_date"]
    export_df["amount"] = df.get("amount", 0.0)
    export_df["currency"] = df.get("currency", "INR")
    export_df["description"] = df.get("description", "")
    export_df["vendor_name"] = df.get("vendor_name", "")
    export_df["category_label"] = df.get("category_label", df.get("category", ""))
    export_df["gst_slab"] = df["gst_slab_effective"]
    export_df["net_amount"] = df["taxable_value"]
    export_df["itc_eligible_amount"] = df["itc_eligible_amount"]
    export_df["gst_liablity_amount"] = df["gst_liability"]

    csv_data = export_df.to_csv(index=False)
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=summary_{upload_id}.csv"}
    )
