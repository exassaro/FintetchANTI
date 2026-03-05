"""
Pydantic schemas for the Auth Service API.

Defines request models for login and registration, and response
models for JWT tokens and user profiles.
"""

from pydantic import BaseModel
from datetime import datetime


# ── Request Schemas ──────────────────────────────────


class LoginRequest(BaseModel):
    """Schema for user login credentials.

    Attributes:
        email: User's email address.
        password: User's plaintext password.
    """

    email: str
    password: str


class RegisterRequest(BaseModel):
    """Schema for user registration.

    Attributes:
        username: Desired username.
        email: User's email address.
        password: Plaintext password to be hashed.
        is_admin: Whether the new user should have admin privileges.
    """

    username: str
    email: str
    password: str
    is_admin: bool = False


# ── Response Schemas ─────────────────────────────────


class TokenResponse(BaseModel):
    """Schema for JWT token responses.

    Attributes:
        access_token: The signed JWT string.
        token_type: Token type (always 'bearer').
    """

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Schema for user profile responses.

    Attributes:
        id: User UUID.
        username: Display name.
        email: Email address.
        is_active: Whether the account is active.
        is_admin: Whether the user has admin privileges.
        created_at: Account creation timestamp.
    """

    id: str
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        """Pydantic config for ORM mode."""

        from_attributes = True
