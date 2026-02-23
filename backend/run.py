from app import create_app, db
from models import User
from flask import Blueprint, request, jsonify
from sqlalchemy import inspect, text
from sqlalchemy.orm import load_only

app = create_app()
api_bp = Blueprint('api', __name__)

@app.route('/')
def home():
    return "Hello, World!"

@api_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'phone': getattr(user, 'phone', None),
        'countryCode': getattr(user, 'country_code', None)
    } for user in users])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Ensure new columns exist in DB (simple migration)
        inspector = inspect(db.engine)
        try:
            cols = [c['name'] for c in inspector.get_columns('users')]
        except Exception:
            cols = []
        with db.engine.connect() as conn:
            if 'phone' not in cols:
                conn.execute(text('ALTER TABLE users ADD COLUMN phone VARCHAR'))
            if 'country_code' not in cols:
                conn.execute(text('ALTER TABLE users ADD COLUMN country_code VARCHAR'))
            # Add logo column to universities if not exists
            try:
                uni_cols = [c['name'] for c in inspector.get_columns('universities')]
            except Exception:
                uni_cols = []
            if 'logo' not in uni_cols:
                try:
                    conn.execute(text('ALTER TABLE universities ADD COLUMN logo TEXT'))
                except Exception:
                    pass
            if 'city' not in uni_cols:
                try:
                    conn.execute(text("ALTER TABLE universities ADD COLUMN city VARCHAR NOT NULL DEFAULT ''"))
                except Exception:
                    pass
            conn.commit()
        # إضافة أدمن افتراضي إذا لم يوجد
        try:
            exists = User.query.options(load_only(User.email)).filter_by(email='admin@admin.com').first()
        except Exception as e:
            # If columns missing, try to add them then retry a minimal select
            print('User query failed, attempting to ensure columns exist:', e)
            with db.engine.connect() as conn:
                try:
                    conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR'))
                except Exception:
                    pass
                try:
                    conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR'))
                except Exception:
                    pass
            db.session.commit()
            exists = User.query.options(load_only(User.email)).filter_by(email='admin@admin.com').first()

        if not exists:
            admin = User(
                id='1',
                name='admin',
                email='admin@admin.com',
                password='admin',  # يفضل لاحقاً تشفيرها
                role='ADMIN'
            )
            db.session.add(admin)
            db.session.commit()
    app.run(debug=True)
