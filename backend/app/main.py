from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.models.core import Base
from app.api import query_router, connections
from app.api import history
from app.api import voice
from app.api import schema_explorer
from app.api import settings as settings_api
from app.api import snippets as snippets_api
from app.middleware.rate_limiter import RateLimiterMiddleware

from sqlalchemy import create_engine

engine = create_engine(settings.DATABASE_URL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up: Creating database tables...")
    Base.metadata.create_all(bind=engine)

    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        inspector = inspect(engine)

        # Helper: get column type as a string
        def col_type(table, col_name):
            for c in inspector.get_columns(table):
                if c["name"] == col_name:
                    return str(c["type"])
            return None

        user_cols = [c["name"] for c in inspector.get_columns("user")]
        if "role" not in user_cols:
            conn.execute(text('ALTER TABLE "user" ADD COLUMN role TEXT DEFAULT \'owner\''))
            print("Added 'role' column to user table")
        if "org_id" not in user_cols:
            conn.execute(text('ALTER TABLE "user" ADD COLUMN org_id INTEGER'))
            print("Added 'org_id' column to user table")

        # -- db_connections table
        if inspector.has_table("db_connections"):
            conn_cols = [c["name"] for c in inspector.get_columns("db_connections")]
            if "org_id" not in conn_cols:
                conn.execute(text("ALTER TABLE db_connections ADD COLUMN org_id INTEGER"))
                print(" Added 'org_id' column to db_connections table")
            if "user_id" not in conn_cols:
                conn.execute(text("ALTER TABLE db_connections ADD COLUMN user_id TEXT"))
                print("Added 'user_id' column to db_connections table")
            elif "INTEGER" in col_type("db_connections", "user_id").upper():
                conn.execute(text("ALTER TABLE db_connections DROP CONSTRAINT IF EXISTS db_connections_user_id_fkey"))
                conn.execute(text("ALTER TABLE db_connections ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT"))
                print("Changed db_connections.user_id from INTEGER to TEXT")
            if "use_ssl" not in conn_cols:
                conn.execute(text("ALTER TABLE db_connections ADD COLUMN use_ssl BOOLEAN DEFAULT FALSE"))
                print("Added 'use_ssl' column to db_connections table")

        # -- query_history table
        if inspector.has_table("query_history"):
            hist_cols = [c["name"] for c in inspector.get_columns("query_history")]
            if "user_id" not in hist_cols:
                conn.execute(text("ALTER TABLE query_history ADD COLUMN user_id TEXT"))
                print("Added 'user_id' column to query_history table")
            elif "INTEGER" in col_type("query_history", "user_id").upper():
                conn.execute(text("ALTER TABLE query_history DROP CONSTRAINT IF EXISTS query_history_user_id_fkey"))
                conn.execute(text("ALTER TABLE query_history ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT"))
                print("Changed query_history.user_id from INTEGER to TEXT")
            for col_name, col_def in [
                ("execution_time_ms", "INTEGER"),
                ("row_count", "INTEGER"),
                ("generation_source", "TEXT"),
                ("execution_status", "TEXT"),
                ("connection_id", "INTEGER"),
            ]:
                if col_name not in hist_cols:
                    conn.execute(text(f"ALTER TABLE query_history ADD COLUMN {col_name} {col_def}"))
                    print(f"Added '{col_name}' column to query_history table")

        conn.commit()

    yield
    print("Shutting down...")


app = FastAPI(
    title="Intelliquery API",
    description="Production API for converting natural language to SQL securely",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimiterMiddleware, requests_per_minute=60)


# ── Global Exception Handler ─────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred.",
            "type": type(exc).__name__,
        },
    )


# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(
    query_router.router,
    prefix="/api/v1/query",
    tags=["Query Engine"],
)

app.include_router(
    connections.router,
    prefix="/api/v1/connections",
    tags=["Database Connections"],
)

app.include_router(
    history.router,
    prefix="/api/v1/history",
    tags=["Query History"],
)

app.include_router(
    voice.router,
    prefix="/api/v1/voice",
    tags=["Voice Input"],
)

app.include_router(
    schema_explorer.router,
    prefix="/api/v1/schema",
    tags=["Schema Explorer"],
)

app.include_router(
    settings_api.router,
    prefix="/api/v1/settings",
    tags=["Settings"],
)

app.include_router(
    snippets_api.router, 
    prefix="/api/v1/snippets", 
    tags=["Snippets"])

@app.get("/health")
def health_check():
    return {"status": "running", "version": "1.0.0"}