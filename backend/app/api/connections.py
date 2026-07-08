from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.api.deps import get_db
from app.models.core import DbConnection, User
from app.middleware.auth import get_current_user, require_viewer, require_editor, require_admin, require_verified_editor
from app.core.security import encrypt_password, decrypt_password
from app.pipeline.schema_mapper import SchemaMapper
from app.core.client_db_manager import ClientDBManager
from app.core.cache import sql_cache
from app.core.logger import logger

router = APIRouter()
mapper = SchemaMapper()


# ── Request schemas ──────────────────────────────────────────────────────────

class ConnectionCreate(BaseModel):
    name: str
    db_type: str
    host: str
    port: str
    username: str
    password: str
    db_name: str
    use_ssl: bool = False
    excluded_tables: List[str] = []
    excluded_columns: dict = {}  # {table_name: [col_name, ...]}


class ConnectionTest(BaseModel):
    db_type: str
    host: str
    port: str
    username: str
    password: str
    db_name: str
    use_ssl: bool = False


class ConnectionStatusUpdate(BaseModel):
    is_active: bool


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/test")
def test_connection(
    conn_data: ConnectionTest,
    current_user: User = Depends(require_editor),
):
    """
    Test a database connection and return schema without saving.
    Returns {status, schema: {table: {col: {type, nullable, is_pk, fk_target}}}}.
    """
    try:
        from sqlalchemy import create_engine, text, inspect as sa_inspect

        db_url = _build_db_url(
            conn_data.db_type, conn_data.username, conn_data.password,
            conn_data.host, conn_data.port, conn_data.db_name, conn_data.use_ssl,
        )
        engine_kwargs = {} if conn_data.db_type == "sqlite" else {"connect_args": {"connect_timeout": 10}}
        engine = create_engine(db_url, **engine_kwargs)

        schema_snapshot = {}
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            inspector = sa_inspect(engine)
            for table_name in inspector.get_table_names():
                pk_cols = set(inspector.get_pk_constraint(table_name).get("constrained_columns", []))
                fk_lookup = {}
                for fk in inspector.get_foreign_keys(table_name):
                    if fk["constrained_columns"] and fk["referred_columns"]:
                        fk_lookup[fk["constrained_columns"][0]] = (
                            f"{fk['referred_table']}.{fk['referred_columns'][0]}"
                        )
                columns_map = {}
                for col in inspector.get_columns(table_name):
                    col_name = col["name"]
                    columns_map[col_name] = {
                        "type": str(col["type"]).lower(),
                        "nullable": col.get("nullable", True),
                        "is_pk": col_name in pk_cols,
                        "fk_target": fk_lookup.get(col_name),
                    }
                schema_snapshot[table_name] = columns_map

        engine.dispose()
        logger.info(f"Connection test succeeded for {conn_data.host} ({len(schema_snapshot)} tables)")
        return {"status": "success", "schema": schema_snapshot}

    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")


