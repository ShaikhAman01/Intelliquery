"""
Query History API — browse, search, and replay past queries.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db
from app.models.core import QueryHistory, DbConnection, User
from app.middleware.auth import get_current_user, require_viewer
from app.core.logger import logger

router = APIRouter()


@router.get("/")
def list_history(
    connection_id: Optional[int] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """
    List query history for the current user.
    Optionally filter by connection_id.
    """
    query = db.query(QueryHistory).filter(QueryHistory.user_id == current_user.id)

    if connection_id:
        query = query.filter(QueryHistory.connection_id == connection_id)

    total = query.count()
    items = (
        query
        .order_by(QueryHistory.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": [
            {
                "id": h.id,
                "connection_id": h.connection_id,
                "user_question": h.user_question,
                "generated_sql": h.generated_sql,
                "generation_source": h.generation_source,
                "execution_status": h.execution_status,
                "execution_time_ms": h.execution_time_ms,
                "row_count": h.row_count,
                "timestamp": h.timestamp.isoformat() if h.timestamp else None,
            }
            for h in items
        ],
    }


@router.get("/{history_id}")
def get_history_entry(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Get a single history entry."""
    entry = (
        db.query(QueryHistory)
        .filter(QueryHistory.id == history_id, QueryHistory.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found.")

    return {
        "id": entry.id,
        "connection_id": entry.connection_id,
        "user_question": entry.user_question,
        "generated_sql": entry.generated_sql,
        "generation_source": entry.generation_source,
        "execution_status": entry.execution_status,
        "execution_time_ms": entry.execution_time_ms,
        "row_count": entry.row_count,
        "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
    }


@router.delete("/{history_id}")
def delete_history_entry(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Delete a history entry."""
    entry = (
        db.query(QueryHistory)
        .filter(QueryHistory.id == history_id, QueryHistory.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found.")

    db.delete(entry)
    db.commit()
    return {"status": "success", "message": "History entry deleted."}
