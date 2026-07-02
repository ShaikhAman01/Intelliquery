"""
Settings API — Profile, Organization, and Team management.
"""

import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.api.deps import get_db
from app.models.core import User, Organization, OrgInvite, DbConnection, QueryHistory, SavedSnippet
from app.middleware.auth import get_current_user, require_viewer, require_admin, require_owner
from app.core.config import settings
from app.core.emailer import send_email, team_invite_email
from app.core.logger import logger

router = APIRouter()


# ── Request schemas ──────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    name: str


class OrgCreate(BaseModel):
    name: str


class OrgUpdate(BaseModel):
    name: str


class TeamInvite(BaseModel):
    email: str
    role: str = "viewer"


class RoleUpdate(BaseModel):
    user_id: str
    role: str   # viewer, editor, admin


class InviteLink(BaseModel):
    role: str = "viewer"


VALID_ROLES = ["viewer", "editor", "admin"]

# Lifetime rename allowance per organization (enforced server-side)
MAX_ORG_RENAMES = 1


# ── Profile ──────────────────────────────────────────────────────────────────

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    """Return the current user's profile."""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role or "owner",
        "image": current_user.image,
        "org_id": current_user.org_id,
    }


@router.put("/profile")
def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's display name."""
    current_user.name = data.name
    current_user.updatedAt = datetime.utcnow()
    db.commit()
    logger.info(f"Profile updated for user {current_user.email}")
    return {
        "status": "success",
        "name": current_user.name,
    }


# ── Organization ─────────────────────────────────────────────────────────────

@router.post("/organization")
def create_organization(
    data: OrgCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new organization and make current user the owner."""
    if current_user.org_id:
        raise HTTPException(
            status_code=400,
            detail="You already belong to an organization. Leave it first.",
        )

    slug = data.name.lower().replace(" ", "-")

    # Check slug uniqueness
    existing = db.query(Organization).filter(Organization.slug == slug).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Organization slug '{slug}' already taken.")

    org = Organization(name=data.name, slug=slug)
    db.add(org)
    db.flush()

    # Assign user to org as owner
    current_user.org_id = org.id
    current_user.role = "owner"
    db.commit()

    logger.info(f"Organization '{data.name}' created by {current_user.email}")
    return {
        "status": "success",
        "org_id": org.id,
        "name": org.name,
        "slug": org.slug,
    }


@router.get("/organization")
def get_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's organization."""
    if not current_user.org_id:
        return {"org": None}

    org = db.query(Organization).filter(Organization.id == current_user.org_id).first()
    if not org:
        return {"org": None}

    # Count members
    member_count = db.query(User).filter(User.org_id == org.id).count()

    return {
        "org": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "member_count": member_count,
            "renames_used": org.rename_count or 0,
            "max_renames": MAX_ORG_RENAMES,
        }
    }


