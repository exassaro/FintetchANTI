"""
Configuration for the Auth Service.

Uses pydantic-settings to load environment variables with sensible
defaults for JWT signing and the initial admin seed credentials.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Auth service settings loaded from environment variables.

    Attributes:
        DATABASE_URL: PostgreSQL connection string.
        JWT_SECRET_KEY: Secret key for signing JWT tokens.
        JWT_ALGORITHM: Signing algorithm (default HS256).
        ACCESS_TOKEN_EXPIRE_MINUTES: Token expiry in minutes.
        ADMIN_EMAIL: Default admin email for seeding.
        ADMIN_PASSWORD: Default admin password for seeding.
    """
    DATABASE_URL: str

    JWT_SECRET_KEY: str = "f1nt3ch-ant1-s3cr3t-k3y-2026-pr0duct10n"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    ADMIN_EMAIL: str = "warrenbuff@gmail.com"
    ADMIN_PASSWORD: str = "warreN$2024"

    class Config:
        env_file = ".env"


settings = Settings()
