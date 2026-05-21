"""
Settings API — Profile, Organization, and Team management.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.api.deps import get_db
from app.models.core import User, Organization, OrgInvite
from app.middleware.auth import get_current_user, require_viewer, require_admin, require_owner
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

    org.name = data.name
    db.commit()

    logger.info(f"Organization renamed to '{data.name}' by {current_user.email}")
    return {"status": "success", "name": org.name}


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
    """Send a pending invitation to a user. Requires admin role."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="Create an organization first.")

    # Find user by email
    target_user = db.query(User).filter(User.email == data.email).first()
    if not target_user:
        raise HTTPException(
            status_code=404,
            detail=f"No user found with email '{data.email}'. They must sign up first.",
        )

    if target_user.org_id == current_user.org_id:
        raise HTTPException(status_code=400, detail="This user is already in your organization.")

    if target_user.org_id:
        raise HTTPException(status_code=400, detail="This user already belongs to another organization.")

    # Check for existing pending invite
    existing = db.query(OrgInvite).filter(
        OrgInvite.invitee_id == target_user.id,
        OrgInvite.org_id == current_user.org_id,
        OrgInvite.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="An invite is already pending for this user.")

    # Validate role
    valid_roles = ["viewer", "editor", "admin"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {valid_roles}")

    invite = OrgInvite(
        org_id=current_user.org_id,
        inviter_id=current_user.id,
        invitee_id=target_user.id,
        role=data.role,
    )
    db.add(invite)
    db.commit()

    logger.info(f"Invite sent to {data.email} for org {current_user.org_id} with role {data.role}")
    return {
        "status": "success",
        "message": f"Invitation sent to {data.email} as {data.role}.",
    }


@router.get("/team/invites")
def get_my_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all pending invitations for the current user."""
    invites = db.query(OrgInvite).filter(
        OrgInvite.invitee_id == current_user.id,
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
        OrgInvite.invitee_id == current_user.id,
        OrgInvite.status == "pending",
    ).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found or already handled.")

    if current_user.org_id:
        raise HTTPException(status_code=400, detail="You already belong to an organization.")

    # Join the organization
    current_user.org_id = invite.org_id
    current_user.role = invite.role
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
        OrgInvite.invitee_id == current_user.id,
        OrgInvite.status == "pending",
    ).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found or already handled.")

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

@router.post("/team/join-via-slug/{slug}")
def join_via_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow an authenticated user without an organization to join via a public link."""
    if current_user.org_id:
        raise HTTPException(
            status_code=400, 
            detail="You already belong to an organization."
        )

    org = db.query(Organization).filter(Organization.slug == slug).first()
    if not org:
        raise HTTPException(
            status_code=404, 
            detail="The invitation link is invalid or has expired."
        )

    current_user.org_id = org.id
    current_user.role = "viewer"
    db.commit()

    logger.info(f"User {current_user.email} joined org {org.name} via public slug link.")
    return {
        "status": "success",
        "message": f"You have successfully joined {org.name} as a viewer."
    }