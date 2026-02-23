from pydantic_settings import BaseSettings


class Settings(BaseSettings):
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