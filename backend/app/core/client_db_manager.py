from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from app.core.security import decrypt_password
from app.models.core import DbConnection
from app.core.logger import logger


class ClientDBManager:
    """
    Singleton to manage a pool of connections to CLIENT databases.
    Prevents recreating the engine for every single request.
    """
    _engines = {}

    @classmethod
    def _build_url(cls, connection_model: DbConnection, password: str) -> str:
        """Build connection URL with optional SSL."""
        use_ssl = getattr(connection_model, "use_ssl", False)
        db_type = connection_model.db_type
        u, h, p, db = (connection_model.username, connection_model.host,
                       connection_model.port, connection_model.db_name)

        if db_type in ("postgres", "cockroach"):
            ssl_param = "?sslmode=require" if use_ssl else ""
            return f"postgresql://{u}:{password}@{h}:{p}/{db}{ssl_param}"
        elif db_type in ("mysql", "mariadb"):
            ssl_param = "?ssl=true" if use_ssl else ""
            return f"mysql+pymysql://{u}:{password}@{h}:{p}/{db}{ssl_param}"
        elif db_type == "mssql":
            ssl_param = "?encrypt=true" if use_ssl else ""
            return f"mssql+pymssql://{u}:{password}@{h}:{p}/{db}{ssl_param}"
        elif db_type == "sqlite":
            return f"sqlite:///{db}"
        else:
            raise ValueError(f"Unsupported database type: {db_type}")

    @classmethod
    def get_engine(cls, connection_model: DbConnection):
        """
        Returns a cached SQLAlchemy engine. Creates one if not cached.
        """
        conn_id = connection_model.id

        if conn_id in cls._engines:
            return cls._engines[conn_id]

        logger.info(
            f"🔌 Initializing connection pool for ID {conn_id} "
            f"({connection_model.host})"
        )

        real_password = decrypt_password(connection_model.encrypted_password)
        db_url = cls._build_url(connection_model, real_password)

        if connection_model.db_type == "sqlite":
            from app.core.sample_db import SAMPLE_DB_PATH, ensure_sample_db
            if connection_model.db_name == str(SAMPLE_DB_PATH):
                ensure_sample_db()
            # SQLite is a file — single shared connection, thread-safe via lock
            engine = create_engine(
                db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        else:
            engine = create_engine(
                db_url,
                pool_size=5,
                max_overflow=10,
                pool_recycle=3600,
                pool_pre_ping=True,
            )

        cls._engines[conn_id] = engine
        return engine

    @classmethod
    def test_connection(cls, connection_model: DbConnection) -> bool:
        """Test that a connection is alive by running SELECT 1."""
        try:
            engine = cls.get_engine(connection_model)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Connection health check failed for ID {connection_model.id}: {e}")
            return False

    @classmethod
    def dispose_engine(cls, conn_id):
        """Forcibly close connections (e.g., if credentials change)."""
        if conn_id in cls._engines:
            cls._engines[conn_id].dispose()
            del cls._engines[conn_id]
            logger.info(f"🔌 Disposed engine for connection ID {conn_id}")


client_db_manager = ClientDBManager()