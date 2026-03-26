import os
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./techflow.db")
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    # Migration: add columns that may not exist in older DBs
    with engine.connect() as conn:
        for col_def in [
            "ALTER TABLE techcard ADD COLUMN ignored_at DATETIME",
            "ALTER TABLE techcard ADD COLUMN reading_time INTEGER",
        ]:
            try:
                conn.execute(__import__("sqlalchemy").text(col_def))
                conn.commit()
            except Exception:
                pass  # Column already exists


def get_session():
    with Session(engine) as session:
        yield session
