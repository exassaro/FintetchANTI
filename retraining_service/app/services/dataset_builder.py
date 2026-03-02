"""
Dataset Builder for Retraining Service.

Aggregates classified CSVs for the given schema and applies
human corrections from the review_decisions table.

Column references:
  - uploads.classified_file_path, uploads.schema_type, uploads.status
  - review_decisions.upload_id, review_decisions.row_index,
    review_decisions.corrected_gst_slab, review_decisions.review_status
  - Classified CSV columns: gst_slab_predicted, text_input_clean,
    amount, log_amount, amount_zscore, amount_percentile
"""

import os
import logging

import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import STORAGE_PATH

logger = logging.getLogger(__name__)


def build_dataset(schema_type: str, db: Session) -> pd.DataFrame:
    """
    Build a training dataset for the given schema.

    1. Fetch all classified CSV paths for the schema.
    2. Load and concatenate them.
    3. Fetch human corrections (reviewed or false_positive).
    4. Override predicted labels where a correction exists.
    5. Save snapshot and return.
    """

    # ----------------------------------------------------------
    # 1) Fetch classified file paths from the uploads table
    # ----------------------------------------------------------
    rows = db.execute(
        text("""
            SELECT id, classified_file_path
            FROM uploads
            WHERE schema_type = :schema
            AND status = 'CLASSIFIED'
            AND classified_file_path IS NOT NULL
        """),
        {"schema": schema_type},
    ).fetchall()

    if not rows:
        raise ValueError(
            f"No classified uploads found for schema '{schema_type}'"
        )

    # ----------------------------------------------------------
    # 2) Load and concatenate all classified CSVs
    # ----------------------------------------------------------
    all_frames = []

    for upload_id, file_path in rows:
        if not os.path.exists(file_path):
            logger.warning(f"Classified file not found, skipping: {file_path}")
            continue

        df = pd.read_csv(file_path)
        df["_upload_id"] = str(upload_id)
        all_frames.append(df)

    if not all_frames:
        raise ValueError(
            f"No classified CSV files exist on disk for schema '{schema_type}'"
        )

    dataset = pd.concat(all_frames, ignore_index=True)
    
    initial_len = len(dataset)
    # Remove exact duplicate rows (same text and same amount)
    dataset.drop_duplicates(
        subset=["text_input_clean", "amount"], 
        keep="last", 
        inplace=True
    )
    dataset.reset_index(drop=True, inplace=True)
    
    # Cap size to reduce training time on massive historical datasets
    MAX_SAMPLES = 50000
    if len(dataset) > MAX_SAMPLES:
         dataset = dataset.sample(n=MAX_SAMPLES, random_state=42).reset_index(drop=True)

    logger.info(
        f"Loaded {initial_len} rows from {len(all_frames)} classified files. "
        f"After removing duplicates and sampling, {len(dataset)} unique rows remain for schema {schema_type}."
    )

    # ----------------------------------------------------------
    # 3) Fetch human corrections from review_decisions
    #    review_decisions does NOT have schema_type;
    #    we filter by matching upload_ids for this schema.
    # ----------------------------------------------------------
    upload_ids = [str(uid) for uid, _ in rows]

    corrections = db.execute(
        text("""
            SELECT upload_id :: TEXT,
                   row_index,
                   corrected_gst_slab
            FROM review_decisions
            WHERE upload_id = ANY(:upload_ids :: UUID[])
            AND   review_status IN ('reviewed', 'false_positive')
            AND   corrected_gst_slab IS NOT NULL
        """),
        {"upload_ids": upload_ids},
    ).fetchall()

    logger.info(f"Found {len(corrections)} human corrections for schema {schema_type}")

    # ----------------------------------------------------------
    # 4) Build correction lookup and override labels
    # ----------------------------------------------------------
    corrections_map = {
        (str(c[0]), int(c[1])): int(c[2])
        for c in corrections
    }

    if "gst_slab_predicted" not in dataset.columns:
        raise ValueError(
            "Classified CSV missing 'gst_slab_predicted' column. "
            "Cannot build training labels."
        )

    # Start from the ML prediction, override with human correction
    dataset["final_gst_slab"] = dataset.apply(
        lambda row: corrections_map.get(
            (str(row.get("_upload_id", "")), int(row.name)),
            row["gst_slab_predicted"],
        ),
        axis=1,
    )

    overridden = dataset["final_gst_slab"] != dataset["gst_slab_predicted"]
    logger.info(f"Applied {overridden.sum()} label overrides from human corrections")

    # ----------------------------------------------------------
    # 5) Save snapshot
    # ----------------------------------------------------------
    out_dir = os.path.join(STORAGE_PATH, "retraining_datasets")
    os.makedirs(out_dir, exist_ok=True)

    dataset_path = os.path.join(out_dir, f"{schema_type}_dataset.csv")
    dataset.to_csv(dataset_path, index=False)
    logger.info(f"Saved training snapshot to {dataset_path}")

    # Drop helper column
    dataset.drop(columns=["_upload_id"], inplace=True)

    return dataset