"""
Schema Explorer API — browse tables, columns, and relationships
for any connected database.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.core import DbConnection, User
from app.middleware.auth import get_current_user, require_viewer
from app.core.logger import logger

router = APIRouter()


@router.get("/{connection_id}/tables")
def list_tables(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """List all tables and their column counts for a connection."""
    connection = _get_connection(connection_id, current_user, db)

    if not connection.cached_schema:
        raise HTTPException(status_code=400, detail="Schema not synced. Please refresh the connection.")

    tables = []
    for table_name, columns in connection.cached_schema.items():
        pk_cols = [c["name"] for c in columns if c.get("primary_key")]
        tables.append({
            "name": table_name,
            "column_count": len(columns),
            "primary_keys": pk_cols,
        })

    return {
        "connection_id": connection.id,
        "connection_name": connection.name,
        "db_type": connection.db_type,
        "table_count": len(tables),
        "tables": tables,
        "last_synced": connection.last_synced.isoformat() if connection.last_synced else None,
    }


@router.get("/{connection_id}/tables/{table_name}")
def get_table_details(
    connection_id: int,
    table_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Get detailed column information for a specific table."""
    connection = _get_connection(connection_id, current_user, db)

    if not connection.cached_schema:
        raise HTTPException(status_code=400, detail="Schema not synced.")

    columns = connection.cached_schema.get(table_name)
    if columns is None:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")

    return {
        "connection_id": connection.id,
        "table_name": table_name,
        "column_count": len(columns),
        "columns": columns,
    }


@router.get("/{connection_id}/search")
def search_schema(
    connection_id: int,
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Search across tables and columns by name."""
    connection = _get_connection(connection_id, current_user, db)

    if not connection.cached_schema:
        raise HTTPException(status_code=400, detail="Schema not synced.")

    query_lower = q.lower()
    results = []

    for table_name, columns in connection.cached_schema.items():
        # Match table names
        if query_lower in table_name.lower():
            results.append({
                "type": "table",
                "table": table_name,
                "column_count": len(columns),
            })

        # Match column names within tables
        for col in columns:
            if query_lower in col["name"].lower():
                results.append({
                    "type": "column",
                    "table": table_name,
                    "column": col["name"],
                    "data_type": col.get("type", "unknown"),
                })

    return {"query": q, "result_count": len(results), "results": results}


def _get_connection(connection_id: int, user: User, db: Session) -> DbConnection:
    connection = db.query(DbConnection).filter(DbConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    if connection.user_id != user.id:
        if not (connection.org_id and connection.org_id == user.org_id):
            raise HTTPException(status_code=403, detail="Access denied.")

    return connection
