import uuid
from typing import Dict, List, Any

import pandas as pd

from app.services.csv_reader import CSVReader
from app.services.cache_manager import CacheManager
from app.config import settings


class AggregationEngine:

    def __init__(self):
        self.csv_reader = CSVReader()
        self.cache = CacheManager()

    # ======================================================
    # INTERNAL DATA LOADER
    # ======================================================

    def _load_dataset(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str,
        required_columns: List[str] | None = None,
    ) -> pd.DataFrame:

        # Always load full dataset
        df = self.csv_reader.load_dataframe(
            upload_id=upload_id,
            anomaly_file_path=anomaly_file_path,
        )

        # Ensure effective slab exists
        df = self.csv_reader.ensure_effective_slab_column(df)

        # Ensure robust bool casting for `is_anomaly`
        if "is_anomaly" in df.columns:
            df["is_anomaly"] = df["is_anomaly"].astype(str).str.strip().str.lower() == "true"

        # Validate required columns after transformations
        if required_columns:
            self.csv_reader.validate_required_columns(df, required_columns)

        return df

    # ======================================================
    # DASHBOARD SUMMARY
    # ======================================================

    def compute_dashboard_summary(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str
    ) -> Dict[str, Any]:

        cache_key = "dashboard_summary"
        cached = self.cache.get(upload_id, cache_key)
        if cached:
            return cached

        df = self._load_dataset(
            upload_id,
            anomaly_file_path,
            required_columns=["amount", "is_anomaly", "gst_confidence"],
        )

        total_transactions = len(df)
        total_spend = float(df["amount"].sum())

        anomaly_count = int(df["is_anomaly"].sum())
        anomaly_rate = (
            anomaly_count / total_transactions
            if total_transactions else 0
        )

        avg_confidence = float(df["gst_confidence"].mean())

        # Calculate remaining queue by recreating the review engine's queue criteria
        queue_mask = (
            (df["is_anomaly"] == True)
            | (df["gst_confidence"] < settings.LOW_CONFIDENCE_THRESHOLD)
            | (df["gst_confidence_margin"] < settings.LOW_MARGIN_THRESHOLD)
        )
        
        reviewed_count = 0
        if "review_status" in df.columns:
            reviewed_count = int((df["review_status"] == "reviewed").sum())
            unreviewed_mask = df["review_status"].isna() | (df["review_status"] == "pending")
            queue_mask = queue_mask & unreviewed_mask

        pending_review_count = int(queue_mask.sum())

        result = {
            "total_transactions": total_transactions,
            "total_spend": total_spend,
            "anomaly_count": anomaly_count,
            "anomaly_rate": round(anomaly_rate, 4),
            "avg_confidence": round(avg_confidence, 4),
            "pending_review_count": pending_review_count,
            "reviewed_count": reviewed_count,
        }

        self.cache.set(upload_id, cache_key, result)
        return result

    # ======================================================
    # GST SLAB DISTRIBUTION
    # ======================================================

    def compute_slab_distribution(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str
    ) -> Dict[str, int]:

        cache_key = "slab_distribution"
        cached = self.cache.get(upload_id, cache_key)
        if cached:
            return cached

        df = self._load_dataset(upload_id, anomaly_file_path)

        distribution = (
            df["gst_slab_effective"]
            .value_counts()
            .sort_index()
            .to_dict()
        )

        result = {str(k): int(v) for k, v in distribution.items()}

        self.cache.set(upload_id, cache_key, result)
        return result

    # ======================================================
    # ANOMALY STATISTICS
    # ======================================================

    def compute_anomaly_statistics(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str
    ) -> Dict[str, Any]:

        cache_key = "anomaly_stats"
        cached = self.cache.get(upload_id, cache_key)
        if cached:
            return cached

        df = self._load_dataset(
            upload_id,
            anomaly_file_path,
            required_columns=["anomaly_score", "is_anomaly"],
        )

        avg_score = float(df["anomaly_score"].mean())

        high = int((df["anomaly_score"] >= 0.75).sum())
        medium = int(
            ((df["anomaly_score"] >= 0.50) &
             (df["anomaly_score"] < 0.75)).sum()
        )
        low = int(
            ((df["anomaly_score"] < 0.50) &
             (df["is_anomaly"] == True)).sum()
        )

        result = {
            "avg_anomaly_score": round(avg_score, 4),
            "high_severity": high,
            "medium_severity": medium,
            "low_severity": low,
        }

        self.cache.set(upload_id, cache_key, result)
        return result

    # ======================================================
    # MONTHLY AGGREGATION
    # ======================================================

    def compute_monthly_trends(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str
    ) -> List[Dict[str, Any]]:

        cache_key = "monthly_trends"
        cached = self.cache.get(upload_id, cache_key)
        if cached:
            return cached

        df = self._load_dataset(
            upload_id,
            anomaly_file_path,
            required_columns=["amount", "is_anomaly"],
        )

        date_col = self.csv_reader.detect_date_column(df)

        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
        df = df.dropna(subset=[date_col])

        df["_month"] = df[date_col].dt.to_period("M")

        grouped = df.groupby("_month").agg({
            "amount": "sum",
            "is_anomaly": "sum"
        }).reset_index()

        result = [
            {
                "month": str(row["_month"]),
                "total_spend": float(row["amount"]),
                "anomaly_count": int(row["is_anomaly"]),
            }
            for _, row in grouped.iterrows()
        ]

        self.cache.set(upload_id, cache_key, result)
        return result

    # ======================================================
    # SLAB-WISE SPEND
    # ======================================================

    def compute_slab_wise_spend(
        self,
        upload_id: uuid.UUID,
        anomaly_file_path: str
    ) -> Dict[str, float]:

        cache_key = "slab_wise_spend"
        cached = self.cache.get(upload_id, cache_key)
        if cached:
            return cached

        df = self._load_dataset(
            upload_id,
            anomaly_file_path,
            required_columns=["amount"],
        )

        grouped = df.groupby("gst_slab_effective")["amount"].sum()

        result = {
            str(k): float(v)
            for k, v in grouped.to_dict().items()
        }

        self.cache.set(upload_id, cache_key, result)
        return result