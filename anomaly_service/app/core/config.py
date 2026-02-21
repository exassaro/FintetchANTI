import os
from dotenv import load_dotenv

load_dotenv()

# ==========================
# DATABASE
# ==========================
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set")

# ==========================
# STORAGE
# ==========================
CLASSIFIED_STORAGE_PATH = os.getenv("CLASSIFIED_STORAGE_PATH")
if not CLASSIFIED_STORAGE_PATH:
    raise ValueError("CLASSIFIED_STORAGE_PATH not set")

ANOMALY_STORAGE_PATH = os.getenv("ANOMALY_STORAGE_PATH")
if not ANOMALY_STORAGE_PATH:
    raise ValueError("ANOMALY_STORAGE_PATH not set")