# app/services/explanation_engine.py

import uuid
import hashlib
from typing import Dict, Any

from sqlalchemy.orm import Session

from app.services.csv_reader import CSVReader
from app.db.models import LLMExplanation
from app.config import settings


# Replace with your LLM provider wrapper
from app.utils.llm_client import call_llm  # You will create this


class ExplanationEngine:

    def __init__(self):
        self.csv_reader = CSVReader()

    # ======================================================
    # PUBLIC METHOD
    # ======================================================

    def generate_explanation(
        self,
        db: Session,
        upload_id: uuid.UUID,
        anomaly_file_path: str,
        row_index: int,
    ) -> Dict[str, Any]:

        # -----------------------------------------------
        # Load final dataset
        # -----------------------------------------------

        df = self.csv_reader.load_dataframe(
            upload_id,
            anomaly_file_path
        )

        if row_index >= len(df):
            raise ValueError("Invalid row_index.")

        row = df.iloc[row_index]

        transaction_id = str(row.get("transaction_id", row_index))

        # -----------------------------------------------
        # Build structured input context
        # -----------------------------------------------

        context_payload = self._build_context(row)

        prompt_hash = self._hash_payload(context_payload)

        # -----------------------------------------------
        # Check if explanation already exists
        # -----------------------------------------------

        existing = (
            db.query(LLMExplanation)
            .filter(
                LLMExplanation.upload_id == upload_id,
                LLMExplanation.row_index == row_index,
                LLMExplanation.prompt_hash == prompt_hash,
            )
            .first()
        )

        if existing:
            return {
                "cached": True,
                "explanation": existing.explanation_text,
                "model_used": existing.model_name,
            }

        # -----------------------------------------------
        # Call LLM
        # -----------------------------------------------

        explanation_text, model_used = call_llm(context_payload)

        # -----------------------------------------------
        # Persist in DB
        # -----------------------------------------------

        explanation_record = LLMExplanation(
            upload_id=upload_id,
            transaction_id=transaction_id,
            row_index=row_index,
            prompt_hash=prompt_hash,
            explanation_text=explanation_text,
            model_name=model_used,
        )

        db.add(explanation_record)
        db.commit()
        db.refresh(explanation_record)

        return {
            "cached": False,
            "explanation": explanation_text,
            "model_used": model_used,
        }

    # ======================================================
    # INTERNAL HELPERS
    # ======================================================

    def _hash_payload(self, payload: Dict[str, Any]) -> str:
        """
        Deterministic hash to detect duplicate prompts.
        """
        payload_str = str(sorted(payload.items()))
        return hashlib.sha256(payload_str.encode()).hexdigest()

    def _build_context(self, row) -> Dict[str, Any]:
        """
        Build safe structured context.
        No raw user question injection.
        """

        slab_col = (
            "gst_slab_final"
            if "gst_slab_final" in row
            else "gst_slab_predicted"
        )

        return {
            "transaction_id": str(row.get("transaction_id", "")),
            "description": str(row.get("description", "")),
            "amount": float(row.get("amount", 0)),
            "gst_slab": int(row.get(slab_col, 0)),
            "gst_confidence": float(row.get("gst_confidence", 0)),
            "gst_confidence_margin": float(row.get("gst_confidence_margin", 0)),
            "anomaly_score": float(row.get("anomaly_score", 0)),
            "anomaly_reasons": str(row.get("anomaly_reasons", "")),
            "is_anomaly": bool(row.get("is_anomaly", False)),
            "prompt_version": 2, # Bust cache for concise prompt
        }