# GST Classification Service

Production-grade FastAPI microservice for GST slab prediction.

## Features
- CSV upload
- Column normalization
- Schema detection
- MLflow model integration
- HSN/SAC rule engine
- Confidence scoring
- PostgreSQL metadata tracking

## Run Locally
uvicorn app.main:app --reload