@router.post("/{connection_id}/test")
def test_saved_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Test an existing saved connection by ID (no password needed from client)."""
    conn = db.query(DbConnection).filter(DbConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found.")
    if conn.user_id != current_user.id:
        if not conn.org_id or conn.org_id != current_user.org_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    try:
        from sqlalchemy import create_engine, text
        password = decrypt_password(conn.encrypted_password)
        db_url = _build_db_url(conn.db_type, conn.username, password, conn.host, conn.port, conn.db_name, conn.use_ssl)
        engine = create_engine(db_url, connect_args={"connect_timeout": 10})
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        engine.dispose()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Connection test failed for id={connection_id}: {e}")
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")


@router.post("/")
def create_connection(
    conn_data: ConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_verified_editor),
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
            is_active=True,  # Default to active on creation
        )

        logger.info(f"Analyzing schema for {conn_data.host}...")
        schema_snapshot = mapper.sync_schema(new_conn)

        # Apply user exclusions from the review step
        for tbl in conn_data.excluded_tables:
            schema_snapshot.pop(tbl, None)
        for tbl, cols in conn_data.excluded_columns.items():
            if tbl in schema_snapshot:
                for col in cols:
                    schema_snapshot[tbl].pop(col, None)

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


@router.post("/sample")
def create_sample_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    """
    Connect the current user to the built-in sample e-commerce database.

    Idempotent: if the user (or their org) already has a sample connection,
    it is re-activated and returned instead of creating a duplicate. The
    underlying SQLite file is generated on first use and shared read-only
    across all users — the SQL executor only allows SELECT statements.
    """
    from app.core.sample_db import ensure_sample_db, SAMPLE_CONNECTION_NAME

    try:
        db_path = ensure_sample_db()

        scope = (
            db.query(DbConnection).filter(DbConnection.org_id == current_user.org_id)
            if current_user.org_id
            else db.query(DbConnection).filter(DbConnection.user_id == current_user.id)
        )
        existing = scope.filter(
            DbConnection.db_type == "sqlite",
            DbConnection.db_name == db_path,
        ).first()

        if existing:
            if not existing.is_active:
                existing.is_active = True
                db.commit()
                db.refresh(existing)
            connection = existing
        else:
            connection = DbConnection(
                user_id=current_user.id,
                org_id=current_user.org_id,
                name=SAMPLE_CONNECTION_NAME,
                db_type="sqlite",
                host="local",
                port="",
                username="",
                encrypted_password=encrypt_password(""),
                db_name=db_path,
                use_ssl=False,
                is_active=True,
            )
            connection.cached_schema = mapper.sync_schema(connection)
            db.add(connection)
            db.commit()
            db.refresh(connection)
            logger.info(f"Sample connection created for user {current_user.email}")

        return {
            "id": connection.id,
            "name": connection.name,
            "db_type": connection.db_type,
            "host": connection.host,
            "port": connection.port,
            "username": connection.username,
            "db_name": connection.db_name,
            "use_ssl": connection.use_ssl,
            "is_active": connection.is_active,
            "already_existed": existing is not None,
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Sample connection failed: {e}")
        raise HTTPException(status_code=500, detail="Could not set up the sample database. Please try again.")


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
        query = query.filter(DbConnection.org_id == current_user.org_id)
    else:
        query = query.filter(DbConnection.user_id == current_user.id)

    return query.all()


@router.post("/{connection_id}/refresh")
def refresh_connection_schema(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    connection = _get_user_connection(connection_id, current_user, db)

    if not getattr(connection, 'is_active', True):
        raise HTTPException(status_code=400, detail="Cannot refresh schema on a disabled database connection.")

    try:
        logger.info(f"Refreshing schema for {connection.name}...")
        schema_snapshot = mapper.sync_schema(connection)

        connection.cached_schema = schema_snapshot
        connection.last_synced = datetime.utcnow()

        db.commit()
        db.refresh(connection)

        # Invalidate SQL cache for this connection so stale queries
        # generated against the old schema are never replayed.
        evicted = sql_cache.invalidate_connection(connection_id)
        if evicted:
            logger.info(f"SQL cache: evicted {evicted} entries for connection {connection_id} after schema refresh.")

        return {
            "status": "success",
            "tables_found": list(schema_snapshot.keys()),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Schema Sync Failed: {str(e)}")


@router.patch("/{connection_id}/toggle")
def toggle_connection_status(
    connection_id: int,
    status_data: ConnectionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    """Enable or disable a database connection layout without removing it."""
    connection = _get_user_connection(connection_id, current_user, db)
    
    connection.is_active = status_data.is_active
    db.commit()
    db.refresh(connection)
    
    status_msg = "enabled" if connection.is_active else "disabled"
    logger.info(f"Connection '{connection.name}' has been {status_msg} by user {current_user.email}")
    return {
        "status": "success",
        "message": f"Connection configuration successfully {status_msg}.",
        "is_active": connection.is_active
    }


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
    if db_type in ("postgres", "cockroach"):
        ssl_param = "?sslmode=require" if use_ssl else ""
        return f"postgresql://{username}:{password}@{host}:{port}/{db_name}{ssl_param}"
    elif db_type in ("mysql", "mariadb"):
        ssl_param = "?ssl=true" if use_ssl else ""
        return f"mysql+pymysql://{username}:{password}@{host}:{port}/{db_name}{ssl_param}"
    elif db_type == "mssql":
        ssl_param = "?encrypt=true" if use_ssl else ""
        return f"mssql+pymssql://{username}:{password}@{host}:{port}/{db_name}{ssl_param}"
    elif db_type == "sqlite":
        return f"sqlite:///{db_name}"
    else:
        raise ValueError(f"Unsupported database type: {db_type}")