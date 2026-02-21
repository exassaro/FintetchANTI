from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    JWT_SECRET_KEY: str = "f1nt3ch-ant1-s3cr3t-k3y-2026-pr0duct10n"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    ADMIN_EMAIL: str = "warrenbuff@gmail.com"
    ADMIN_PASSWORD: str = "warreN$2024"

    class Config:
        env_file = ".env"


settings = Settings()
