"""
Demo account endpoints.

Account and session creation happen in Next.js (Better Auth owns the signed
session cookie). These routes only provision and report on demo state.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core import demo as demo_service
from app.core.logger import logger
from app.middleware.auth import get_current_user
from app.models.core import User

router = APIRouter()


@router.post("/provision", status_code=status.HTTP_200_OK)
def provision_demo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Turn the calling account into a demo account.

    Called by the Next.js /api/demo handler immediately after Better Auth
    creates the throwaway user. Refuses accounts that are not on the demo email
    domain, so a real user cannot downgrade themselves into a capped sandbox.
    """
    if not demo_service.is_demo_email(current_user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only demo accounts can be provisioned this way.",
        )

    try:
        record = demo_service.provision(db, current_user)
    except Exception as exc:
        db.rollback()
        logger.error(f"Demo provisioning failed for {current_user.email}: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Could not start the demo. Please try again.",
        )

    try:
        demo_service.purge_expired(db)
    except Exception as exc:
        logger.warning(f"Demo purge skipped: {exc}")

    return {
        "is_demo": True,
        "questions_used": record.questions_used,
        "question_limit": record.question_limit,
        "questions_remaining": record.questions_remaining,
        "expires_at": record.expires_at.isoformat(),
        "suggested_questions": demo_service.SUGGESTED_QUESTIONS,
    }


@router.get("/status", status_code=status.HTTP_200_OK)
def demo_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Report demo state for the signed-in user.

    Real accounts get `is_demo: false` rather than a 404, so the frontend can
    call this unconditionally on load.
    """
    record = demo_service.get_demo_session(db, current_user)

    if not record:
        return {"is_demo": False}

    return {
        "is_demo": True,
        "questions_used": record.questions_used,
        "question_limit": record.question_limit,
        "questions_remaining": record.questions_remaining,
        "expires_at": record.expires_at.isoformat(),
        "expired": record.is_expired,
        "suggested_questions": demo_service.SUGGESTED_QUESTIONS,
    }