@router.put("/organization")
def update_organization(
    data: OrgUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update organization name. Requires admin role."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="You don't belong to an organization.")

    org = db.query(Organization).filter(Organization.id == current_user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    if (org.rename_count or 0) >= MAX_ORG_RENAMES:
        raise HTTPException(
            status_code=403,
            detail="Rename limit reached. Contact support to change your organization name.",
        )

    new_slug = data.name.lower().replace(" ", "-")
    taken = db.query(Organization).filter(
        Organization.slug == new_slug,
        Organization.id != org.id,
    ).first()
    if taken:
        raise HTTPException(status_code=400, detail=f"The name '{data.name}' is already taken.")

    org.name = data.name
    org.slug = new_slug
    org.rename_count = (org.rename_count or 0) + 1
    db.commit()

    logger.info(f"Organization renamed to '{data.name}' by {current_user.email}")
    return {
        "status": "success",
        "name": org.name,
        "slug": org.slug,
        "renames_used": org.rename_count,
        "max_renames": MAX_ORG_RENAMES,
    }


@router.delete("/organization")
def delete_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """Permanently delete the organization and everything scoped to it. Requires owner role."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="You don't belong to an organization.")

    org = db.query(Organization).filter(Organization.id == current_user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    org_id, org_name = org.id, org.name
    conn_ids = [c.id for c in db.query(DbConnection).filter(DbConnection.org_id == org_id).all()]

    # Order matters: history and snippets reference connections
    if conn_ids:
        db.query(QueryHistory).filter(QueryHistory.connection_id.in_(conn_ids)).delete(synchronize_session=False)
        db.query(SavedSnippet).filter(SavedSnippet.connection_id.in_(conn_ids)).delete(synchronize_session=False)
        db.query(DbConnection).filter(DbConnection.id.in_(conn_ids)).delete(synchronize_session=False)

    db.query(OrgInvite).filter(OrgInvite.org_id == org_id).delete(synchronize_session=False)

    # Release members back to personal workspaces
    db.query(User).filter(User.org_id == org_id).update(
        {User.org_id: None, User.role: "owner"}, synchronize_session=False
    )

    db.delete(org)
    db.commit()

    logger.info(f"Organization {org_id} ('{org_name}') deleted by {current_user.email}")
    return {"status": "success", "message": f"Organization '{org_name}' has been deleted."}


# ── Team ─────────────────────────────────────────────────────────────────────

@router.get("/team")
def list_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all members of the current user's organization."""
    if not current_user.org_id:
        return {"members": []}

    members = db.query(User).filter(User.org_id == current_user.org_id).all()
    return {
        "members": [
            {
                "id": m.id,
                "name": m.name,
                "email": m.email,
                "role": m.role or "viewer",
                "image": m.image,
            }
            for m in members
        ]
    }


@router.post("/team/invite")
def invite_team_member(
    data: TeamInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Email an invitation. The invitee does not need an account yet. Requires admin role."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="Create an organization first.")

    email = data.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {VALID_ROLES}")

    # If they already have an account, catch memberships early
    target_user = db.query(User).filter(User.email == email).first()
    if target_user:
        if target_user.org_id == current_user.org_id:
            raise HTTPException(status_code=400, detail="This user is already in your organization.")
        if target_user.org_id:
            raise HTTPException(status_code=400, detail="This user already belongs to another organization.")

    existing = db.query(OrgInvite).filter(
        OrgInvite.org_id == current_user.org_id,
        OrgInvite.status == "pending",
        OrgInvite.invitee_email == email,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="An invite is already pending for this email.")

    invite = OrgInvite(
        org_id=current_user.org_id,
        inviter_id=current_user.id,
        invitee_id=target_user.id if target_user else None,
        invitee_email=email,
        token=secrets.token_urlsafe(24),
        role=data.role,
    )
    db.add(invite)
    db.commit()

    org = db.query(Organization).filter(Organization.id == current_user.org_id).first()
    invite_url = f"{settings.FRONTEND_URL}/invite/{invite.token}"
    try:
        send_email(
            to=email,
            subject=f"{current_user.name or 'A teammate'} invited you to {org.name} on Intelliquery",
            html=team_invite_email(current_user.name or "A teammate", org.name, data.role, invite_url),
        )
    except Exception as e:
        db.delete(invite)
        db.commit()
        logger.error(f"Failed to send invite email to {email}: {e}")
        raise HTTPException(status_code=502, detail="Could not send the invite email. Please try again.")

    logger.info(f"Invite emailed to {email} for org {current_user.org_id} with role {data.role}")
    return {
        "status": "success",
        "message": f"Invite emailed to {email}. They'll join as {data.role} when they accept.",
    }


@router.post("/team/invite-link")
def create_invite_link(
    data: InviteLink,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create (or reuse) a shareable invite link with an explicit role. Requires admin role."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="Create an organization first.")

    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {VALID_ROLES}")

    # One reusable link per org+role — creating again returns the same link
    invite = db.query(OrgInvite).filter(
        OrgInvite.org_id == current_user.org_id,
        OrgInvite.status == "pending",
        OrgInvite.invitee_email.is_(None),
        OrgInvite.role == data.role,
        OrgInvite.token.isnot(None),
    ).first()

    if not invite:
        invite = OrgInvite(
            org_id=current_user.org_id,
            inviter_id=current_user.id,
            invitee_email=None,
            token=secrets.token_urlsafe(24),
            role=data.role,
        )
        db.add(invite)
        db.commit()
        logger.info(f"Invite link created for org {current_user.org_id} with role {data.role}")

    return {"status": "success", "url": f"{settings.FRONTEND_URL}/invite/{invite.token}", "role": invite.role}


@router.get("/team/invite-info/{token}")
def get_invite_info(
    token: str,
    db: Session = Depends(get_db),
):
    """Public invite details for the landing page. The token itself is the secret."""
    invite = db.query(OrgInvite).filter(
        OrgInvite.token == token,
        OrgInvite.status == "pending",
    ).first()

    if invite:
        org = db.query(Organization).filter(Organization.id == invite.org_id).first()
        inviter = db.query(User).filter(User.id == invite.inviter_id).first()
        return {
            "kind": "invite",
            "org_name": org.name if org else "Unknown",
            "inviter_name": inviter.name if inviter else None,
            "role": invite.role,
            "email": invite.invitee_email,  # None for shareable links
        }

    # Legacy links used the raw org slug
    org = db.query(Organization).filter(Organization.slug == token).first()
    if org:
        return {"kind": "org_link", "org_name": org.name, "inviter_name": None, "role": "viewer", "email": None}

    raise HTTPException(status_code=404, detail="This invitation link is invalid or has expired.")


@router.post("/team/invite/{token}/accept")
def accept_invite_by_token(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept an invitation link (email invite or shareable link)."""
    if current_user.org_id:
        raise HTTPException(status_code=400, detail="You already belong to an organization.")

    invite = db.query(OrgInvite).filter(
        OrgInvite.token == token,
        OrgInvite.status == "pending",
    ).first()

    if not invite:
        # Legacy org-slug links keep working
        org = db.query(Organization).filter(Organization.slug == token).first()
        if not org:
            raise HTTPException(status_code=404, detail="This invitation link is invalid or has expired.")
        current_user.org_id = org.id
        current_user.role = "viewer"
        db.commit()
        logger.info(f"User {current_user.email} joined org {org.id} via legacy slug link")
        return {"status": "success", "message": f"You've joined {org.name} as viewer."}

    if invite.invitee_email and invite.invitee_email != (current_user.email or "").lower():
        raise HTTPException(
            status_code=403,
            detail=f"This invitation was sent to {invite.invitee_email}. Sign in with that email to accept it.",
        )

    current_user.org_id = invite.org_id
    current_user.role = invite.role
    if invite.invitee_email:
        # Email invites are single-use; shareable links stay open
        invite.invitee_id = current_user.id
        invite.status = "accepted"
    db.commit()

    org = db.query(Organization).filter(Organization.id == invite.org_id).first()
    logger.info(f"User {current_user.email} accepted invite token to org {invite.org_id} as {invite.role}")
    return {
        "status": "success",
        "message": f"You've joined {org.name if org else 'the organization'} as {invite.role}.",
    }


@router.get("/team/invites")
def get_my_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all pending invitations for the current user."""
    # Match by id OR email so invites sent before signup auto-link to the new account
    invites = db.query(OrgInvite).filter(
        or_(
            OrgInvite.invitee_id == current_user.id,
            OrgInvite.invitee_email == (current_user.email or "").lower(),
        ),
        OrgInvite.status == "pending",
    ).all()

    result = []
    for inv in invites:
        org = db.query(Organization).filter(Organization.id == inv.org_id).first()
        inviter = db.query(User).filter(User.id == inv.inviter_id).first()
        result.append({
            "id": inv.id,
            "org_name": org.name if org else "Unknown",
            "org_slug": org.slug if org else "",
            "inviter_name": inviter.name if inviter else "Unknown",
            "inviter_email": inviter.email if inviter else "",
            "role": inv.role,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        })

    return {"invites": result}


@router.post("/team/invites/{invite_id}/accept")
def accept_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept an organization invitation."""
    invite = db.query(OrgInvite).filter(
        OrgInvite.id == invite_id,
        or_(
            OrgInvite.invitee_id == current_user.id,
            OrgInvite.invitee_email == (current_user.email or "").lower(),
        ),
        OrgInvite.status == "pending",
    ).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found or already handled.")

    if current_user.org_id:
        raise HTTPException(status_code=400, detail="You already belong to an organization.")

    # Join the organization
    current_user.org_id = invite.org_id
    current_user.role = invite.role
    invite.invitee_id = current_user.id
    invite.status = "accepted"
    db.commit()

    org = db.query(Organization).filter(Organization.id == invite.org_id).first()
    logger.info(f"User {current_user.email} accepted invite to org {invite.org_id}")
    return {
        "status": "success",
        "message": f"You have joined {org.name if org else 'the organization'} as {invite.role}.",
    }


@router.post("/team/invites/{invite_id}/decline")
def decline_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Decline an organization invitation."""
    invite = db.query(OrgInvite).filter(
        OrgInvite.id == invite_id,
        or_(
            OrgInvite.invitee_id == current_user.id,
            OrgInvite.invitee_email == (current_user.email or "").lower(),
        ),
        OrgInvite.status == "pending",
    ).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found or already handled.")

    invite.invitee_id = current_user.id
    invite.status = "declined"
    db.commit()

    logger.info(f"User {current_user.email} declined invite to org {invite.org_id}")
    return {"status": "success", "message": "Invitation declined."}


@router.put("/team/role")
def update_member_role(
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """Update a team member's role. Requires owner role."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="No organization found.")

    target = db.query(User).filter(
        User.id == data.user_id,
        User.org_id == current_user.org_id,
    ).first()

    if not target:
        raise HTTPException(status_code=404, detail="Member not found in your organization.")

    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role.")

    valid_roles = ["viewer", "editor", "admin"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {valid_roles}")

    target.role = data.role
    db.commit()

    logger.info(f"Role updated: {target.email} -> {data.role} by {current_user.email}")
    return {"status": "success", "message": f"Role updated to {data.role}."}

