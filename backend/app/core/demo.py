"""
Ephemeral demo accounts.

A demo user is a normal Better Auth user that happens to have a row in
`demo_sessions`. Better Auth (on the Next.js side) owns account and session
creation, because it signs the session cookie and the frontend validates that
signature. A session inserted from here would authenticate against FastAPI
while the browser still considered itself logged out.

So the split is: Next.js creates the account, this module provisions it by
attaching the shared sample database, pinning the role to `viewer`, and
starting the question budget.

Demo accounts are pinned to role="viewer" AND rejected by require_not_demo on
every mutating route. The role alone was not sufficient: create_organization
accepted any verified viewer and promoted the caller to owner.
"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.logger import logger
from app.core.sample_db import SAMPLE_CONNECTION_NAME, SAMPLE_DB_PATH, ensure_sample_db
from app.core.security import encrypt_password
from app.models.core import DbConnection, DemoSession, User
from app.pipeline.schema_mapper import SchemaMapper

# How long a demo account lives, and how many LLM-backed questions it may ask.
DEMO_TTL_HOURS = 24
DEMO_QUESTION_LIMIT = 10

# Demo accounts are created against this domain so the email hooks can skip
# them, so nothing is ever posted to a mailbox that cannot exist.
DEMO_EMAIL_DOMAIN = "demo.intelliquery.invalid"

# Curated questions surfaced as chips. They double as cache warmers: the first
# visitor pays for the LLM round-trip, everyone after that gets a cache hit.
SUGGESTED_QUESTIONS = [
    "What is the total revenue by product category?",
    "Who are the top 10 customers by amount spent?",
    "How many orders were placed each month this year?",
    "Which products have never been ordered?",
    "What is the average order value?",
    "Which payment methods are used most often?",
    "Show me orders with more than 3 items",
    "What are the 5 best-selling products by quantity?",
]

_mapper = SchemaMapper()


def is_demo_email(email: str | None) -> bool:
    return bool(email) and email.lower().endswith(f"@{DEMO_EMAIL_DOMAIN}")


def get_demo_session(db: Session, user: User) -> DemoSession | None:
    """Return the demo row for this user, or None for a real account."""
    if user is None:
        return None
    return db.query(DemoSession).filter(DemoSession.user_id == user.id).first()


def attach_sample_connection(db: Session, user: User) -> DbConnection:
    """
    Give the user the built-in sample database.

    Mirrors POST /connections/sample, but callable server-side without going
    through the route's editor-role dependency. A demo user is a viewer and
    could never call that endpoint itself.
    """
    db_path = ensure_sample_db()

    existing = (
        db.query(DbConnection)
        .filter(
            DbConnection.user_id == user.id,
            DbConnection.db_type == "sqlite",
            DbConnection.db_name == db_path,
        )
        .first()
    )
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
        return existing

    connection = DbConnection(
        user_id=user.id,
        org_id=user.org_id,
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
    connection.cached_schema = _mapper.sync_schema(connection)
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


def provision(db: Session, user: User) -> DemoSession:
    """
    Turn a freshly created account into a demo account. Idempotent.
    """
    existing = get_demo_session(db, user)
    if existing:
        return existing

    # viewer is the floor, not the whole defence. Every mutating route also
    # carries require_not_demo, because the role ladder alone was not enough:
    # create_organization only asked for a verified viewer and handed back
    # role="owner".
    user.role = "viewer"
    # Deliberately left unverified. Marking demo accounts verified was what
    # satisfied require_verified_* and opened the escalation path. Querying
    # only needs require_viewer, so the demo loses nothing.
    user.emailVerified = False

    demo = DemoSession(
        user_id=user.id,
        questions_used=0,
        question_limit=DEMO_QUESTION_LIMIT,
        expires_at=datetime.utcnow() + timedelta(hours=DEMO_TTL_HOURS),
    )
    db.add(demo)
    db.commit()
    db.refresh(demo)

    attach_sample_connection(db, user)

    logger.info(f"Demo account provisioned: {user.email}")
    return demo


def consume_question(db: Session, demo: DemoSession) -> None:
    """Count one question against the budget."""
    demo.questions_used = (demo.questions_used or 0) + 1
    db.commit()


def purge_expired(db: Session) -> int:
    """
    Delete demo accounts past their TTL, and everything hanging off them.

    Connections cascade from the FK; the user row goes last so Better Auth's
    session rows go with it.
    """
    stale = db.query(DemoSession).filter(DemoSession.expires_at < datetime.utcnow()).all()
    if not stale:
        return 0

    removed = 0
    for demo in stale:
        try:
            db.query(DbConnection).filter(DbConnection.user_id == demo.user_id).delete(
                synchronize_session=False
            )
            db.query(User).filter(User.id == demo.user_id).delete(
                synchronize_session=False
            )
            db.delete(demo)
            removed += 1
        except Exception as exc:
            logger.error(f"Could not purge demo session {demo.id}: {exc}")
            db.rollback()

    db.commit()
    logger.info(f"Purged {removed} expired demo account(s)")
    return removed
