from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON, DateTime, Boolean
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


# ── Organization (multi-tenant root) ─────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    members = relationship("User", back_populates="organization")
    connections = relationship("DbConnection", back_populates="organization")


# ── Better Auth tables ───────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "user"  # Better Auth uses singular "user" by default
    id = Column(Text, primary_key=True)  # Better Auth uses Text/String IDs
    name = Column(Text)
    email = Column(Text, unique=True, index=True)
    emailVerified = Column(Boolean)
    image = Column(Text)
    createdAt = Column(DateTime)
    updatedAt = Column(DateTime)

    # Intelliquery extensions
    role = Column(Text, default="viewer")
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)

    # Relationships
    sessions = relationship("Session", back_populates="user")
    accounts = relationship("Account", back_populates="user")
    organization = relationship("Organization", back_populates="members")


class Session(Base):
    __tablename__ = "session"
    id = Column(Text, primary_key=True)
    expiresAt = Column(DateTime)
    token = Column(Text, unique=True, index=True)
    createdAt = Column(DateTime)
    updatedAt = Column(DateTime)
    ipAddress = Column(Text)
    userAgent = Column(Text)
    userId = Column(Text, ForeignKey("user.id"))

    user = relationship("User", back_populates="sessions")


class Account(Base):
    __tablename__ = "account"
    id = Column(Text, primary_key=True)
    accountId = Column(Text)
    providerId = Column(Text)
    userId = Column(Text, ForeignKey("user.id"))
    accessToken = Column(Text)
    refreshToken = Column(Text)
    idToken = Column(Text)
    accessTokenExpiresAt = Column(DateTime)
    refreshTokenExpiresAt = Column(DateTime)
    scope = Column(Text)
    password = Column(Text)
    createdAt = Column(DateTime)
    updatedAt = Column(DateTime)

    user = relationship("User", back_populates="accounts")


class Verification(Base):
    __tablename__ = "verification"
    id = Column(Text, primary_key=True)
    identifier = Column(Text)
    value = Column(Text)
    expiresAt = Column(DateTime)
    createdAt = Column(DateTime)
    updatedAt = Column(DateTime)


# ── Intelliquery domain tables ───────────────────────────────────────────────

class DbConnection(Base):
    __tablename__ = "db_connections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Text, ForeignKey("user.id"))
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)

    name = Column(String)
    db_type = Column(String)
    host = Column(String)
    username = Column(String)
    encrypted_password = Column(String)
    port = Column(String)
    db_name = Column(String)
    use_ssl = Column(Boolean, default=False)

    # We cache their schema structure here
    cached_schema = Column(JSON, nullable=True)
    last_synced = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="connections")
    queries = relationship("QueryHistory", back_populates="connection")

    is_active = Column(Boolean, default=True, nullable=False)


class QueryHistory(Base):
    __tablename__ = "query_history"
    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("db_connections.id"))
    user_id = Column(Text, ForeignKey("user.id"), nullable=True)

    user_question = Column(String)
    generated_sql = Column(Text)
    generation_source = Column(String)  # "DYNAMIC" or "LLM_FALLBACK"
    execution_status = Column(String)
    execution_time_ms = Column(Integer, nullable=True)
    row_count = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    connection = relationship("DbConnection", back_populates="queries")


class OrgInvite(Base):
    __tablename__ = "org_invites"
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    inviter_id = Column(Text, ForeignKey("user.id"), nullable=False)
    invitee_id = Column(Text, ForeignKey("user.id"), nullable=False)
    role = Column(Text, default="viewer")
    status = Column(Text, default="pending")  # pending, accepted, declined
    created_at = Column(DateTime, default=datetime.utcnow)

class SavedSnippet(Base):
    __tablename__ = "saved_snippets"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, index=True, nullable=True)
    user_id = Column(String, index=True, nullable=False)
    connection_id = Column(Integer, ForeignKey("db_connections.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sql_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())