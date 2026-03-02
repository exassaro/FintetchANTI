"""
Pydantic schemas for the Retraining Service API.

Defines request and response models for retraining triggers,
job status queries, and job listings.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, List
from uuid import UUID
from datetime import datetime


class RetrainingTrigger(BaseModel):
    """Request schema to trigger a retraining job.

    Attributes:
        schema_type: Target schema ('A', 'B', 'C', 'D', or 'ALL').
        triggered_by: Identifier of the trigger source (default: 'manual').
    """

    schema_type: str  # Can be 'A', 'B', 'C', 'D', or 'ALL'
    triggered_by: str = "manual"


class RetrainingResponse(BaseModel):
    """Response schema after triggering retraining.

    Attributes:
        message: Human-readable summary.
        job_ids: List of created/existing job UUIDs.
    """

    model_config = ConfigDict(from_attributes=True)

    message: str
    job_ids: List[UUID]


class RetrainingStatusResponse(BaseModel):
    """Detailed status of a single retraining job.

    Includes evaluation metrics, model versions, and error details.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    schema_type: str
    status: str
    promoted: bool
    evaluation_metrics: Optional[Dict] = None
    old_model_version: Optional[str] = None
    new_model_version: Optional[str] = None
    error_message: Optional[str] = None
    triggered_by: Optional[str] = None
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class RetrainingJobList(BaseModel):
    """Paginated list of retraining jobs.

    Attributes:
        jobs: List of job status records.
        total: Total count of matching jobs.
    """

    jobs: List[RetrainingStatusResponse]
    total: int