from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, List
from uuid import UUID
from datetime import datetime


class RetrainingTrigger(BaseModel):
    schema_type: str  # Can be 'A', 'B', 'C', 'D', or 'ALL'
    triggered_by: str = "manual"


class RetrainingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message: str
    job_ids: List[UUID]


class RetrainingStatusResponse(BaseModel):
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
    jobs: List[RetrainingStatusResponse]
    total: int