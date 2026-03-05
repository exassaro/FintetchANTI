"""
Configuration module for the Retraining Service.

Loads environment variables for database, MLflow, feature contract,
storage paths, and scheduler settings. Mirrors the classification
service's MLflow/feature configuration exactly.
"""

import os
from pathlib import Path
from urllib.request import pathname2url
from dotenv import load_dotenv

load_dotenv()


def _build_mlflow_file_uri(base_path: str, subdir: str) -> str:
    """Build a correct file:// URI for MLflow on any OS.

    - Linux  : base_path = /models      -> file:///models/<subdir>/mlruns
    - Windows: base_path = C:/Users/...  -> file:///C:/Users/.../<subdir>/mlruns
    """
    full = str(Path(base_path) / subdir / "mlruns")
    return "file://" + pathname2url(full)


# ==========================================================
# DATABASE
# ==========================================================

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environment")


# ==========================================================
# MLFLOW CONFIGURATION (mirrors classification_service)
# ==========================================================

MLFLOW_BASE_PATH = os.getenv("MLFLOW_BASE_PATH")
if not MLFLOW_BASE_PATH:
    raise ValueError("MLFLOW_BASE_PATH is not set in environment")

# Per-schema MLflow tracking/registry URIs
# Must match classification_service/app/core/config.py exactly
SCHEMA_MLFLOW_URIS = {
    "A": _build_mlflow_file_uri(MLFLOW_BASE_PATH, "desc_cat_vend"),
    "B": _build_mlflow_file_uri(MLFLOW_BASE_PATH, "desc_cat"),
    "C": _build_mlflow_file_uri(MLFLOW_BASE_PATH, "desc_vend"),
    "D": _build_mlflow_file_uri(MLFLOW_BASE_PATH, "desc"),
}

# Per-schema model names in the MLflow registry
# Must match classification_service/app/core/config.py exactly
SCHEMA_MODEL_NAMES = {
    "A": "gst_classifier_desc_cat_vend",
    "B": "gst_classifier_desc_cat",
    "C": "gst_classifier_desc_vend",
    "D": "gst_classifier_desc",
}


# ==========================================================
# MODEL FEATURE CONTRACT (must match classification_service)
# ==========================================================

TEXT_FEATURE = "text_input_clean"

NUMERIC_FEATURES = [
    "amount",
    "log_amount",
    "amount_zscore",
    "amount_percentile",
]

LABEL_COLUMN = "gst_slab_predicted"


# ==========================================================
# STORAGE
# ==========================================================

STORAGE_PATH = os.getenv("STORAGE_PATH", "storage")


# ==========================================================
# SCHEDULER
# ==========================================================

ENABLE_SCHEDULER = os.getenv("ENABLE_SCHEDULER", "false").lower() == "true"