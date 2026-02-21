# app/services/review_engine.py

import os
import uuid
import shutil
import tempfile
from datetime import datetime
from typing import List, Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.services.csv_reader import CSVReader
from app.services.cache_manager import CacheManager
from app.db.models import ReviewDecision
from app.config import settings


class ReviewEngine:

    def __init__(self):
        self.csv_reader = CSVReader()
        self.cache = CacheManager()

        os.makedirs(settings.REVIEW_STORAGE_PATH, exist_ok=True)

    # ======================================================
    # PATH RESOLUTION
    # ======================================================

    def get_reviewed_csv_path(self, upload_id: uuid.UUID) -> str:
        return os.path.join(
            settings.REVIEW_STORAGE_PATH,
            f"{upload_id}.csv"
        )

    # ======================================================
    # INTERNAL HELPERS
    # ======================================================

    def _ensure_review_copy_exists(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str
    ) -> str:

        reviewed_path = self.get_reviewed_csv_path(upload_id)

        if not os.path.exists(reviewed_path):
            shutil.copyfile(anomaly_file_path, reviewed_path)

        return reviewed_path

    def _is_review_eligible(self, row: pd.Series) -> bool:

        if row.get("is_anomaly", False):
            return True

        if row.get("gst_confidence", 1.0) < settings.LOW_CONFIDENCE_THRESHOLD:
            return True

        if row.get("gst_confidence_margin", 1.0) < settings.LOW_MARGIN_THRESHOLD:
            return True

        return False

    def _atomic_write(self, df: pd.DataFrame, path: str) -> None:
        """
        Prevent partial writes using atomic replace.
        """
        dir_name = os.path.dirname(path)

        with tempfile.NamedTemporaryFile(
            mode="w",
            delete=False,
            dir=dir_name,
            suffix=".csv"
        ) as tmp_file:
            df.to_csv(tmp_file.name, index=False)
            temp_name = tmp_file.name

        os.replace(temp_name, path)

    # ======================================================
    # REVIEW DECISION
    # ======================================================

    def create_review_decision(
        self,
        db: Session,
        upload_id: uuid.UUID,
        anomaly_run_id: uuid.UUID,
        anomaly_file_path: str,
        row_index: int,
        decision: str,
        corrected_gst_slab: Optional[int],
        reviewer_id: str,
        review_notes: Optional[str] = None,
    ) -> ReviewDecision:

        # Load authoritative dataset safely
        df = self.csv_reader.load_dataframe(
            upload_id,
            anomaly_file_path
        )

        if row_index >= len(df):
            raise ValueError("Invalid row_index.")

        row = df.iloc[row_index]

        if not self._is_review_eligible(row):
            raise PermissionError(
                "Transaction not eligible for review."
            )

        # Ensure reviewed copy exists
        reviewed_path = self._ensure_review_copy_exists(
            upload_id,
            anomaly_file_path
        )

        reviewed_df = pd.read_csv(reviewed_path)

        # Ensure review columns exist
        if "gst_slab_final" not in reviewed_df.columns:
            reviewed_df["gst_slab_final"] = reviewed_df.get(
                "gst_slab_predicted"
            )

        if "review_status" not in reviewed_df.columns:
            reviewed_df["review_status"] = "pending"

        if "reviewed_by" not in reviewed_df.columns:
            reviewed_df["reviewed_by"] = None

        if "reviewed_at" not in reviewed_df.columns:
            reviewed_df["reviewed_at"] = None

        original_slab = int(row.get("gst_slab_predicted", 0))
        original_confidence = float(row.get("gst_confidence", 0))
        anomaly_score = float(row.get("anomaly_score", 0))

        # ---------------------------------------------
        # Apply Logic: If user marks CONFIRMED -> anomaly
        # ---------------------------------------------
        review_status = decision.lower()  # e.g., "confirmed", "rejected"
        
        if decision == "CONFIRMED":
            reviewed_df.at[row_index, "is_anomaly"] = True
        elif decision == "REJECTED":
            reviewed_df.at[row_index, "is_anomaly"] = False

        # Apply GST correction if provided
        if corrected_gst_slab is not None:
            reviewed_df.at[row_index, "gst_slab_final"] = corrected_gst_slab

        reviewed_df.at[row_index, "review_status"] = review_status
        reviewed_df.at[row_index, "reviewed_by"] = reviewer_id
        reviewed_df.at[row_index, "reviewed_at"] = datetime.utcnow()

        # Atomic write
        self._atomic_write(reviewed_df, reviewed_path)

        # Insert audit record
        review_record = ReviewDecision(
            upload_id=upload_id,
            anomaly_run_id=anomaly_run_id,
            row_index=row_index,
            transaction_id=row.get("transaction_id"),
            original_gst_slab=original_slab,
            original_confidence=original_confidence,
            anomaly_score=anomaly_score,
            corrected_gst_slab=corrected_gst_slab,
            review_status=review_status,
            reviewer_id=reviewer_id,
            review_notes=review_notes,
        )

        db.add(review_record)
        db.commit()
        db.refresh(review_record)

        # Invalidate all analytics cache for this upload
        self.cache.invalidate_upload(upload_id)

        return review_record

    # ======================================================
    # REVIEW QUEUE
    # ======================================================

    def get_review_queue(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str,
        filter_type: Optional[str] = None
    ) -> List[dict]:

        df = self.csv_reader.load_dataframe(
            upload_id,
            anomaly_file_path
        )

        mask = (
            (df["is_anomaly"] == True)
            | (df["gst_confidence"] < settings.LOW_CONFIDENCE_THRESHOLD)
            | (df["gst_confidence_margin"] < settings.LOW_MARGIN_THRESHOLD)
        )

        review_df = df[mask].copy()

        # Add `row_index` so frontend explicitly knows the index for dict
        if "row_index" not in review_df.columns:
            review_df["row_index"] = review_df.index

        # Filter out rows that have already been reviewed/decided
        if "review_status" in review_df.columns:
            # Keep only rules that are NaN or "pending"
            unreviewed_mask = review_df["review_status"].isna() | (review_df["review_status"] == "pending")
            review_df = review_df[unreviewed_mask]
            
        # Optional: Add `flag_type` for frontend badges!
        review_df["flag_type"] = review_df.apply(
            lambda r: "anomaly" if r.get("is_anomaly") else "low_confidence", axis=1
        )

        if filter_type == "anomaly":
            review_df = review_df[review_df["is_anomaly"] == True]
        elif filter_type == "low_confidence":
            review_df = review_df[review_df["is_anomaly"] != True]

        # Replace NaN values with None for compliant JSON serialization
        review_df = review_df.where(pd.notna(review_df), None)

        return review_df.to_dict(orient="records")