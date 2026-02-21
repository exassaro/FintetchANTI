# app/api/chatbot.py

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import models

from app.services.aggregation_engine import AggregationEngine
from app.services.forecast_engine import ForecastEngine
from app.services.csv_reader import CSVReader
from app.services.explanation_engine import ExplanationEngine
from app.services.cache_manager import CacheManager

from app.utils.llm_client import call_llm


router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

aggregation_engine = AggregationEngine()
forecast_engine = ForecastEngine()
csv_reader = CSVReader()
explanation_engine = ExplanationEngine()
cache = CacheManager()


# ======================================================
# REQUEST MODEL
# ======================================================

class ChatbotQuery(BaseModel):
    upload_id: uuid.UUID
    query: str
    row_index: Optional[int] = None


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
# INTENT DETECTOR (RULE-BASED PHASE 1)
# ======================================================

def detect_intent(query: str):

    q = query.lower()

    if "kpi" in q or "financial" in q:
        return "financial_kpi"

    if "compliance" in q or "risk" in q:
        return "compliance_kpi"

    if "forecast" in q or "predict" in q:
        return "forecast"

    if "vendor" in q:
        return "vendor_distribution"

    if "category" in q:
        return "category_distribution"

    if "itc ratio" in q:
        return "itc_ratio"

    if "explain" in q:
        return "explain_row"

    return "llm_fallback"


# ======================================================
# MAIN CHATBOT ENDPOINT
# ======================================================

@router.post("/query")
def chatbot_query(
    payload: ChatbotQuery,
    db: Session = Depends(get_db)
):

    anomaly_run = _get_completed_anomaly_run(db, payload.upload_id)

    intent = detect_intent(payload.query)

    # --------------------------------------------------
    # 1️⃣ FINANCIAL KPI
    # --------------------------------------------------

    if intent == "financial_kpi":

        result = aggregation_engine.compute_dashboard_summary(
            payload.upload_id,
            anomaly_run.anomaly_file_path
        )

        return {
            "intent": intent,
            "data": result
        }

    # --------------------------------------------------
    # 2️⃣ COMPLIANCE KPI
    # --------------------------------------------------

    if intent == "compliance_kpi":

        df = csv_reader.load_dataframe(
            payload.upload_id,
            anomaly_run.anomaly_file_path
        )

        anomaly_rate = df["is_anomaly"].mean()

        return {
            "intent": intent,
            "data": {
                "anomaly_rate": round(anomaly_rate, 4)
            }
        }

    # --------------------------------------------------
    # 3️⃣ FORECAST
    # --------------------------------------------------

    if intent == "forecast":

        result = forecast_engine.run_forecast(
            upload_id=payload.upload_id,
            anomaly_file_path=anomaly_run.anomaly_file_path,
            metric="total_expenses",
            exclude_anomalies=True
        )

        return {
            "intent": intent,
            "data": result
        }

    # --------------------------------------------------
    # 4️⃣ VENDOR DISTRIBUTION
    # --------------------------------------------------

    if intent == "vendor_distribution":

        df = csv_reader.load_dataframe(
            payload.upload_id,
            anomaly_run.anomaly_file_path,
            columns=["vendor_name", "amount"]
        )

        grouped = (
            df.groupby("vendor_name")["amount"]
            .sum()
            .sort_values(ascending=False)
            .head(5)
        )

        return {
            "intent": intent,
            "data": grouped.to_dict()
        }

    # --------------------------------------------------
    # 5️⃣ CATEGORY DISTRIBUTION
    # --------------------------------------------------

    if intent == "category_distribution":

        df = csv_reader.load_dataframe(
            payload.upload_id,
            anomaly_run.anomaly_file_path,
            columns=["category", "amount"]
        )

        grouped = (
            df.groupby("category")["amount"]
            .sum()
            .sort_values(ascending=False)
            .head(5)
        )

        return {
            "intent": intent,
            "data": grouped.to_dict()
        }

    # --------------------------------------------------
    # 6️⃣ ITC RATIO
    # --------------------------------------------------

    if intent == "itc_ratio":

        df = csv_reader.load_dataframe(
            payload.upload_id,
            anomaly_run.anomaly_file_path
        )

        df = csv_reader.ensure_effective_slab_column(df)

        df["gst_rate"] = df["gst_slab_effective"] / 100
        df["gst_liability"] = df["amount"] * df["gst_rate"]

        df["itc_eligible"] = df["gst_slab_effective"].isin({5, 18, 40})

        itc_ratio = (
            df[df["itc_eligible"]]["amount"].sum()
            / df["gst_liability"].sum()
            if df["gst_liability"].sum() > 0 else 0
        )

        return {
            "intent": intent,
            "data": {
                "itc_ratio": round(itc_ratio, 4)
            }
        }

    # --------------------------------------------------
    # 7️⃣ EXPLAIN ROW
    # --------------------------------------------------

    if intent == "explain_row":

        if payload.row_index is None:
            raise HTTPException(
                status_code=400,
                detail="row_index required for explanation."
            )

        explanation = explanation_engine.generate_explanation(
            db=db,
            upload_id=payload.upload_id,
            anomaly_file_path=anomaly_run.anomaly_file_path,
            row_index=payload.row_index,
        )

        return {
            "intent": intent,
            "data": explanation
        }

    # --------------------------------------------------
    # 8️⃣ FALLBACK LLM
    # --------------------------------------------------

    explanation, model_used = call_llm({
        "query": payload.query
    })

    return {
        "intent": "llm_fallback",
        "model_used": model_used,
        "response": explanation
    }