# app/api/distribution.py

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import models
from app.services.csv_reader import CSVReader
from app.services.cache_manager import CacheManager


router = APIRouter(prefix="/distribution", tags=["Distribution"])

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
# 1️⃣ VENDOR SPEND
# ======================================================

@router.get("/{upload_id}/vendors")
def get_vendor_distribution(
    upload_id: uuid.UUID,
    top_n: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    cache_key = f"vendor_distribution:{top_n}"
    cached = cache.get(upload_id, cache_key)
    if cached:
        return cached

    df = csv_reader.load_dataframe(
        upload_id,
        anomaly_run.anomaly_file_path,
        columns=["vendor_name", "amount"]
    )

    if "vendor_name" not in df.columns:
        return {
            "upload_id": str(upload_id),
            "metric": "vendor_spend",
            "total_spend": 0.0,
            "top_n": top_n,
            "data": []
        }

    df = df.dropna(subset=["vendor_name"])

    grouped = (
        df.groupby("vendor_name")["amount"]
        .sum()
        .sort_values(ascending=False)
        .head(top_n)
    )

    total_spend = float(df["amount"].sum())

    result_data = []

    for vendor, value in grouped.items():
        result_data.append({
            "vendor_name": vendor,
            "total_spend": float(value),
            "percentage": round((value / total_spend) * 100, 2)
        })

    result = {
        "upload_id": str(upload_id),
        "metric": "vendor_spend",
        "total_spend": total_spend,
        "top_n": top_n,
        "data": result_data
    }

    cache.set(upload_id, cache_key, result)

    return result


# ======================================================
# 2️⃣ CATEGORY SPEND
# ======================================================

@router.get("/{upload_id}/categories")
def get_category_distribution(
    upload_id: uuid.UUID,
    top_n: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, upload_id)

    cache_key = f"category_distribution:{top_n}"
    cached = cache.get(upload_id, cache_key)
    if cached:
        return cached

    df = csv_reader.load_dataframe(
        upload_id,
        anomaly_run.anomaly_file_path,
        columns=["category", "amount"]
    )

    if "category" not in df.columns:
        return {
            "upload_id": str(upload_id),
            "metric": "category_spend",
            "total_spend": 0.0,
            "top_n": top_n,
            "data": []
        }

    df = df.dropna(subset=["category"])

    grouped = (
        df.groupby("category")["amount"]
        .sum()
        .sort_values(ascending=False)
        .head(top_n)
    )

    total_spend = float(df["amount"].sum())

    result_data = []

    for category, value in grouped.items():
        result_data.append({
            "category": category,
            "total_spend": float(value),
            "percentage": round((value / total_spend) * 100, 2)
        })

    result = {
        "upload_id": str(upload_id),
        "metric": "category_spend",
        "total_spend": total_spend,
        "top_n": top_n,
        "data": result_data
    }

    cache.set(upload_id, cache_key, result)

    return result