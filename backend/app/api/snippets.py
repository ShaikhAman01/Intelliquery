from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.api.deps import get_db
from app.models.core import SavedSnippet, User, DbConnection
from app.middleware.auth import get_current_user

router = APIRouter()

# ── Request Validation Schemas ───────────────────────────────────────────────

class SnippetCreate(BaseModel):
    connection_id: int
    title: str
    description: Optional[str] = None
    sql_text: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/")
def create_snippet(
    data: SnippetCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Save a query snippet to the team registry library database context.
    """
    try:
        connection = db.query(DbConnection).filter(DbConnection.id == data.connection_id).first()
        if not connection:
            raise HTTPException(status_code=404, detail="Target database connection context not found.")

        new_snippet = SavedSnippet(
            org_id=current_user.org_id,
            user_id=current_user.id,
            connection_id=data.connection_id,
            title=data.title,
            description=data.description,
            sql_text=data.sql_text
        )

        db.add(new_snippet)
        db.commit()
        db.refresh(new_snippet)

        return {
            "status": "success",
            "message": "Query code block cataloged cleanly inside team repository.",
            "snippet_id": new_snippet.id
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database archiving failed: {str(e)}")


@router.get("/")
def list_snippets(
    connection_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch saved query snippets for the current workspace context.
    Filters by connection_id if provided.
    """
    try:
        query = db.query(SavedSnippet)
        
        # Scope by organization if user belongs to one, otherwise fallback to personal user scope
        if current_user.org_id:
            query = query.filter(SavedSnippet.org_id == current_user.org_id)
        else:
            query = query.filter(SavedSnippet.user_id == current_user.id)
            
        # Apply strict environment connection filter parameter isolation rules if passed
        if connection_id:
            query = query.filter(SavedSnippet.connection_id == connection_id)
            
        return query.order_by(SavedSnippet.created_at.desc()).all()
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to query snippets index: {str(e)}")