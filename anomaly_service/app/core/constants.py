"""
Constants for the Anomaly Detection Service.

Defines canonical status values used throughout the anomaly pipeline
to ensure consistency across API routes, services, and database models.
"""

STATUS_PENDING = "pending"
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"