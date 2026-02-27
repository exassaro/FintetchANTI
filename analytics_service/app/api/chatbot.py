import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import pandas as pd

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

    if "kpi" in q or "financial" in q or "liability" in q or "total spend" in q:
        return "financial_kpi"

    if "compliance" in q or "risk" in q or "tax rate" in q or "confidence" in q:
        return "compliance_kpi"

    if "forecast" in q or "predict" in q:
        return "forecast"

    if "vendor" in q:
        return "vendor_distribution"

    if "category" in q:
        return "category_distribution"

    if "itc ratio" in q:
        return "itc_ratio"

    if "slab" in q:
        return "slab_distribution"

    if "highest" in q or "anomal" in q:
        return "top_anomalies"

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
    # SETUP
    # --------------------------------------------------
    data_context = None

    if intent == "financial_kpi":
        data_context = aggregation_engine.compute_dashboard_summary(
            payload.upload_id,
            anomaly_run.anomaly_file_path
        )

    elif intent == "compliance_kpi":
        df = csv_reader.load_dataframe(
            payload.upload_id,
            anomaly_run.anomaly_file_path
        )
        anomaly_rate = df.get("is_anomaly", df.get("anomaly_score", pd.Series([0])) > 0.5).mean()
        low_confidence = (df.get("gst_confidence", pd.Series([1.0])) < 0.6).sum() if "gst_confidence" in df.columns else 0
        data_context = {"anomaly_rate": round(float(anomaly_rate), 4), "low_confidence_transactions_count": int(low_confidence)}

    elif intent == "forecast":
        data_context = forecast_engine.run_forecast(
            upload_id=payload.upload_id,
            anomaly_file_path=anomaly_run.anomaly_file_path,
            metric="total_expenses",
            exclude_anomalies=True
        )

    elif intent == "vendor_distribution":
        df = csv_reader.load_dataframe(
            payload.upload_id,
            anomaly_run.anomaly_file_path,
            columns=["vendor_name", "amount"]
        )
        grouped = df.groupby("vendor_name")["amount"].sum().sort_values(ascending=False).head(5)
        data_context = grouped.to_dict()

    elif intent == "category_distribution":
        df = csv_reader.load_dataframe(
            payload.upload_id,
            anomaly_run.anomaly_file_path,
            columns=["category", "amount"]
        )
        grouped = df.groupby("category")["amount"].sum().sort_values(ascending=False).head(5)
        data_context = grouped.to_dict()

    elif intent == "itc_ratio":
        df = csv_reader.load_dataframe(payload.upload_id, anomaly_run.anomaly_file_path)
        df = csv_reader.ensure_effective_slab_column(df)
        import numpy as np
        gst_app = df.get("gst_applicable", pd.Series([True]*len(df), index=df.index)).fillna(True).astype(bool)
        itc_elig = df.get("itc_eligible", pd.Series([True]*len(df), index=df.index)).fillna(True).astype(bool)

        df["gst_rate"] = df["gst_slab_effective"] / 100
        mask_gst = gst_app & (df["gst_slab_effective"] > 0)
        df["taxable_value"] = np.where(mask_gst, df["amount"] / (1 + df["gst_rate"]), df["amount"])
        df["gst_liability"] = np.where(mask_gst, df["amount"] - df["taxable_value"], 0.0)

        mask_itc = mask_gst & itc_elig
        df["itc_eligible_amount"] = np.where(mask_itc, df["gst_liability"], 0.0)

        total_itc = float(df["itc_eligible_amount"].sum())
        total_gst = float(df["gst_liability"].sum())
        itc_ratio = total_itc / total_gst if total_gst > 0 else 0
        data_context = {"itc_ratio": round(itc_ratio, 4), "total_gst_liability": round(total_gst, 2)}

    elif intent == "slab_distribution":
        df = csv_reader.load_dataframe(payload.upload_id, anomaly_run.anomaly_file_path)
        df = csv_reader.ensure_effective_slab_column(df)
        slab_amounts = df.groupby("gst_slab_effective")["amount"].sum().to_dict()
        data_context = {"total_spend_amount_by_gst_slab": slab_amounts}

    elif intent == "top_anomalies":
        df = csv_reader.load_dataframe(payload.upload_id, anomaly_run.anomaly_file_path)
        if "anomaly_score" in df.columns:
            top_df = df.sort_values(by="anomaly_score", ascending=False).head(5)
            cols = ["transaction_id", "vendor_name", "amount", "anomaly_score", "anomaly_reasons"]
            data_context = top_df[[c for c in cols if c in top_df.columns]].to_dict(orient="records")
        else:
            data_context = {"status": "no anomalies calculated yet"}

    elif intent == "explain_row":
        if payload.row_index is None:
            raise HTTPException(status_code=400, detail="row_index required for explanation.")
        
        explanation = explanation_engine.generate_explanation(
            db=db,
            upload_id=payload.upload_id,
            anomaly_file_path=anomaly_run.anomaly_file_path,
            row_index=payload.row_index,
        )
        
        return {
            "intent": intent,
            "response": explanation.get("explanation"),
            "model_used": explanation.get("model_used")
        }

    elif intent == "llm_fallback":
        try:
            data_context = {"dataset_high_level_summary": aggregation_engine.compute_dashboard_summary(
                payload.upload_id,
                anomaly_run.anomaly_file_path
            )}
        except:
            pass

    # --------------------------------------------------
    # FINAL LLM PASS FOR FORMATTING
    # --------------------------------------------------
    # Pass the query and specific data (if available) to the LLM to format cleanly natively
    explanation, model_used = call_llm({
        "query": payload.query,
        "data": data_context
    })

    return {
        "intent": intent,
        "model_used": model_used,
        "response": explanation
    }