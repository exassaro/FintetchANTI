"""API routes for the GST Classification Service.

Exposes the upload endpoint that processes CSV files through
column normalisation, schema detection, preprocessing, and
classification; and a status endpoint for tracking uploads.
"""

import logging
import os
import uuid

import pandas as pd

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.db.models import Upload, ClassificationRun

from app.services.column_normalizer import normalize_columns
from app.services.schema_detector import detect_schema
from app.services.preprocessing import preprocess
from app.services.classifier import classify
from app.services.hsn_classifier import DataValidationError
from app.services.model_loader import get_model_metadata
from app.utils.file_namer import generate_filename

from app.core.constants import (
    STATUS_UPLOADED,
    STATUS_PROCESSING,
    STATUS_CLASSIFIED,
    STATUS_FAILED,
)

from app.core.config import RAW_STORAGE, CLASSIFIED_STORAGE


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/classify", tags=["Classification"])




# ==========================================================
# Upload & Classification Endpoint
# ==========================================================

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a CSV file and run the full classification pipeline.

    Steps:
        1. Save raw file to storage.
        2. Normalise column names to canonical roles.
        3. Detect schema (A–E, H).
        4. Preprocess features.
        5. Classify using ML model or HSN rule engine.
        6. Save classified output and record metadata.

    Args:
        file: Uploaded CSV file.
        db: Database session (injected via ``Depends``).

    Returns:
        dict: upload_id, schema, rows_processed, and status.

    Raises:
        HTTPException: 400 on validation errors, 500 on unexpected failures.
    """
    upload_id = uuid.uuid4()

    # Generate RAW filename first
    raw_filename = generate_filename(
        file.filename,
        "PENDING",
        upload_id,
        "raw"
    )

    raw_path = os.path.join(RAW_STORAGE, raw_filename)

    # Save Raw File
    try:
        content = await file.read()
        with open(raw_path, "wb") as f:
            f.write(content)
    except Exception as exc:
        logger.error(f"Failed to save uploaded file: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save uploaded file: {exc}"
        )

    # Insert Upload Record
    upload_record = Upload(
        id=upload_id,
        original_filename=file.filename,
        schema_type="PENDING",
        status=STATUS_UPLOADED,
        raw_file_path=raw_path,
    )

    db.add(upload_record)
    db.commit()

    try:
        # Load CSV
        df = pd.read_csv(raw_path)

        # Normalize Columns
        df, metadata = normalize_columns(df)

        if metadata["needs_review"]:
            upload_record.status = STATUS_FAILED
            db.commit()

            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Column ambiguity detected",
                    "metadata": metadata
                }
            )

        # Detect Schema (NOW df exists)
        schema = detect_schema(set(df.columns))

        upload_record.schema_type = schema
        upload_record.status = STATUS_PROCESSING
        db.commit()

        # Generate classified filename AFTER schema detection
        classified_filename = generate_filename(
            file.filename,
            schema,
            upload_id,
            "classified"
        )

        classified_path = os.path.join(CLASSIFIED_STORAGE, classified_filename)

        # Preprocess
        df_processed = preprocess(df, schema)

        # Classify
        df_classified = classify(df_processed, schema)

        # Model Metadata
        if schema == "H":
            model_meta = {
                "model_name": "HSN_RULE_ENGINE",
                "model_version": "N/A"
            }
        else:
            model_meta = get_model_metadata(schema)

        avg_conf = float(df_classified["gst_confidence"].mean())

        # Save Classified Output
        df_classified.to_csv(classified_path, index=False)

        upload_record.classified_file_path = classified_path
        upload_record.status = STATUS_CLASSIFIED

        run = ClassificationRun(
            upload_id=upload_id,
            schema_type=schema,
            model_name=model_meta["model_name"],
            model_version=model_meta["model_version"],
            total_rows=len(df_classified),
            avg_confidence=avg_conf,
        )

        db.add(run)
        db.commit()

        return {
            "upload_id": str(upload_id),
            "schema": schema,
            "rows_processed": len(df_classified),
            "status": STATUS_CLASSIFIED
        }

    except HTTPException:
        raise

    except DataValidationError as e:
        logger.warning(f"Classification validation error: {e}")
        upload_record.status = STATUS_FAILED
        db.commit()

        raise HTTPException(
            status_code=400,
            detail=f"Classification failed: {e}"
        )

    except Exception as exc:
        logger.error(f"Classification completely failed due to an unexpected error: {exc}", exc_info=True)
        upload_record.status = STATUS_FAILED
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=f"Classification failed: {exc}"
        )

# ==========================================================
# Status Endpoint
# ==========================================================

@router.get("/status/{upload_id}")
def get_status(upload_id: str, db: Session = Depends(get_db)):
    """Retrieve the classification status of an upload.

    Args:
        upload_id: UUID string of the upload.
        db: Database session (injected via ``Depends``).

    Returns:
        dict: upload_id, status, schema, and classified_file path.

    Raises:
        HTTPException: 400 on invalid UUID, 404 if not found.
    """

    try:
        uuid_obj = uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload_id format")

    upload = db.query(Upload).filter(Upload.id == uuid_obj).first()

    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    return {
        "upload_id": upload_id,
        "status": upload.status,
        "schema": upload.schema_type,
        "classified_file": upload.classified_file_path
    }