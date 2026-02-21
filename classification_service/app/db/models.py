import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    original_filename = Column(Text, nullable=False)
    schema_type = Column(String(10), nullable=False)
    status = Column(String(50), nullable=False)

    raw_file_path = Column(Text, nullable=False)
    classified_file_path = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    classification_runs = relationship(
        "ClassificationRun",
        back_populates="upload",
        cascade="all, delete-orphan"
    )


class ClassificationRun(Base):
    __tablename__ = "classification_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    upload_id = Column(
        UUID(as_uuid=True),
        ForeignKey("uploads.id"),
        nullable=False,
        index=True
    )

    schema_type = Column(String(10), nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)

    total_rows = Column(Integer, nullable=False)
    avg_confidence = Column(Float, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    upload = relationship(
        "Upload",
        back_populates="classification_runs"
    )