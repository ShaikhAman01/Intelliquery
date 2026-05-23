"""
Schema Explorer API — browse tables, columns, and relationships
for any connected database using high-performance dictionary lookups.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db
from app.models.core import DbConnection, User
from app.middleware.auth import get_current_user, require_viewer
from app.pipeline.schema_mapper import SchemaMapper
from app.core.logger import logger

router = APIRouter()


@router.get("/{connection_id}")
def get_full_schema(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """
    Fetches the unified, production-grade schema database mapping dictionary.
    Directly addresses front-end rendering grids.
    """
    connection = _get_connection(connection_id, current_user, db)

    # Automatically trigger a metadata synchronization call if cache map layer is blank
    if not connection.cached_schema:
        try:
            logger.info(f"Schema missing for connection {connection_id}. Forcing background introspection.")
            mapper = SchemaMapper()
            connection.cached_schema = mapper.sync_schema(connection)
            db.commit()
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Automated background system schema introspection failed: {str(e)}"
            )

    # Return the dictionary directly mapped under the "tables" attribute wrapper 
    return {"tables": connection.cached_schema}


@router.post("/{connection_id}/refresh")
def refresh_schema(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """
    Force clear metadata tracking caches and sync structural schemas live.
    """
    connection = _get_connection(connection_id, current_user, db)
    try:
        mapper = SchemaMapper()
        connection.cached_schema = mapper.sync_schema(connection)
        db.commit()
        return {"status": "success", "message": "Database structure definitions catalog refreshed."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Live schema reflection failed: {str(e)}")


@router.get("/{connection_id}/search")
def search_schema(
    connection_id: int,
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Search across tables and columns by name inside the updated dictionary mapping layer."""
    connection = _get_connection(connection_id, current_user, db)

    if not connection.cached_schema:
        raise HTTPException(status_code=400, detail="Schema metadata missing. Refresh connection attributes.")

    query_lower = q.lower()
    results = []

    for table_name, columns_map in connection.cached_schema.items():
        if query_lower in table_name.lower():
            results.append({
                "type": "table",
                "table": table_name,
                "column_count": len(columns_map),
            })

        for col_name, col_meta in columns_map.items():
            if query_lower in col_name.lower():
                results.append({
                    "type": "column",
                    "table": table_name,
                    "column": col_name,
                    "data_type": col_meta.get("type", "unknown"),
                    "is_primary_key": col_meta.get("is_pk", False),
                    "foreign_key_target": col_meta.get("fk_target", None)
                })

    return {"query": q, "result_count": len(results), "results": results}


def _get_connection(connection_id: int, user: User, db: Session) -> DbConnection:
    """Isolate multi-tenant context boundary layers safely."""
    connection = db.query(DbConnection).filter(DbConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Database connection workspace metadata link not found")

    if connection.user_id != user.id:
        if not (connection.org_id and connection.org_id == user.org_id):
            raise HTTPException(status_code=403, detail="Access denied. Workspace environment boundary mismatch.")

    return connection