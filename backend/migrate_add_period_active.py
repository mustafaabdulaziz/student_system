"""Add active column to periods table if missing."""
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/studentdb')
print('Connecting to', DATABASE_URL)
engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE periods ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.commit()
        print('periods.active column ensured')
    except Exception as e:
        print('Migration failed (run once):', e)
