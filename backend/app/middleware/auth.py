"""
Authentication & RBAC middleware for Intelliquery.

Validates Better Auth session tokens and enforces role-based access control.
Better Auth stores sessions in the `session` table with a `token` column.
The frontend sends either:
  - Cookie: `better-auth.session_token=<token>`
  - Header: `Authorization: Bearer <token>`
"""

from enum import IntEnum
from functools import wraps
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.core import User, Session as AuthSession
from app.core.logger import logger

from datetime import datetime, timezone


# ── Role Hierarchy (higher value = more permissions) ─────────────────────────

class Role(IntEnum):
    VIEWER = 0
    EDITOR = 1
    ADMIN = 2
    OWNER = 3


ROLE_MAP = {
    "viewer": Role.VIEWER,
    "editor": Role.EDITOR,
    "admin": Role.ADMIN,
    "owner": Role.OWNER,
}


# ── Extract session token from request ───────────────────────────────────────

def _extract_token(request: Request) -> Optional[str]:
    """
    Extract Better Auth session token from cookie or Authorization header.

    Better Auth cookie format: "{token}.{signature}"
    Only the token part (before the dot) is stored in the session table.
    """
    from urllib.parse import unquote

    # 1. Try cookie (Better Auth default)
    raw = request.cookies.get("better-auth.session_token")
    if raw:
        decoded = unquote(raw)          # URL-decode (%2B -> +, etc.)
        return decoded.split(".")[0]    # Take only the token ID part

    # 2. Try Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw = auth_header[7:].strip()
        return unquote(raw).split(".")[0]

    return None


# ── Core dependency: get current authenticated user ──────────────────────────

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that validates the session token and returns the
    authenticated User object. Raises 401 if invalid/expired.
    """
    token = _extract_token(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )

    # Look up the session in Better Auth's session table
    session = (
        db.query(AuthSession)
        .filter(AuthSession.token == token)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
        )

    # Check expiry
    if session.expiresAt and session.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please sign in again.",
        )

    # Fetch the user
    user = db.query(User).filter(User.id == session.userId).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )

    # Auto-assign default role if Better Auth created user without one
    if not user.role:
        user.role = "owner"   # First-time users get full access to their own data
        db.commit()
        logger.info(f"Auto-assigned role=owner to user {user.email}")

    logger.info(f"Authenticated user: {user.email} (role={user.role})")
    return user


# ── Role-based access control dependencies ───────────────────────────────────

def require_role(min_role: str):
    """
    Returns a FastAPI dependency that checks if the current user has
    at least the specified role level.

    Usage:
        @router.post("/admin-action")
        async def admin_action(user: User = Depends(require_role("admin"))):
            ...
    """
    min_level = ROLE_MAP.get(min_role, Role.VIEWER)

    async def _check_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_level = ROLE_MAP.get(current_user.role or "viewer", Role.VIEWER)

        if user_level < min_level:
            logger.warning(
                f"RBAC denied: user={current_user.email} "
                f"has role={current_user.role}, needs={min_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {min_role}",
            )

        return current_user

    return _check_role


# ── Convenience shortcuts ────────────────────────────────────────────────────

require_viewer = require_role("viewer")
require_editor = require_role("editor")
require_admin = require_role("admin")
require_owner = require_role("owner")
