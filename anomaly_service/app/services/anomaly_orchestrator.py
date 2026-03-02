"""
Anomaly Detection Orchestrator.

Coordinates the full anomaly pipeline: loads the classified CSV,
runs numeric, text, and confidence detectors, combines scores with
adaptive thresholding, persists results to the database, and saves
the annotated CSV.
"""

import logging
import os

import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.config import ANOMALY_STORAGE_PATH
from app.core.constants import (
    STATUS_PROCESSING,
    STATUS_COMPLETED,
    STATUS_FAILED,
)
from app.db.models import AnomalyRun, AnomalyRecord, Upload
from app.services.numeric_detector import NumericDetector
from app.services.text_detector import TextDetector
from app.services.confidence_flagger import ConfidenceFlagger
from app.services.score_combiner import ScoreCombiner

logger = logging.getLogger(__name__)


def run_anomaly_pipeline(upload_id: str, db: Session) -> dict:
    """Execute the full anomaly detection pipeline for a given upload.

    Steps:
        1. Fetch the classified CSV from the uploads table.
        2. Run numeric, text, and confidence detectors.
        3. Combine scores using adaptive thresholding.
        4. Save annotated CSV and persist row-level records.
        5. Update run metadata with summary statistics.

    Args:
        upload_id: UUID string of the upload to process.
        db: Active SQLAlchemy session.

    Returns:
        dict: Summary containing status, total_records, anomaly_count,
              threshold_used, and avg_anomaly_score.

    Raises:
        ValueError: If run, upload, or file is missing.
        FileNotFoundError: If classified CSV is not on disk.
    """
    # Fetch anomaly run record
    run = db.query(AnomalyRun).filter_by(upload_id=upload_id).first()

    if not run:
        raise ValueError("AnomalyRun not found for upload_id")

    run.status = STATUS_PROCESSING
    db.commit()
    logger.info("Anomaly pipeline started for upload %s", upload_id)

    try:
        # Fetch Classified File Path from Upload table
        upload = db.query(Upload).filter_by(id=upload_id).first()

        if not upload:
            raise ValueError("Upload not found in classification records")

        classified_file = upload.classified_file_path

        if not classified_file:
            raise ValueError("classified_file_path is missing")

        if not os.path.exists(classified_file):
            raise FileNotFoundError(
                f"Classified file not found at {classified_file}"
            )

        df = pd.read_csv(classified_file)
        logger.info(
            "Loaded classified CSV with %d rows for upload %s",
            len(df),
            upload_id,
        )

        # Run Detectors
        numeric_detector = NumericDetector()
        text_detector = TextDetector()
        confidence_flagger = ConfidenceFlagger()

        numeric_score, numeric_reasons = numeric_detector.run(df)
        nlp_score, nlp_reasons = text_detector.run(df)
        confidence_score, confidence_reasons = confidence_flagger.run(df)

        logger.info("All detectors completed for upload %s", upload_id)

        # Combine Scores (Adaptive Threshold inside)
        combiner = ScoreCombiner()

        result_df = combiner.combine(
            numeric_score=numeric_score,
            nlp_score=nlp_score,
            confidence_score=confidence_score,
            numeric_reasons=numeric_reasons,
            nlp_reasons=nlp_reasons,
            confidence_reasons=confidence_reasons,
        )

        # Attach Results to DataFrame
        df["numeric_score"] = numeric_score
        df["nlp_score"] = nlp_score
        df["confidence_score"] = confidence_score
        df["anomaly_score"] = result_df["anomaly_score"]

        # If the user uploaded a CSV with a ground-truth 'is_anomaly' column,
        # respect their labels (useful for testing/capstone datasets).
        if "is_anomaly" in df.columns:
            # Safely cast user labels to boolean
            df["is_anomaly"] = df["is_anomaly"].apply(
                lambda x: (
                    str(x).strip().lower() == "true"
                    if isinstance(x, str)
                    else bool(x)
                )
            )
            df["anomaly_reasons"] = df.apply(
                lambda r: (
                    result_df["anomaly_reasons"].iloc[r.name]
                    if r["is_anomaly"]
                    else "none"
                ),
                axis=1,
            )
        else:
            df["is_anomaly"] = result_df["is_anomaly"]
            df["anomaly_reasons"] = result_df["anomaly_reasons"]

        threshold_used = result_df["adaptive_threshold_used"].iloc[0]

        # Save Anomaly CSV
        os.makedirs(ANOMALY_STORAGE_PATH, exist_ok=True)

        anomaly_file_path = os.path.join(
            ANOMALY_STORAGE_PATH,
            f"{upload_id}_anomaly.csv",
        )

        df.to_csv(anomaly_file_path, index=False)
        logger.info("Saved anomaly CSV to %s", anomaly_file_path)

        # Clear Existing Records (If Re-run)
        db.query(AnomalyRecord).filter_by(anomaly_run_id=run.id).delete()
        db.commit()

        # Insert Row-Level Records
        insert_anomaly_records(db, run.id, df)

        # Update Run Metadata
        run.anomaly_file_path = anomaly_file_path
        run.total_records = len(df)

        # Safe cast in case is_anomaly is stored as string
        is_anomaly_bool = df["is_anomaly"].apply(
            lambda x: (
                str(x).strip().lower() == "true"
                if isinstance(x, str)
                else bool(x)
            )
        )
        run.anomaly_count = int(is_anomaly_bool.sum())
        run.avg_anomaly_score = float(
            df["anomaly_score"].astype(float).mean()
        )
        run.threshold_used = float(threshold_used)

        run.status = STATUS_COMPLETED
        run.completed_at = datetime.utcnow()

        db.commit()

        logger.info(
            "Anomaly pipeline completed for upload %s — "
            "%d anomalies out of %d records (threshold=%.4f)",
            upload_id,
            run.anomaly_count,
            run.total_records,
            run.threshold_used,
        )

        # Return Summary
        return {
            "status": STATUS_COMPLETED,
            "total_records": run.total_records,
            "anomaly_count": run.anomaly_count,
            "threshold_used": threshold_used,
            "avg_anomaly_score": run.avg_anomaly_score,
        }

    except Exception as exc:
        logger.error(
            "Anomaly pipeline failed for upload %s: %s",
            upload_id,
            exc,
            exc_info=True,
        )
        run.status = STATUS_FAILED
        db.commit()
        raise


