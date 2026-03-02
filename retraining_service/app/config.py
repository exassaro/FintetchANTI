import os
from dotenv import load_dotenv

load_dotenv()


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
    "A": f"sqlite:///{MLFLOW_BASE_PATH}/desc_cat_vend/mlflow.db",
    "B": f"sqlite:///{MLFLOW_BASE_PATH}/desc_cat/mlflow.db",
    "C": f"sqlite:///{MLFLOW_BASE_PATH}/desc_vend/mlflow.db",
    "D": f"sqlite:///{MLFLOW_BASE_PATH}/desc/mlflow.db",
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