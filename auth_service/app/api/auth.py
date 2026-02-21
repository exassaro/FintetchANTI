# app/api/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.password import hash_password, verify_password
from app.services.jwt_handler import create_access_token
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ======================================================
# POST /auth/login
# ======================================================

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Validate credentials and return a JWT access token.
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "is_admin": user.is_admin,
    })

    return TokenResponse(access_token=token)


# ======================================================
# POST /auth/register  (Admin-only)
# ======================================================

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Create a new user. Only accessible by admins.
    """
    # Check for existing user
    existing = db.query(User).filter(
        (User.email == payload.email) | (User.username == payload.username)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or username already exists",
        )

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=user.created_at,
    )


# ======================================================
# GET /auth/me
# ======================================================

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Return profile of the currently authenticated user.
    """
    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        created_at=current_user.created_at,
    )
