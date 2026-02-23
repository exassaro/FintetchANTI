from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.core.logging import setup_logging

from app.db.base import Base
from app.db.session import engine
from app.api import forecast, review, dashboard, time_series, kpi, chatbot, distribution, news

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GST Analytics Service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-create tables on startup (replace with Alembic for production)
Base.metadata.create_all(bind=engine)

app.include_router(forecast.router)
app.include_router(review.router)
app.include_router(dashboard.router)
app.include_router(time_series.router)
app.include_router(kpi.router)
app.include_router(chatbot.router)
app.include_router(distribution.router)
app.include_router(news.router)

@app.get("/health")
def health():
    return {"status": "ok"}
