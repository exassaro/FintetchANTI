import os
from dotenv import load_dotenv

# ==========================================================
# Load Environment Variables
# ==========================================================
load_dotenv()


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
    "A": f"sqlite:///{MLFLOW_BASE_PATH}/desc_cat_vend/mlflow.db",
    "B": f"sqlite:///{MLFLOW_BASE_PATH}/desc_cat/mlflow.db",
    "C": f"sqlite:///{MLFLOW_BASE_PATH}/desc_vend/mlflow.db",
    "D": f"sqlite:///{MLFLOW_BASE_PATH}/desc/mlflow.db",
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