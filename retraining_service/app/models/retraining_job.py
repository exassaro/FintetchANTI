"""
SQLAlchemy model for retraining job records.

Tracks each retraining execution with status, metrics, model
versioning, and promotion results.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.database import Base


class RetrainingJob(Base):
    """Represents a single ML retraining job execution.

    Tracks lifecycle from pending → running → completed/failed,
    including evaluation metrics and model promotion results.
    """

    __tablename__ = "retraining_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schema_type = Column(String(10), nullable=False)
    status = Column(String(50), nullable=False)

    started_at = Column(TIMESTAMP)
    completed_at = Column(TIMESTAMP)

    old_model_version = Column(String(50))
    new_model_version = Column(String(50))
    evaluation_metrics = Column(JSONB)

    promoted = Column(Boolean, default=False)
    triggered_by = Column(String(100))

    error_message = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)