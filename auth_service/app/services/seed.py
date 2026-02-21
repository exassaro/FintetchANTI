# app/services/seed.py

import logging
from sqlalchemy.orm import Session

from app.db.models import User
from app.services.password import hash_password
from app.config import settings

logger = logging.getLogger("auth_service")


def seed_admin(db: Session) -> None:
    """
    Create a default admin user if no users exist in the database.
    Credentials are sourced from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
    """
    user_count = db.query(User).count()

    if user_count > 0:
        logger.info(f"Database already has {user_count} user(s). Skipping admin seed.")
        return

    admin = User(
        username="admin",
        email=settings.ADMIN_EMAIL,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        is_active=True,
        is_admin=True,
    )

    db.add(admin)
    db.commit()
    logger.info(f"✅ Seeded default admin user: {settings.ADMIN_EMAIL}")
