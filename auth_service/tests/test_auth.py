"""
Unit tests for the Auth Service.

Covers JWT token handling, password hashing/verification,
Pydantic schemas, and configuration validation.
"""

from datetime import timedelta
from unittest.mock import patch

import pytest


# ---------------------------------------------------------------------------
# JWT Handler tests
# ---------------------------------------------------------------------------


class TestJWTHandler:
    """Tests for JWT token creation and decoding."""

    def test_create_and_decode_token(self):
        """Verify a created token can be decoded back to the same subject."""
        from app.services.jwt_handler import create_access_token, decode_access_token

        token = create_access_token({"sub": "test@example.com"})
        payload = decode_access_token(token)

        assert payload is not None
        assert payload["sub"] == "test@example.com"

    def test_token_with_custom_expiry(self):
        """Verify tokens with custom expiry are valid."""
        from app.services.jwt_handler import create_access_token, decode_access_token

        token = create_access_token(
            {"sub": "user@example.com"},
            expires_delta=timedelta(minutes=5),
        )
        payload = decode_access_token(token)

        assert payload is not None
        assert payload["sub"] == "user@example.com"

    def test_decode_invalid_token_returns_none(self):
        """Verify decoding an invalid token returns None."""
        from app.services.jwt_handler import decode_access_token

        result = decode_access_token("invalid.jwt.token")
        assert result is None

    def test_token_contains_expiry(self):
        """Verify the JWT payload contains an 'exp' claim."""
        from app.services.jwt_handler import create_access_token, decode_access_token

        token = create_access_token({"sub": "test@example.com"})
        payload = decode_access_token(token)

        assert "exp" in payload


# ---------------------------------------------------------------------------
# Password Hashing tests
# ---------------------------------------------------------------------------


class TestPasswordHashing:
    """Tests for bcrypt password hashing and verification."""

    def test_hash_and_verify_correct_password(self):
        """Verify a hashed password matches the original."""
        from app.services.password import hash_password, verify_password

        hashed = hash_password("StrongPassword123!")
        assert verify_password("StrongPassword123!", hashed) is True

    def test_verify_wrong_password(self):
        """Verify an incorrect password does not match."""
        from app.services.password import hash_password, verify_password

        hashed = hash_password("CorrectPassword")
        assert verify_password("WrongPassword", hashed) is False

    def test_different_hashes_for_same_password(self):
        """Verify that the same password produces different hashes (salting)."""
        from app.services.password import hash_password

        hash1 = hash_password("Test123!")
        hash2 = hash_password("Test123!")

        # Bcrypt generates different salts each time
        assert hash1 != hash2


# ---------------------------------------------------------------------------
# Schema tests
# ---------------------------------------------------------------------------


class TestAuthSchemas:
    """Tests for Pydantic auth schemas."""

    def test_user_login_schema(self):
        """Verify UserLogin schema accepts valid input."""
        from app.schemas import LoginRequest

        login = LoginRequest(email="test@example.com", password="pass123")
        assert login.email == "test@example.com"

    def test_user_register_schema(self):
        """Verify UserRegister schema with name field."""
        from app.schemas import RegisterRequest

        reg = RegisterRequest(
            email="new@example.com",
            password="secure123",
            username="Test User",
        )
        assert reg.username == "Test User"

    def test_token_response_schema(self):
        """Verify TokenResponse schema structure."""
        from app.schemas import TokenResponse

        resp = TokenResponse(
            access_token="abc.def.ghi",
            token_type="bearer",
        )
        assert resp.token_type == "bearer"


# ---------------------------------------------------------------------------
# Config tests
# ---------------------------------------------------------------------------


class TestAuthConfig:
    """Tests for auth configuration defaults."""

    def test_default_jwt_algorithm(self):
        """Verify default JWT algorithm is HS256."""
        from app.config import settings

        assert settings.JWT_ALGORITHM == "HS256"

    def test_default_token_expiry(self):
        """Verify default token expiry is set."""
        from app.config import settings

        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0
