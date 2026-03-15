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
            if 'is_active' not in cols:
                try:
                    conn.execute(text('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE'))
                except Exception:
                    pass
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
            # Add name_in_arabic to programs if not exists
            try:
                prog_cols = [c['name'] for c in inspector.get_columns('programs')]
            except Exception:
                prog_cols = []
            if 'name_in_arabic' not in prog_cols:
                try:
                    conn.execute(text('ALTER TABLE programs ADD COLUMN name_in_arabic VARCHAR'))
                    conn.commit()
                except Exception:
                    pass
            if 'category' not in prog_cols:
                try:
                    conn.execute(text('ALTER TABLE programs ADD COLUMN category VARCHAR'))
                    conn.commit()
                except Exception:
                    pass
            for col, typ in [('period_id', 'VARCHAR'), ('fee_before_discount', 'FLOAT'), ('deposit', 'FLOAT'), ('cash_price', 'FLOAT'), ('country', 'VARCHAR')]:
                if col not in prog_cols:
                    try:
                        conn.execute(text(f'ALTER TABLE programs ADD COLUMN {col} {typ}'))
                        conn.commit()
                    except Exception:
                        pass
            # Ensure periods table has active column (add only if missing; never drop data)
            try:
                if 'periods' in inspector.get_table_names():
                    period_cols = [c['name'] for c in inspector.get_columns('periods')]
                    if 'active' not in period_cols:
                        conn.execute(text('ALTER TABLE periods ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE'))
                        conn.commit()
            except Exception as e:
                print('Periods active column check:', e)
            # Ensure applications table has period_id column
            try:
                if 'applications' in inspector.get_table_names():
                    app_cols = [c['name'] for c in inspector.get_columns('applications')]
                    if 'period_id' not in app_cols:
                        conn.execute(text('ALTER TABLE applications ADD COLUMN period_id VARCHAR REFERENCES periods(id)'))
                        conn.commit()
                    for col, typ in [('responsible_id', 'VARCHAR REFERENCES users(id)'), ('cost', 'FLOAT'), ('commission', 'FLOAT'), ('sale_amount', 'FLOAT'), ('currency', 'VARCHAR')]:
                        if col not in app_cols:
                            try:
                                conn.execute(text(f'ALTER TABLE applications ADD COLUMN {col} {typ}'))
                                conn.commit()
                            except Exception:
                                pass
            except Exception as e:
                print('Applications period_id column check:', e)
            # Ensure students table has created_at column
            try:
                if 'students' in inspector.get_table_names():
                    student_cols = [c['name'] for c in inspector.get_columns('students')]
                    if 'created_at' not in student_cols:
                        conn.execute(text('ALTER TABLE students ADD COLUMN created_at VARCHAR'))
                        conn.commit()
            except Exception as e:
                print('Students created_at column check:', e)
            # Ensure application_messages has sender_user_id (who sent the message)
            try:
                if 'application_messages' in inspector.get_table_names():
                    msg_cols = [c['name'] for c in inspector.get_columns('application_messages')]
                    if 'sender_user_id' not in msg_cols:
                        conn.execute(text('ALTER TABLE application_messages ADD COLUMN sender_user_id VARCHAR'))
                        conn.commit()
            except Exception as e:
                print('application_messages sender_user_id column check:', e)
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
