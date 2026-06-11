import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres:210302116@localhost:5432/studentdb')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
