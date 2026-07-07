import socket
from typing import Generator
from app.core.config import settings
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 3,
    },
)


@event.listens_for(engine, "do_connect")
def _prefer_ipv4(dialect, conn_rec, cargs, cparams):
    host = cparams.get("host")
    if host and "hostaddr" not in cparams:
        try:
            cparams["hostaddr"] = socket.gethostbyname(host)
        except OSError:
            pass
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()