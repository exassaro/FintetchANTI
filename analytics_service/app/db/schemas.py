# app/db/schemas.py

from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime


# ==========================================================
# REVIEW SCHEMAS
# ==========================================================

class ReviewDecisionCreate(BaseModel):
    row_index: int
    decision: str
    rationale: Optional[str] = None
    corrected_gst_slab: Optional[int] = None


class ReviewDecisionResponse(BaseModel):
    id: UUID
    upload_id: UUID
    row_index: int
    review_status: str
    corrected_gst_slab: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================================
# LLM EXPLANATION SCHEMAS
# ==========================================================

class LLMExplanationResponse(BaseModel):
    id: UUID
    upload_id: UUID
    transaction_id: str
    explanation_text: str
    model_name: str
    created_at: datetime

    class Config:
        from_attributes = True