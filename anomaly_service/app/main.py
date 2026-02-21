from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import setup_logging
from app.db.base import Base
from app.db.session import engine
from app.api.routes import router
from app.db import models  # IMPORTANT for table registration

setup_logging()

app = FastAPI(
    title="GST Anomaly Detection Service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)

app.include_router(router)

@app.get("/")
def root():
    return {"service": "Anomaly Detection Service"}

@app.get("/health")
def health():
    return {"status": "ok"}