"""
Configuration module for the GST Classification Service.

Loads environment variables for database, MLflow, HSN lookup,
storage paths, and the model feature contract.
"""

import os
from pathlib import Path
from urllib.request import pathname2url
from dotenv import load_dotenv

# ==========================================================
# Load Environment Variables
# ==========================================================
load_dotenv()


def _build_mlflow_file_uri(base_path: str, subdir: str) -> str:
    """Build a correct file:// URI for MLflow on any OS.

    - Linux  : base_path = /models      -> file:///models/<subdir>/mlruns
    - Windows: base_path = C:/Users/...  -> file:///C:/Users/.../<subdir>/mlruns
    """
    full = str(Path(base_path) / subdir / "mlruns")
    return "file://" + pathname2url(full)


# ==========================================================
# DATABASE CONFIGURATION
# ==========================================================
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environment")


# ==========================================================
# MLFLOW CONFIGURATION
# ==========================================================
MLFLOW_BASE_PATH = os.getenv("MLFLOW_BASE_PATH")

if not MLFLOW_BASE_PATH:
    raise ValueError("MLFLOW_BASE_PATH is not set in environment")


SCHEMA_MLFLOW_URIS = {
    "A": _build_mlflow_file_uri(MLFLOW_BASE_PATH, "desc_cat_vend"),
    "B": _build_mlflow_file_uri(MLFLOW_BASE_PATH, "desc_cat"),
    "C": _build_mlflow_file_uri(MLFLOW_BASE_PATH, "desc_vend"),
    "D": _build_mlflow_file_uri(MLFLOW_BASE_PATH, "desc"),
}


SCHEMA_MODEL_NAMES = {
    "A": "gst_classifier_desc_cat_vend",
    "B": "gst_classifier_desc_cat",
    "C": "gst_classifier_desc_vend",
    "D": "gst_classifier_desc",
}


# ==========================================================
# HSN / SAC RULE ENGINE CONFIG
# ==========================================================
HSN_LOOKUP_PATH = os.getenv("HSN_LOOKUP_PATH")

if not HSN_LOOKUP_PATH:
    raise ValueError("HSN_LOOKUP_PATH is not set in environment")


# ==========================================================
# RAW and classified paths
# ==========================================================

RAW_STORAGE = os.getenv("RAW_STORAGE")
CLASSIFIED_STORAGE = os.getenv("CLASSIFIED_STORAGE")


# ==========================================================
# MODEL FEATURE CONTRACT (DO NOT MOVE TO ENV)
# These are part of training schema contract
# ==========================================================
TEXT_FEATURE = "text_input_clean"

NUMERIC_FEATURES = [
    "amount",
    "log_amount",
    "amount_zscore",
    "amount_percentile",
]