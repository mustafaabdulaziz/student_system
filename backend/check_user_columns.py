from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/studentdb')
print('Connecting to', DATABASE_URL)
engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"))
    cols = [r[0] for r in res]
    print('Columns:', cols)
