from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/studentdb')
print('Connecting to', DATABASE_URL)
engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    trans = conn.begin()
    try:
        print('Running ALTER TABLE statements...')
        conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN country_code VARCHAR;"))
        trans.commit()
        print('Migration committed')
    except Exception as e:
        print('Migration error:', repr(e))
        try:
            trans.rollback()
        except Exception:
            pass
