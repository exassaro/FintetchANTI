# app/services/csv_reader.py

import os
import uuid
from typing import List, Optional

import pandas as pd

from app.config import settings


class CSVReader:
    """
    Low-level dataset loader.

    Responsibilities:
    - Resolve authoritative dataset (reviewed > anomaly)
    - Path safety validation
    - Safe CSV loading
    - Effective slab resolution
    - Column validation

    IMPORTANT:
    This class must NOT depend on any other service.
    """

    # ======================================================
    # PATH SAFETY
    # ======================================================

    def _validate_path(self, file_path: str) -> None:
        """
        Prevent path traversal or invalid file access.
        """

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        # Restrict reading outside allowed storage base
        allowed_base = os.path.abspath(
            os.path.join(settings.REVIEW_STORAGE_PATH, "..")
        )

        absolute_path = os.path.abspath(file_path)

        if not absolute_path.startswith(allowed_base):
            raise PermissionError("Attempted unauthorized file access.")

    # ======================================================
    # REVIEWED PATH RESOLUTION (NO ReviewEngine)
    # ======================================================

    def _get_reviewed_path(self, upload_id: uuid.UUID) -> str:
        return os.path.join(
            settings.REVIEW_STORAGE_PATH,
            f"{upload_id}.csv"
        )

    # ======================================================
    # FINAL DATASET RESOLUTION
    # ======================================================

    def resolve_final_dataset_path(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str
    ) -> str:
        """
        Returns authoritative dataset path:
        reviewed > anomaly
        """

        reviewed_path = self._get_reviewed_path(upload_id)

        if os.path.exists(reviewed_path):
            self._validate_path(reviewed_path)
            return reviewed_path

        self._validate_path(anomaly_file_path)
        return anomaly_file_path

    # ======================================================
    # LOAD DATAFRAME
    # ======================================================

    def load_dataframe(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str,
        columns: Optional[List[str]] = None,
    ) -> pd.DataFrame:
        """
        Loads final dataset safely.
        Optionally loads only selected columns.
        """

        final_path = self.resolve_final_dataset_path(
            upload_id,
            anomaly_file_path
        )

        df = pd.read_csv(
            final_path,
            usecols=columns if columns else None,
        )

        return df

    # ======================================================
    # EFFECTIVE GST SLAB RESOLUTION
    # ======================================================

    def ensure_effective_slab_column(
        self,
        df: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Ensures gst_slab_effective column exists:
        gst_slab_final if exists else gst_slab_predicted
        """

        df = df.copy()

        if "gst_slab_final" in df.columns:
            df["gst_slab_effective"] = df["gst_slab_final"]
        elif "gst_slab_predicted" in df.columns:
            df["gst_slab_effective"] = df["gst_slab_predicted"]
        else:
            raise ValueError(
                "No GST slab column found (expected gst_slab_final or gst_slab_predicted)."
            )

        return df

    # ======================================================
    # DATE COLUMN DETECTION
    # ======================================================

    def detect_date_column(
        self,
        df: pd.DataFrame
    ) -> str:
        """
        Auto-detect date-like column.
        """

        for col in df.columns:
            if "date" in col.lower() or "month" in col.lower():
                return col

        raise ValueError("No date-like column found in dataset.")

    # ======================================================
    # REQUIRED COLUMN VALIDATION
    # ======================================================

    def validate_required_columns(
        self,
        df: pd.DataFrame,
        required_cols: List[str]
    ) -> None:
        missing = [col for col in required_cols if col not in df.columns]

        if missing:
            raise ValueError(
                f"Missing required columns: {missing}"
            )