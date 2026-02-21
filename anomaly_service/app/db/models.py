import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey, DateTime, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class AnomalyRun(Base):
    __tablename__ = "anomaly_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    upload_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )

    schema_type = Column(String(10), nullable=False)
    status = Column(String(50), nullable=False)

    classified_file_path = Column(Text, nullable=False)
    anomaly_file_path = Column(Text)

    total_records = Column(Integer)
    anomaly_count = Column(Integer)
    avg_anomaly_score = Column(Float)
    
    threshold_used = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)
    
    
class AnomalyRecord(Base):
    __tablename__ = "anomaly_records"

    id = Column(UUID(as_uuid=True),
                primary_key=True,
                default=uuid.uuid4)

    anomaly_run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anomaly_runs.id"),
        nullable=False,
        index=True
    )

    row_index = Column(Integer, nullable=False)

    transaction_id = Column(String, nullable=True)

    numeric_score = Column(Float, nullable=True)
    nlp_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)

    anomaly_score = Column(Float, nullable=False)
    is_anomaly = Column(Boolean, nullable=False)

    anomaly_reasons = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# Useful index for dashboard queries
Index(
    "idx_anomaly_records_run_anomaly",
    AnomalyRecord.anomaly_run_id,
    AnomalyRecord.is_anomaly
)


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(UUID(as_uuid=True), primary_key=True)
    original_filename = Column(String)
    schema_type = Column(String)
    status = Column(String)
    raw_file_path = Column(Text)
    classified_file_path = Column(Text)