def insert_anomaly_records(
    db: Session,
    run_id,
    df: pd.DataFrame,
    batch_size: int = 5000,
) -> None:
    """Batch-insert row-level anomaly records into the database.

    Args:
        db: Active SQLAlchemy session.
        run_id: UUID of the parent AnomalyRun.
        df: DataFrame containing anomaly results.
        batch_size: Number of records per batch commit. Defaults to 5000.
    """
    records = []

    for idx, row in df.iterrows():
        record = AnomalyRecord(
            anomaly_run_id=run_id,
            row_index=int(idx),
            transaction_id=row.get("transaction_id"),
            numeric_score=float(row.get("numeric_score", 0.0)),
            nlp_score=float(row.get("nlp_score", 0.0)),
            confidence_score=float(row.get("confidence_score", 0.0)),
            anomaly_score=float(row["anomaly_score"]),
            is_anomaly=bool(
                str(row["is_anomaly"]).strip().lower() == "true"
                if isinstance(row["is_anomaly"], str)
                else bool(row["is_anomaly"])
            ),
            anomaly_reasons=row.get("anomaly_reasons", "none"),
        )

        records.append(record)

        if len(records) >= batch_size:
            db.bulk_save_objects(records)
            db.commit()
            records = []

    if records:
        db.bulk_save_objects(records)
        db.commit()

    logger.info("Inserted %d anomaly records for run %s", len(df), run_id)