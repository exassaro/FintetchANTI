# app/db/models.py

import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    Integer,
    Float,
    Text,
    TIMESTAMP,
    Index,
    Column,
    DateTime,
    
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base



class AnomalyRun(Base):
    __tablename__ = "anomaly_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    upload_id = Column(UUID(as_uuid=True), nullable=False)

    schema_type = Column(String)
    status = Column(String)

    classified_file_path = Column(String)
    anomaly_file_path = Column(String)

    total_records = Column(Integer)
    anomaly_count = Column(Integer)
    avg_anomaly_score = Column(Float)

    created_at = Column(DateTime)
    completed_at = Column(DateTime)

    threshold_used = Column(Float)


# ==========================================================
# REVIEW DECISIONS TABLE
# ==========================================================

class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    # Primary Key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Linking
    upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )

    anomaly_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )

    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_id: Mapped[str | None] = mapped_column(String, nullable=True)

    # Original Prediction Snapshot (Audit Safety)
    original_gst_slab: Mapped[int] = mapped_column(Integer, nullable=False)
    original_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Human Correction
    corrected_gst_slab: Mapped[int | None] = mapped_column(Integer, nullable=True)

    review_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending"
        # allowed: pending | reviewed | false_positive
    )

    reviewer_id: Mapped[str] = mapped_column(String(100), nullable=False)

    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    __table_args__ = (
        Index("idx_review_upload_status", "upload_id", "review_status"),
        Index("idx_review_anomaly_status", "anomaly_run_id", "review_status"),
    )


# ==========================================================
# LLM EXPLANATIONS TABLE
# ==========================================================

class LLMExplanation(Base):
    __tablename__ = "llm_explanations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )

    transaction_id: Mapped[str] = mapped_column(String, nullable=False)

    row_index: Mapped[int] = mapped_column(Integer, nullable=False)

    prompt_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False
    )

    explanation_text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    __table_args__ = (
        Index("idx_explanation_lookup", "upload_id", "transaction_id"),
    )