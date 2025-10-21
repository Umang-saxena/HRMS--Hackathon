# app/db.py
import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# Read env var. Make sure load_dotenv() has been called BEFORE importing app.db
DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL") or os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # fail loudly with a clear error
    raise RuntimeError(
        "SQLALCHEMY_DATABASE_URL (or DATABASE_URL) is not set. "
        "Set it in your .env or environment before starting the app."
    )

# Create SQLAlchemy engine. pool_pre_ping avoids stale connections.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a SQLAlchemy Session and ensures it is closed.

    Usage in routes:
        from fastapi import Depends
        from app.db import get_db

        def some_route(db: Session = Depends(get_db)):
            ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
