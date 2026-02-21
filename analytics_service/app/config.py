from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    REVIEW_STORAGE_PATH: str

    LOW_CONFIDENCE_THRESHOLD: float = 0.75
    LOW_MARGIN_THRESHOLD: float = 0.10

    class Config:
        env_file = ".env"


settings = Settings()