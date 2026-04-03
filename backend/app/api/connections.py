from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.api.deps import get_db
from app.models.core import DbConnection, User
from app.middleware.auth import get_current_user, require_viewer, require_editor, require_admin
from app.core.security import encrypt_password
from app.pipeline.schema_mapper import SchemaMapper
from app.core.client_db_manager import ClientDBManager
from app.core.logger import logger

router = APIRouter()
mapper = SchemaMapper()


# ── Request schemas ──────────────────────────────────────────────────────────

class ConnectionCreate(BaseModel):
    name: str
    db_type: str  # "postgres" | "mysql"
    host: str
    port: str
    username: str
    password: str
    db_name: str
    use_ssl: bool = False


class ConnectionTest(BaseModel):
    db_type: str
    host: str
    port: str
    username: str
    password: str
    db_name: str
    use_ssl: bool = False


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/test")
def test_connection(
    conn_data: ConnectionTest,
    current_user: User = Depends(require_viewer),
):
    """
    Test a database connection without saving it.
    Returns success/failure and the list of tables found.
    """
    try:
        from sqlalchemy import create_engine, text

        db_url = _build_db_url(
            conn_data.db_type, conn_data.username, conn_data.password,
            conn_data.host, conn_data.port, conn_data.db_name, conn_data.use_ssl,
        )
        engine = create_engine(db_url, connect_args={"connect_timeout": 10})

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        logger.info(f"Connection test succeeded for {conn_data.host}")
        return {"status": "success", "message": "Connection successful!"}

    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")


@router.post("/")
def create_connection(
    conn_data: ConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """
    1. Encrypts the password.
    2. Connects to the user's DB to fetch schema.
    3. Saves connection info + schema snapshot to our internal DB.
    """
    try:
        encrypted_pw = encrypt_password(conn_data.password)

        new_conn = DbConnection(
            user_id=current_user.id,
            org_id=current_user.org_id,
            name=conn_data.name,
            db_type=conn_data.db_type,
            host=conn_data.host,
            port=conn_data.port,
            username=conn_data.username,
            encrypted_password=encrypted_pw,
            db_name=conn_data.db_name,
            use_ssl=conn_data.use_ssl,
        )

        logger.info(f"Analyzing schema for {conn_data.host}...")
        schema_snapshot = mapper.sync_schema(new_conn)

        new_conn.cached_schema = schema_snapshot

        db.add(new_conn)
        db.commit()
        db.refresh(new_conn)

        return {
            "status": "success",
            "connection_id": new_conn.id,
            "tables_found": list(schema_snapshot.keys()),
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
def list_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """
    List all connections accessible to the current user.
    If user belongs to an org, show all org connections; otherwise show only their own.
    """
    query = db.query(DbConnection)

    if current_user.org_id:
        # Show all connections in the org
        query = query.filter(DbConnection.org_id == current_user.org_id)
    else:
        # Show only user's own connections
        query = query.filter(DbConnection.user_id == current_user.id)

    return query.all()


@router.post("/{connection_id}/refresh")
def refresh_connection_schema(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    connection = _get_user_connection(connection_id, current_user, db)

    try:
        logger.info(f"Refreshing schema for {connection.name}...")
        schema_snapshot = mapper.sync_schema(connection)

        connection.cached_schema = schema_snapshot
        connection.last_synced = datetime.utcnow()

        db.commit()
        db.refresh(connection)

        return {
            "status": "success",
            "tables_found": list(schema_snapshot.keys()),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Schema Sync Failed: {str(e)}")


@router.delete("/{connection_id}")
def delete_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a connection. Requires admin role."""
    connection = _get_user_connection(connection_id, current_user, db)

    # Dispose cached engine
    ClientDBManager.dispose_engine(connection.id)

    db.delete(connection)
    db.commit()
    return {"status": "success", "message": f"Connection '{connection.name}' deleted."}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_user_connection(connection_id: int, user: User, db: Session) -> DbConnection:
    """Fetch a connection and verify the user has access to it."""
    connection = db.query(DbConnection).filter(DbConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Check ownership or org membership
    if connection.user_id != user.id:
        if not (connection.org_id and connection.org_id == user.org_id):
            raise HTTPException(status_code=403, detail="Access denied to this connection.")

    return connection


def _build_db_url(db_type: str, username: str, password: str,
                  host: str, port: str, db_name: str, use_ssl: bool) -> str:
    """Build a SQLAlchemy connection URL."""
    ssl_param = ""
    if db_type == "postgres":
        ssl_param = "?sslmode=require" if use_ssl else ""
        return f"postgresql://{username}:{password}@{host}:{port}/{db_name}{ssl_param}"
    elif db_type == "mysql":
        ssl_param = "?ssl=true" if use_ssl else ""
        return f"mysql+pymysql://{username}:{password}@{host}:{port}/{db_name}{ssl_param}"
    else:
        raise ValueError(f"Unsupported database type: {db_type}")