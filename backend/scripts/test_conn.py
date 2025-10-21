# scripts/test_conn.py
import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine, text

db_url = os.getenv("SQLALCHEMY_DATABASE_URL")
print("Using DB URL:", "<redacted>" if db_url else None)

if not db_url:
    raise SystemExit("SQLALCHEMY_DATABASE_URL not set")

try:
    engine = create_engine(db_url, connect_args={})
    with engine.connect() as conn:
        r = conn.execute(text("select 1")).fetchone()
    print("✅ Connected, select 1 ->", r)
except Exception as e:
    print("DB connection failed:", type(e).__name__, str(e))
    raise
