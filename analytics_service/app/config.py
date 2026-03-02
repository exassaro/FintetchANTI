"""
Configuration for the Analytics Service.

Uses pydantic-settings to load environment variables for database,
review storage, confidence thresholds, and news API keys.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Analytics service settings loaded from environment variables.

    Attributes:
        DATABASE_URL: PostgreSQL connection string.
        REVIEW_STORAGE_PATH: Path to store reviewed CSV files.
        LOW_CONFIDENCE_THRESHOLD: Threshold for flagging low confidence.
        LOW_MARGIN_THRESHOLD: Threshold for flagging low margin.
    """
    DATABASE_URL: str

    REVIEW_STORAGE_PATH: str

    LOW_CONFIDENCE_THRESHOLD: float = 0.75
    LOW_MARGIN_THRESHOLD: float = 0.10

    # News APIs
    NEWS_API_KEY: str | None = None
    NEWSDATA_API_KEY: str | None = None
    MEDIASTACK_API_KEY: str | None = None

    class Config:
        env_file = ".env"


settings = Settings()