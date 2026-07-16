import os

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
    if not settings.RUN_STARTUP_MIGRATIONS:
        yield
        return

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

        # -- organizations table
        if inspector.has_table("organizations"):
            org_cols = [c["name"] for c in inspector.get_columns("organizations")]
            if "rename_count" not in org_cols:
                conn.execute(text("ALTER TABLE organizations ADD COLUMN rename_count INTEGER DEFAULT 0 NOT NULL"))
                print("Added 'rename_count' column to organizations table")

        # -- org_invites table
        if inspector.has_table("org_invites"):
            invite_cols = [c["name"] for c in inspector.get_columns("org_invites")]
            if "invitee_email" not in invite_cols:
                conn.execute(text("ALTER TABLE org_invites ADD COLUMN invitee_email TEXT"))
                print("Added 'invitee_email' column to org_invites table")
            if "token" not in invite_cols:
                conn.execute(text("ALTER TABLE org_invites ADD COLUMN token TEXT"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_org_invites_token ON org_invites (token)"))
                print("Added 'token' column to org_invites table")
            conn.execute(text("ALTER TABLE org_invites ALTER COLUMN invitee_id DROP NOT NULL"))

        conn.commit()

    yield
    print("Shutting down...")


app = FastAPI(
    title="Intelliquery API",
    description="Production API for converting natural language to SQL securely",
    version="1.0.0",
    lifespan=lifespan,
)

# On Vercel this FastAPI service is mounted at routePrefix "/api/v1" (see
# vercel.json). Vercel strips that prefix from the path AND sets the ASGI
# root_path to "/api/v1", which Starlette strips again during route matching.
# So in production our routes must be registered WITHOUT the "/api/v1" prefix.
# Locally there is no proxy, but the frontend still calls "/api/v1/..." (see
# frontend/lib/api.ts), so we keep the prefix there. VERCEL is set
# automatically on every Vercel deployment.
API_PREFIX = "" if os.getenv("VERCEL") else "/api/v1"

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
    prefix=f"{API_PREFIX}/query",
    tags=["Query Engine"],
)

app.include_router(
    connections.router,
    prefix=f"{API_PREFIX}/connections",
    tags=["Database Connections"],
)

app.include_router(
    history.router,
    prefix=f"{API_PREFIX}/history",
    tags=["Query History"],
)

app.include_router(
    voice.router,
    prefix=f"{API_PREFIX}/voice",
    tags=["Voice Input"],
)

app.include_router(
    schema_explorer.router,
    prefix=f"{API_PREFIX}/schema",
    tags=["Schema Explorer"],
)

app.include_router(
    settings_api.router,
    prefix=f"{API_PREFIX}/settings",
    tags=["Settings"],
)

app.include_router(
    snippets_api.router,
    prefix=f"{API_PREFIX}/snippets",
    tags=["Snippets"])

@app.get(f"{API_PREFIX}/health")
def health_check():
    return {"status": "running", "version": "1.0.0"}