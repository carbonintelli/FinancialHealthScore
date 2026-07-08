"""SQLAlchemy engine and session management."""

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def _prepare_sqlite_path(url: str) -> str:
    if url.startswith("sqlite:///") and ":memory:" not in url:
        db_file = url.replace("sqlite:///", "", 1)
        Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    return url


engine = create_engine(
    _prepare_sqlite_path(settings.database_url),
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.db import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
