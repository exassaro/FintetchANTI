# GST Anomaly Detection Microservice

Production-grade anomaly detection microservice for GST classification platform.

## Features

- Per-upload anomaly detection
- Numeric anomaly (Isolation Forest + Autoencoder)
- NLP anomaly (SentenceTransformer + clustering + kNN)
- Confidence-based anomaly signal
- Adaptive thresholding
- PostgreSQL row-level persistence
- Clean FastAPI architecture

## Tech Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- SentenceTransformers
- Scikit-learn
- PyTorch

## Run Locally

```bash
uvicorn app.main:app --reload