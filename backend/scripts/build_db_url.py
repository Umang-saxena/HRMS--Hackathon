# backend/scripts/build_db_url.py
import urllib.parse, os

user = "postgres"
password = os.environ.get("DATABASE_PASS", "12345Hanu_Saxena12345")
host = "db.ilzbhxjqrdihwjvtfeyk.supabase.co"
port = 5432
dbname = "postgres"

safe_pass = urllib.parse.quote_plus(password)
print(f"postgresql+psycopg2://{user}:{safe_pass}@{host}:{port}/{dbname}")
