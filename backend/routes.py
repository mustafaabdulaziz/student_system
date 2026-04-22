
from flask import Blueprint, request, jsonify, session, current_app, send_from_directory, url_for
from models import db, Student, University, Program, Application, User, Notification, Period, NewsItem, IncomingPayment, OutgoingPayment
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename

api_bp = Blueprint('api', __name__)

# Uploads at project root: student_system/uploads (when backend is in student_system/backend)
UPLOADS_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads'))


def _iso_timestamp():
    return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def _normalize_ts_z(ts):
    """Normalize stored ISO-ish string to API format ending with Z."""
    if not ts:
        return None
    if isinstance(ts, str) and ts.endswith('Z'):
        return ts
    if isinstance(ts, str) and 'T' in ts:
        return ts + 'Z' if not ts.endswith('Z') else ts
    if isinstance(ts, str):
        return ts + 'T00:00:00.000Z'
    return ts


def _application_updated_at_for_api(application):
    raw = getattr(application, 'updated_at', None) or application.created_at
    return _normalize_ts_z(raw) or _iso_timestamp()


def _student_updated_at_for_api(student):
    raw = getattr(student, 'updated_at', None) or getattr(student, 'created_at', None)
    return _normalize_ts_z(raw)


def _touch_application_and_student(application):
    """Bump application.updated_at and the parent student's updated_at."""
    if not application:
        return
    now = _iso_timestamp()
    application.updated_at = now
    st = Student.query.get(application.student_id)
    if st:
        st.updated_at = now


def _query_int_arg(name, default_value, min_value=1, max_value=500):
    raw = request.args.get(name)
    if raw is None:
        return default_value
    try:
        parsed = int(raw)
    except (TypeError, ValueError):
        return default_value
    if parsed < min_value:
        return min_value
    if parsed > max_value:
        return max_value
    return parsed


def _wants_pagination():
    return request.args.get('page') is not None or request.args.get('pageSize') is not None


def _serialize_student(s):
    return {
        'id': s.id,
        'firstName': s.first_name,
        'lastName': s.last_name,
        'passportNumber': s.passport_number,
        'fatherName': s.father_name,
        'motherName': s.mother_name,
        'gender': s.gender,
        'phone': s.phone,
        'email': s.email,
        'nationality': s.nationality,
        'degreeTarget': s.degree_target,
        'dob': s.dob,
        'residenceCountry': s.residence_country,
        'userId': getattr(s, 'user_id', None),
        'createdAt': getattr(s, 'created_at', None),
        'updatedAt': _student_updated_at_for_api(s) or _normalize_ts_z(getattr(s, 'created_at', None))
    }


def _serialize_program(p):
    return {
        'id': p.id,
        'universityId': p.university_id,
        'name': p.name,
        'nameInArabic': getattr(p, 'name_in_arabic', None),
        'category': getattr(p, 'category', None),
        'degree': p.degree,
        'language': p.language,
        'years': p.years,
        'deadline': getattr(p, 'deadline', None),
        'periodId': getattr(p, 'period_id', None),
        'fee': p.fee,
        'feeBeforeDiscount': getattr(p, 'fee_before_discount', None),
        'deposit': getattr(p, 'deposit', None),
        'cashPrice': getattr(p, 'cash_price', None),
        'currency': getattr(p, 'currency', 'USD'),
        'country': getattr(p, 'country', None),
        'description': p.description,
        'isOpen': bool(getattr(p, 'is_open', True))
    }


def _normalize_created_at(created_at):
    if not created_at:
        return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    if created_at.endswith('Z'):
        return created_at
    if 'T' in created_at:
        return created_at + 'Z'
    return created_at + 'T00:00:00.000Z'


def _serialize_application(a, program_by_id):
    p = program_by_id.get(a.program_id)
    return {
        'id': a.id,
        'studentId': a.student_id,
        'programId': a.program_id,
        'periodId': getattr(a, 'period_id', None) or (p.period_id if p else None),
        'status': a.status,
        'semester': a.semester,
        'createdAt': _normalize_created_at(a.created_at),
        'updatedAt': _application_updated_at_for_api(a),
        'files': [url_for('api.upload_file', filename=f, _external=False) for f in (a.files or [])],
        'userId': a.user_id,
        'agentPhone': a.user.phone if a.user else None,
        'agentName': a.user.name if a.user else None,
        'agentCountryCode': a.user.country_code if a.user else None,
        'responsibleId': getattr(a, 'responsible_id', None),
        'responsibleName': a.responsible.name if getattr(a, 'responsible', None) and a.responsible else None,
        'annualPayment': getattr(a, 'annual_payment', None),
        'educationVat': getattr(a, 'education_vat', None),
        'grossCommission': getattr(a, 'gross_commission', None),
        'abroadVat': getattr(a, 'abroad_vat', None),
        'netCommission': getattr(a, 'net_commission', None),
        'bonusMax': getattr(a, 'bonus_max', None),
        'bonusMin': getattr(a, 'bonus_min', None),
        'agencyCommission': getattr(a, 'agency_commission', None),
        'agencyBonus': getattr(a, 'agency_bonus', None),
        'agencyContractAmount': getattr(a, 'agency_contract_amount', None),
        'agencyPaidContractAmount': getattr(a, 'agency_paid_contract_amount', None),
        'agencyPaidContractDescription': getattr(a, 'agency_paid_contract_description', None),
        'agencyPaidContractDescriptionDate': getattr(a, 'agency_paid_contract_description_date', None),
        'agencyPaidContractPaymentMethod': getattr(a, 'agency_paid_contract_payment_method', None),
        'currency': getattr(a, 'currency', None) or 'USD',
        'remainingMin': getattr(a, 'remaining_min', None),
        'remainingMax': getattr(a, 'remaining_max', None)
    }


def _request_role_value():
    if request.method == 'GET':
        return (request.args.get('role') or '').upper()
    if request.is_json:
        data = request.get_json(silent=True) or {}
        return (data.get('role') or '').upper()
    return (request.form.get('role') or '').upper()


def _require_admin():
    if _request_role_value() != 'ADMIN':
        return jsonify({'message': 'Only admin can access this endpoint'}), 403
    return None


def _next_sequence(model_cls):
    max_value = db.session.query(db.func.max(model_cls.sequence_number)).scalar()
    return int(max_value or 0) + 1

# إضافة مستخدم جديد (خاص بالمسؤول)
@api_bp.route('/users', methods=['POST'])
def add_user():
    data = request.json
    if not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'يجب تعبئة جميع الحقول'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'الإيميل مستخدم بالفعل'}), 409
    user = User(
        id=str(uuid.uuid4()),
        name=data['name'],
        email=data['email'],
        password=data['password'],
        role=data.get('role', 'USER'),
        phone=data.get('phone'),
        country_code=data.get('countryCode'),
        is_active=True
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'تمت إضافة المستخدم', 'id': user.id}), 201

# تحديث الملف الشخصي (كلمة السر والهاتف)
@api_bp.route('/users/update-profile', methods=['PUT'])
def update_profile():
    data = request.json
    user_id = data.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'المستخدم غير موجود'}), 404
    
    if 'name' in data and data['name']:
        user.name = data['name'].strip()
    if 'email' in data and data['email']:
        existing = User.query.filter(User.email == data['email'].strip(), User.id != user_id).first()
        if existing:
            return jsonify({'message': 'الإيميل مستخدم من قبل مستخدم آخر'}), 409
        user.email = data['email'].strip()
    if data.get('password'):
        user.password = data['password']
    if 'phone' in data:
        user.phone = data['phone']
    if 'countryCode' in data:
        user.country_code = data.get('countryCode')
        
    db.session.commit()
    return jsonify({
        'message': 'تم تحديث البيانات بنجاح',
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'phone': user.phone,
            'countryCode': getattr(user, 'country_code', None),
            'active': getattr(user, 'is_active', True)
        }
    }), 200

# الحصول على جميع المستخدمين
@api_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'name': u.name,
        'email': u.email,
        'role': u.role,
        'phone': u.phone,
        'countryCode': getattr(u, 'country_code', None),
        'active': getattr(u, 'is_active', True)
    } for u in users])

# حذف مستخدم
@api_bp.route('/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'المستخدم غير موجود'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'تم حذف المستخدم'}), 200

# تحديث مستخدم (تعديل + تفعيل/إلغاء تفعيل)
@api_bp.route('/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'المستخدم غير موجود'}), 404
    data = request.json or {}
    if 'name' in data:
        user.name = data['name']
    if 'email' in data:
        if User.query.filter(User.email == data['email'], User.id != user_id).first():
            return jsonify({'message': 'الإيميل مستخدم من قبل مستخدم آخر'}), 409
        user.email = data['email']
    if 'role' in data:
        user.role = data['role']
    if 'phone' in data:
        user.phone = data['phone']
    if 'countryCode' in data:
        user.country_code = data['countryCode']
    if 'password' in data and data['password']:
        user.password = data['password']
    if 'active' in data:
        user.is_active = bool(data['active'])
    db.session.commit()
    return jsonify({'message': 'تم تحديث المستخدم', 'id': user.id}), 200

# Login endpoint
@api_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    if user and user.password == password:
        if not getattr(user, 'is_active', True):
            return jsonify({'success': False, 'message': 'هذا الحساب غير مفعل', 'code': 'ACCOUNT_DEACTIVATED'}), 401
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'phone': user.phone,
                'countryCode': getattr(user, 'country_code', None),
                'active': getattr(user, 'is_active', True)
            }
        })
    return jsonify({'success': False, 'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401

# Students
@api_bp.route('/students', methods=['GET'])
def get_students():
    user_role = request.args.get('role')
    user_id = request.args.get('user_id')
    query = Student.query
    if user_role == 'agent' and user_id:
        query = query.filter_by(user_id=user_id)
    query = query.order_by(Student.created_at.desc())
    if _wants_pagination():
        page = _query_int_arg('page', 1, min_value=1, max_value=1000000)
        page_size = _query_int_arg('pageSize', 80, min_value=1, max_value=500)
        total = query.count()
        students = query.offset((page - 1) * page_size).limit(page_size).all()
        return jsonify({
            'items': [_serialize_student(s) for s in students],
            'total': total,
            'page': page,
            'pageSize': page_size,
            'totalPages': max(1, (total + page_size - 1) // page_size)
        })
    students = query.all()
    # Debug log: show how many students returned and their user_ids
    try:
        print(f"GET /api/students called with role={user_role} user_id={user_id} -> returning {len(students)} students")
        sample = [(s.id, getattr(s, 'user_id', None)) for s in students[:10]]
        print('sample students (id,user_id)=', sample)
    except Exception:
        pass

    return jsonify([_serialize_student(s) for s in students])

@api_bp.route('/students', methods=['POST'])
def add_student():
    data = request.json
    user_role = data.get('role')
    user_id = data.get('user_id')
    if user_role == 'agent' and not user_id:
        return jsonify({'message': 'Agent user_id required'}), 400
    created_at = _iso_timestamp()
    student = Student(
        id=str(uuid.uuid4()),
        first_name=data['firstName'],
        last_name=data['lastName'],
        passport_number=data['passportNumber'],
        father_name=data['fatherName'],
        mother_name=data['motherName'],
        gender=data['gender'],
        phone=data.get('phone') or '',
        email=data.get('email') or '',
        nationality=data['nationality'],
        degree_target=data['degreeTarget'],
        dob=data['dob'],
        residence_country=data['residenceCountry'],
        user_id=user_id,
        created_at=created_at,
        updated_at=created_at
    )
    db.session.add(student)
    db.session.commit()
    # 7. Notify admin and users when an agent adds a student
    if user_id:
        agent_user = User.query.get(user_id)
        if agent_user and (agent_user.role or '').lower() == 'agent':
            for u in User.query.filter(User.role.in_(['ADMIN', 'USER'])).all():
                n = Notification(
                    id=str(uuid.uuid4()),
                    user_id=u.id,
                    title="New student by agent",
                    message=f"Agent {agent_user.name} added student {student.first_name} {student.last_name}.",
                    link="/students",
                    created_at=datetime.utcnow().isoformat(),
                    type="STATUS"
                )
                db.session.add(n)
            db.session.commit()
    print(f"Created student {student.id} user_id={user_id}")
    return jsonify({'message': 'Student added', 'id': student.id, 'createdAt': created_at, 'updatedAt': created_at}), 201


@api_bp.route('/students/<student_id>', methods=['PUT'])
def update_student(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'message': 'Student not found'}), 404
    data = request.json
    student.first_name = data.get('firstName', student.first_name)
    student.last_name = data.get('lastName', student.last_name)
    student.passport_number = data.get('passportNumber', student.passport_number)
    student.father_name = data.get('fatherName', student.father_name)
    student.mother_name = data.get('motherName', student.mother_name)
    student.gender = data.get('gender', student.gender)
    student.phone = data.get('phone', student.phone)
    student.email = data.get('email', student.email)
    student.nationality = data.get('nationality', student.nationality)
    student.degree_target = data.get('degreeTarget', student.degree_target)
    student.dob = data.get('dob', student.dob)
    student.residence_country = data.get('residenceCountry', student.residence_country)
    student.updated_at = _iso_timestamp()
    db.session.commit()
    return jsonify({'message': 'Student updated', 'updatedAt': student.updated_at})


# Universities
@api_bp.route('/universities', methods=['GET'])
def get_universities():
    universities = University.query.all()
    return jsonify([{
        'id': u.id,
        'name': u.name,
        'website': u.website,
        'country': u.country,
        'city': getattr(u, 'city', ''),
        'description': u.description,
        'logo': getattr(u, 'logo', None)
    } for u in universities])

@api_bp.route('/universities', methods=['POST'])
def add_university():
    data = request.json
    user_role = data.get('role')
    if user_role == 'agent':
        return jsonify({'message': 'Agents are not allowed to add universities'}), 403
    university = University(
        id=str(uuid.uuid4()),
        name=data['name'],
        website=data['website'],
        country=data['country'],
        city=data.get('city', ''),
        description=data['description'],
        logo=data.get('logo')  # optional logo (base64 or URL)
    )
    db.session.add(university)
    db.session.commit()
    return jsonify({'message': 'University added', 'id': university.id, 'logo': university.logo}), 201

# Programs
@api_bp.route('/programs', methods=['GET'])
def get_programs():
    query = Program.query.order_by(Program.name.asc())
    if _wants_pagination():
        page = _query_int_arg('page', 1, min_value=1, max_value=1000000)
        page_size = _query_int_arg('pageSize', 80, min_value=1, max_value=500)
        total = query.count()
        programs = query.offset((page - 1) * page_size).limit(page_size).all()
        return jsonify({
            'items': [_serialize_program(p) for p in programs],
            'total': total,
            'page': page,
            'pageSize': page_size,
            'totalPages': max(1, (total + page_size - 1) // page_size)
        })
    programs = query.all()
    return jsonify([_serialize_program(p) for p in programs])

@api_bp.route('/programs', methods=['POST'])
def add_program():
    data = request.json or {}
    user_role = data.get('role')
    if user_role == 'agent':
        return jsonify({'message': 'Agents are not allowed to add programs'}), 403
    # deadline: frontend may not send it (replaced by period); use empty string if DB column is NOT NULL
    deadline_val = data.get('deadline') if data.get('deadline') else ''
    fee_val = data.get('fee')
    if fee_val is None:
        fee_val = 0
    try:
        fee_val = float(fee_val)
    except (TypeError, ValueError):
        fee_val = 0
    program = Program(
        id=str(uuid.uuid4()),
        university_id=data.get('universityId') or '',
        name=data.get('name') or '',
        name_in_arabic=data.get('nameInArabic') or None,
        category=data.get('category') or None,
        degree=data.get('degree') or 'Bachelor',
        language=data.get('language') or 'English',
        years=int(data.get('years', 4)) if data.get('years') is not None else 4,
        deadline=deadline_val,
        period_id=data.get('periodId') or None,
        fee=fee_val,
        fee_before_discount=data.get('feeBeforeDiscount'),
        deposit=data.get('deposit'),
        cash_price=data.get('cashPrice'),
        currency=data.get('currency') or 'USD',
        country=data.get('country') or None,
        description=data.get('description') or '',
        is_open=True if data.get('isOpen') is None else bool(data.get('isOpen'))
    )
    try:
        db.session.add(program)
        db.session.commit()
        return jsonify({'message': 'Program added', 'id': program.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Program add failed: ' + str(e)}), 500

# Delete Program
@api_bp.route('/programs/<prog_id>', methods=['DELETE'])
def delete_program(prog_id):
    program = Program.query.get(prog_id)
    if not program:
        return jsonify({'message': 'البرنامج غير موجود'}), 404
    db.session.delete(program)
    db.session.commit()
    return jsonify({'message': 'تم حذف البرنامج'}), 200

# Update Program
@api_bp.route('/programs/<prog_id>', methods=['PUT'])
def update_program(prog_id):
    program = Program.query.get(prog_id)
    if not program:
        return jsonify({'message': 'البرنامج غير موجود'}), 404
    data = request.json
    program.university_id = data.get('universityId', program.university_id)
    program.name = data.get('name', program.name)
    if 'nameInArabic' in data:
        program.name_in_arabic = data['nameInArabic'] or None
    if 'category' in data:
        program.category = data['category'] or None
    program.degree = data.get('degree', program.degree)
    program.language = data.get('language', program.language)
    if 'years' in data:
        program.years = data['years']
    if 'deadline' in data:
        program.deadline = data['deadline']
    if 'periodId' in data:
        program.period_id = data['periodId'] or None
    if 'fee' in data:
        program.fee = data['fee']
    if 'feeBeforeDiscount' in data:
        program.fee_before_discount = data['feeBeforeDiscount']
    if 'deposit' in data:
        program.deposit = data['deposit']
    if 'cashPrice' in data:
        program.cash_price = data['cashPrice']
    if 'currency' in data:
        program.currency = data['currency']
    if 'country' in data:
        program.country = data['country'] or None
    if 'description' in data:
        program.description = data['description']
    if 'isOpen' in data:
        program.is_open = bool(data['isOpen'])
    
    db.session.commit()
    return jsonify({'message': 'تم تحديث البرنامج', 'id': program.id}), 200

# Update University
@api_bp.route('/universities/<uni_id>', methods=['PUT'])
def update_university(uni_id):
    university = University.query.get(uni_id)
    if not university:
        return jsonify({'message': 'الجامعة غير موجودة'}), 404
    data = request.json
    university.name = data.get('name', university.name)
    university.website = data.get('website', university.website)
    university.country = data.get('country', university.country)
    university.city = data.get('city', getattr(university, 'city', ''))
    university.description = data.get('description', university.description)
    # logo: allow setting to None (remove), a new value, or keep existing
    if 'logo' in data:
        university.logo = data['logo']  # can be None or a string
    db.session.commit()
    return jsonify({'message': 'تم تحديث الجامعة', 'id': university.id}), 200

# Delete University
@api_bp.route('/universities/<uni_id>', methods=['DELETE'])
def delete_university(uni_id):
    university = University.query.get(uni_id)
    if not university:
        return jsonify({'message': 'الجامعة غير موجودة'}), 404
    db.session.delete(university)
    db.session.commit()
    return jsonify({'message': 'تم حذف الجامعة'}), 200


# Periods (admin only - no auth check here; frontend restricts to ADMIN)
@api_bp.route('/periods', methods=['GET'])
def get_periods():
    periods = Period.query.order_by(Period.start_date.desc()).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'startDate': p.start_date,
        'endDate': p.end_date,
        'active': getattr(p, 'active', True)
    } for p in periods])


@api_bp.route('/periods', methods=['POST'])
def add_period():
    data = request.json
    if not data.get('name') or not data.get('startDate') or not data.get('endDate'):
        return jsonify({'message': 'Name, start date and end date required'}), 400
    period = Period(
        id=str(uuid.uuid4()),
        name=data['name'].strip(),
        start_date=data['startDate'],
        end_date=data['endDate'],
        active=data.get('active', True) if isinstance(data.get('active'), bool) else True
    )
    db.session.add(period)
    db.session.commit()
    return jsonify({'message': 'Period added', 'id': period.id}), 201


@api_bp.route('/periods/<period_id>', methods=['PUT'])
def update_period(period_id):
    period = Period.query.get(period_id)
    if not period:
        return jsonify({'message': 'Period not found'}), 404
    data = request.json
    if data.get('name'):
        period.name = data['name'].strip()
    if data.get('startDate'):
        period.start_date = data['startDate']
    if data.get('endDate'):
        period.end_date = data['endDate']
    if 'active' in data and isinstance(data['active'], bool):
        period.active = data['active']
    db.session.commit()
    return jsonify({'message': 'Period updated'})


@api_bp.route('/periods/<period_id>', methods=['DELETE'])
def delete_period(period_id):
    period = Period.query.get(period_id)
    if not period:
        return jsonify({'message': 'Period not found'}), 404
    db.session.delete(period)
    db.session.commit()
    return jsonify({'message': 'Period deleted'})


@api_bp.route('/applications', methods=['GET'])
def get_applications():
    user_role = request.args.get('role')
    user_id = request.args.get('user_id')
    query = Application.query
    if user_role == 'agent' and user_id:
        query = query.filter_by(user_id=user_id)
    query = query.order_by(Application.created_at.desc())
    if _wants_pagination():
        page = _query_int_arg('page', 1, min_value=1, max_value=1000000)
        page_size = _query_int_arg('pageSize', 80, min_value=1, max_value=500)
        total = query.count()
        applications = query.offset((page - 1) * page_size).limit(page_size).all()
        program_ids = [a.program_id for a in applications if a.program_id]
        program_by_id = {p.id: p for p in Program.query.filter(Program.id.in_(program_ids)).all()} if program_ids else {}
        return jsonify({
            'items': [_serialize_application(a, program_by_id) for a in applications],
            'total': total,
            'page': page,
            'pageSize': page_size,
            'totalPages': max(1, (total + page_size - 1) // page_size)
        })
    applications = query.all()
    program_ids = [a.program_id for a in applications if a.program_id]
    program_by_id = {p.id: p for p in Program.query.filter(Program.id.in_(program_ids)).all()} if program_ids else {}
    return jsonify([_serialize_application(a, program_by_id) for a in applications])


import os
import pandas as pd
from models import ApplicationMessage

@api_bp.route('/applications', methods=['POST'])
def add_application():
    if 'files' in request.files:
        files = request.files.getlist('files')
    else:
        files = []
    # باقي البيانات
    student_id = request.form.get('studentId')
    program_id = request.form.get('programId')
    period_id = request.form.get('periodId') or None
    status = request.form.get('status')
    semester = request.form.get('semester')
    user_role = request.form.get('role')
    user_id = request.form.get('user_id')
    responsible_id = request.form.get('responsible_id') or None
    created_at = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    saved_files = []
    upload_folder = UPLOADS_DIR
    os.makedirs(upload_folder, exist_ok=True)
    for file in files:
        filename = f"{uuid.uuid4()}_{file.filename}"
        file.save(os.path.join(upload_folder, filename))
        saved_files.append(filename)
    application = Application(
        id=_generate_app_id(),
        student_id=student_id,
        program_id=program_id,
        period_id=period_id,
        status=status,
        semester=semester,
        created_at=created_at,
        updated_at=created_at,
        files=saved_files,
        user_id=user_id,
        responsible_id=responsible_id
    )
    db.session.add(application)
    stu = Student.query.get(student_id)
    if stu:
        stu.updated_at = created_at
    db.session.commit()
    # 7. Notify admin and users when an agent adds an application
    if user_id:
        agent_user = User.query.get(user_id)
        if agent_user and (agent_user.role or '').lower() == 'agent':
            for u in User.query.filter(User.role.in_(['ADMIN', 'USER'])).all():
                n = Notification(
                    id=str(uuid.uuid4()),
                    user_id=u.id,
                    title="New application by agent",
                    message=f"Agent {agent_user.name} added application #{application.id}.",
                    link=f"/applications/{application.id}",
                    created_at=datetime.utcnow().isoformat(),
                    type="STATUS"
                )
                db.session.add(n)
            db.session.commit()
    file_urls = [url_for('api.upload_file', filename=f, _external=False) for f in saved_files]
    return jsonify({
        'message': 'Application added',
        'id': application.id,
        'files': file_urls,
        'createdAt': application.created_at,
        'updatedAt': application.updated_at or application.created_at,
        'studentId': student_id,
        'studentUpdatedAt': stu.updated_at if stu else None
    }), 201


def _generate_app_id():
    import random
    # Try random 6-digit numbers up to a few times to avoid collisions
    for _ in range(10):
        n = random.randint(0, 999999)
        candidate = f"APP{n:06d}"
        if not Application.query.get(candidate):
            return candidate
    # Fallback: use uuid-derived suffix (uppercased)
    return f"APP{uuid.uuid4().hex[:6].upper()}"


@api_bp.route('/applications_v2', methods=['POST'])
def add_application_v2():
    # Backwards-compatible endpoint that generates APP###### ids directly
    if 'files' in request.files:
        files = request.files.getlist('files')
    else:
        files = []
    student_id = request.form.get('studentId')
    program_id = request.form.get('programId')
    period_id = request.form.get('periodId') or None
    status = request.form.get('status')
    semester = request.form.get('semester')
    created_at = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    saved_files = []
    upload_folder = UPLOADS_DIR
    os.makedirs(upload_folder, exist_ok=True)
    for file in files:
        filename = f"{uuid.uuid4()}_{file.filename}"
        file.save(os.path.join(upload_folder, filename))
        saved_files.append(filename)

    app_id = _generate_app_id()
    application = Application(
        id=app_id,
        student_id=student_id,
        program_id=program_id,
        period_id=period_id,
        status=status,
        semester=semester,
        created_at=created_at,
        updated_at=created_at,
        files=saved_files
    )
    db.session.add(application)
    stu = Student.query.get(student_id)
    if stu:
        stu.updated_at = created_at
    db.session.commit()
    file_urls = [url_for('api.upload_file', filename=f, _external=False) for f in saved_files]
    return jsonify({
        'message': 'Application added',
        'id': application.id,
        'files': file_urls,
        'createdAt': application.created_at,
        'updatedAt': application.updated_at or application.created_at,
        'studentId': student_id,
        'studentUpdatedAt': _student_updated_at_for_api(stu) if stu else None
    }), 201


# Messages for applications
@api_bp.route('/applications/<app_id>/messages', methods=['GET'])
def get_application_messages(app_id):
    msgs = ApplicationMessage.query.filter_by(application_id=app_id).order_by(ApplicationMessage.created_at).all()
    out = []
    for m in msgs:
        obj = {
            'id': m.id,
            'applicationId': m.application_id,
            'sender': m.sender,
            'message': m.message,
            'createdAt': m.created_at
        }
        if getattr(m, 'sender_user_id', None):
            u = User.query.get(m.sender_user_id)
            obj['senderName'] = u.name if u else None
        else:
            obj['senderName'] = None
        out.append(obj)
    return jsonify(out)


@api_bp.route('/applications/<app_id>/messages', methods=['POST'])
def post_application_message(app_id):
    data = request.json or {}
    sender = data.get('sender')
    message = data.get('message')
    sender_user_id = data.get('senderUserId') or data.get('sender_user_id')
    if not sender or not message:
        return jsonify({'message': 'sender and message required'}), 400
    msg = ApplicationMessage(
        id=str(uuid.uuid4()),
        application_id=app_id,
        sender=sender,
        sender_user_id=sender_user_id,
        message=message,
        created_at=datetime.utcnow().isoformat()
    )
    db.session.add(msg)
    db.session.flush()
    application = Application.query.get(app_id)
    if application:
        _touch_application_and_student(application)
    # Notification Logic
    if application:
        if sender == 'ADMIN':
            # Notify Application Owner (User/Agent)
            if application.user_id:
                n = Notification(
                    id=str(uuid.uuid4()),
                    user_id=application.user_id,
                    title="New Message",
                    message=f"Admin: {message[:50]}...",
                    link=f"/applications/{app_id}",
                    created_at=datetime.utcnow().isoformat(),
                    type="MESSAGE"
                )
                db.session.add(n)
        else:
            # Notify Admins and Users (managers)
            admins_and_users = User.query.filter(User.role.in_(['ADMIN', 'USER'])).all()
            for user in admins_and_users:
                if user.id == application.user_id: continue # Don't notify self if user is owner
                n = Notification(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    title="New Message",
                    message=f"App #{app_id}: {message[:50]}...",
                    link=f"/applications/{app_id}",
                    created_at=datetime.utcnow().isoformat(),
                    type="MESSAGE"
                )
                db.session.add(n)
    db.session.commit()

    st_after = Student.query.get(application.student_id) if application else None
    resp = {
        'message': 'Message added',
        'id': msg.id,
        'updatedAt': _application_updated_at_for_api(application) if application else None,
        'studentId': application.student_id if application else None,
        'studentUpdatedAt': _student_updated_at_for_api(st_after) if st_after else None
    }
    if sender_user_id:
        u = User.query.get(sender_user_id)
        resp['senderName'] = u.name if u else None
    else:
        resp['senderName'] = None
    return jsonify(resp), 201


@api_bp.route('/universities/import', methods=['POST'])
def import_universities():
    if 'file' not in request.files:
        return jsonify({'message': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    upload_folder = UPLOADS_DIR
    os.makedirs(upload_folder, exist_ok=True)
    filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)
    try:
        df = pd.read_excel(filepath)
    except Exception as e:
        return jsonify({'message': 'Failed to read Excel: ' + str(e)}), 400

    added = []
    for _, row in df.iterrows():
        name = str(row.get('name') or row.get('اسم') or row.get('Name') or '').strip()
        website = str(row.get('website') or row.get('موقع') or row.get('Website') or '').strip()
        country = str(row.get('country') or row.get('دولة') or row.get('Country') or 'Turkey').strip()
        city = str(row.get('city') or row.get('مدينة') or row.get('City') or '').strip()
        description = str(row.get('description') or row.get('وصف') or row.get('Description') or '').strip()
        # Logo: support columns named logo / Logo / شعار — expected to be a URL (http/https)
        logo_raw = str(row.get('logo') or row.get('Logo') or row.get('شعار') or '').strip()
        # Accept only valid-looking URLs; ignore empty or 'nan' values
        logo = logo_raw if logo_raw and logo_raw.lower() != 'nan' and logo_raw.startswith('http') else None
        if not name:
            continue
        if University.query.filter_by(name=name).first():
            continue
        uni = University(
            id=str(uuid.uuid4()),
            name=name,
            website=website or '',
            country=country,
            city=city or '',
            description=description or '',
            logo=logo
        )
        db.session.add(uni)
        added.append({
            'id': uni.id,
            'name': uni.name,
            'website': uni.website,
            'country': uni.country,
            'city': uni.city,
            'description': uni.description,
            'logo': uni.logo
        })

    db.session.commit()
    return jsonify({'message': f'Imported {len(added)} universities', 'added': added}), 201


# Serve uploaded files
@api_bp.route('/uploads/<path:filename>', methods=['GET'])
def upload_file(filename):
    upload_folder = UPLOADS_DIR
    return send_from_directory(upload_folder, filename, as_attachment=False)


# List files for an application / upload additional files
@api_bp.route('/applications/<app_id>/files', methods=['GET', 'POST'])
def application_files(app_id):
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'message': 'Application not found'}), 404

    upload_folder = UPLOADS_DIR
    os.makedirs(upload_folder, exist_ok=True)

    if request.method == 'GET':
        files = application.files or []
        files_info = [
            {
                'name': f.split('_', 1)[1] if '_' in f else f,
                'filename': f,
                'url': url_for('api.upload_file', filename=f, _external=False)
            } for f in files
        ]
        return jsonify(files_info)

    # POST: add more files to existing application
    if 'files' not in request.files:
        return jsonify({'message': 'No files provided'}), 400
    files = request.files.getlist('files')
    saved = []
    for file in files:
        filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
        file.save(os.path.join(upload_folder, filename))
        saved.append(filename)

    application.files = (application.files or []) + saved
    _touch_application_and_student(application)
    db.session.commit()

    # Notify admin, managers (USER), and responsible when an agent uploads files
    uploader_id = (request.form.get('user_id') or request.form.get('userId') or '').strip() or None
    if saved and uploader_id:
        uploader = User.query.get(uploader_id)
        if uploader and (uploader.role or '').lower() == 'agent':
            notify_ids = {u.id for u in User.query.filter(User.role.in_(['ADMIN', 'USER'])).all()}
            if getattr(application, 'responsible_id', None):
                notify_ids.add(application.responsible_id)
            notify_ids.discard(uploader_id)
            for uid in notify_ids:
                n = Notification(
                    id=str(uuid.uuid4()),
                    user_id=uid,
                    title='Application files uploaded',
                    message=f"Agent {uploader.name} uploaded file(s) to application #{application.id}.",
                    link=f"/applications/{application.id}",
                    created_at=datetime.utcnow().isoformat(),
                    type='STATUS'
                )
                db.session.add(n)
            db.session.commit()

    files_info = [
        {
            'name': f.split('_', 1)[1] if '_' in f else f,
            'filename': f,
            'url': url_for('api.upload_file', filename=f, _external=False)
        } for f in application.files
    ]
    stu = Student.query.get(application.student_id)
    return jsonify({
        'message': 'Files added',
        'files': files_info,
        'updatedAt': _application_updated_at_for_api(application),
        'studentId': application.student_id,
        'studentUpdatedAt': _student_updated_at_for_api(stu)
    }), 201

@api_bp.route('/applications/<app_id>/files/<path:filename>', methods=['DELETE'])
def delete_application_file(app_id, filename):
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'message': 'Application not found'}), 404

    current_files = application.files or []
    if filename not in current_files:
        return jsonify({'message': 'File not found in application'}), 404

    current_files.remove(filename)
    # SQLAlchemy requires assigning a new reference or mutating the mutable list properly if using JSON
    # It's safer to assign a new list of the remaining items.
    application.files = list(current_files)
    _touch_application_and_student(application)
    db.session.commit()

    upload_folder = UPLOADS_DIR
    file_path = os.path.join(upload_folder, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            pass # ignore if file already missing or locked

    stu = Student.query.get(application.student_id)
    return jsonify({
        'message': 'File deleted successfully',
        'updatedAt': _application_updated_at_for_api(application),
        'studentId': application.student_id,
        'studentUpdatedAt': _student_updated_at_for_api(stu)
    }), 200

# Update application status
@api_bp.route('/applications/<app_id>/status', methods=['PUT'])
def update_application_status(app_id):
    data = request.json
    new_status = data.get('status')
    if not new_status:
        return jsonify({'message': 'Status is required'}), 400
    
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'message': 'Application not found'}), 404
        
    application.status = new_status
    _touch_application_and_student(application)

    # 5. Notify agent (application owner) when status changes
    if application.user_id:
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=application.user_id,
            title="Application Status Update",
            message=f"Your application #{application.id} status changed to {new_status}",
            link=f"/applications/{application.id}",
            created_at=datetime.utcnow().isoformat(),
            type="STATUS"
        )
        db.session.add(notification)
    
    # 6. Notify admin(s) when application is sent to review (e.g. by agent)
    if new_status in ('Under Review', 'UnderReview', 'UNDER_REVIEW'):
        admins = User.query.filter(User.role == 'ADMIN').all()
        for admin in admins:
            n = Notification(
                id=str(uuid.uuid4()),
                user_id=admin.id,
                title="Application sent to review",
                message=f"Application #{application.id} has been sent to review.",
                link=f"/applications/{application.id}",
                created_at=datetime.utcnow().isoformat(),
                type="STATUS"
            )
            db.session.add(n)
    db.session.commit()

    stu = Student.query.get(application.student_id)
    return jsonify({
        'message': 'Status updated',
        'status': application.status,
        'updatedAt': _application_updated_at_for_api(application),
        'studentId': application.student_id,
        'studentUpdatedAt': _student_updated_at_for_api(stu)
    }), 200


@api_bp.route('/applications/<app_id>', methods=['PUT'])
def update_application(app_id):
    """Update application fields."""
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'message': 'Application not found'}), 404
    data = request.get_json() or {}
    if 'status' in data and data['status']:
        application.status = data['status']
    if 'userId' in data:
        application.user_id = data['userId'] or None
    if 'responsibleId' in data:
        application.responsible_id = data['responsibleId'] or None
    numeric_map = {
        'annualPayment': 'annual_payment',
        'educationVat': 'education_vat',
        'grossCommission': 'gross_commission',
        'abroadVat': 'abroad_vat',
        'netCommission': 'net_commission',
        'bonusMax': 'bonus_max',
        'bonusMin': 'bonus_min',
        'agencyCommission': 'agency_commission',
        'agencyBonus': 'agency_bonus',
        'agencyContractAmount': 'agency_contract_amount',
        'agencyPaidContractAmount': 'agency_paid_contract_amount',
        'remainingMin': 'remaining_min',
        'remainingMax': 'remaining_max'
    }
    for api_key, db_attr in numeric_map.items():
        if api_key in data:
            value = data.get(api_key)
            setattr(application, db_attr, value if value not in (None, '') else None)

    text_map = {
        'agencyPaidContractDescription': 'agency_paid_contract_description',
        'agencyPaidContractDescriptionDate': 'agency_paid_contract_description_date',
        'agencyPaidContractPaymentMethod': 'agency_paid_contract_payment_method'
    }
    for api_key, db_attr in text_map.items():
        if api_key in data:
            value = data.get(api_key)
            setattr(application, db_attr, (value.strip() if isinstance(value, str) else value) or None)
    if 'currency' in data:
        value = (data.get('currency') or '').strip().upper()
        if value in ('USD', 'TRY', 'EUR'):
            application.currency = value
    _touch_application_and_student(application)
    db.session.commit()
    stu = Student.query.get(application.student_id)
    return jsonify({
        'message': 'Application updated',
        'id': application.id,
        'status': application.status,
        'userId': application.user_id,
        'responsibleId': application.responsible_id,
        'annualPayment': application.annual_payment,
        'educationVat': application.education_vat,
        'grossCommission': application.gross_commission,
        'abroadVat': application.abroad_vat,
        'netCommission': application.net_commission,
        'bonusMax': application.bonus_max,
        'bonusMin': application.bonus_min,
        'agencyCommission': application.agency_commission,
        'agencyBonus': application.agency_bonus,
        'agencyContractAmount': application.agency_contract_amount,
        'agencyPaidContractAmount': application.agency_paid_contract_amount,
        'agencyPaidContractDescription': application.agency_paid_contract_description,
        'agencyPaidContractDescriptionDate': application.agency_paid_contract_description_date,
        'agencyPaidContractPaymentMethod': application.agency_paid_contract_payment_method,
        'currency': application.currency or 'USD',
        'remainingMin': application.remaining_min,
        'remainingMax': application.remaining_max,
        'updatedAt': _application_updated_at_for_api(application),
        'studentId': application.student_id,
        'studentUpdatedAt': _student_updated_at_for_api(stu)
    }), 200


@api_bp.route('/incoming-payments', methods=['GET'])
def get_incoming_payments():
    guard = _require_admin()
    if guard:
        return guard
    records = IncomingPayment.query.order_by(IncomingPayment.sequence_number.desc()).all()
    return jsonify([{
        'id': r.id,
        'sequenceNumber': r.sequence_number,
        'paymentDate': r.payment_date,
        'paymentSource': r.payment_source,
        'currency': getattr(r, 'currency', None) or 'USD',
        'description1': r.description_1,
        'description2': r.description_2,
        'createdAt': r.created_at,
        'updatedAt': r.updated_at
    } for r in records])


@api_bp.route('/incoming-payments', methods=['POST'])
def add_incoming_payment():
    guard = _require_admin()
    if guard:
        return guard
    data = request.get_json() or {}
    payment_date = (data.get('paymentDate') or '').strip()
    payment_source = (data.get('paymentSource') or '').strip()
    currency = (data.get('currency') or 'USD').strip().upper()
    if currency not in ('USD', 'TRY', 'EUR'):
        currency = 'USD'
    if not payment_date or not payment_source:
        return jsonify({'message': 'paymentDate and paymentSource are required'}), 400
    now = _iso_timestamp()
    record = IncomingPayment(
        id=str(uuid.uuid4()),
        sequence_number=_next_sequence(IncomingPayment),
        payment_date=payment_date,
        payment_source=payment_source,
        currency=currency,
        description_1=(data.get('description1') or '').strip() or None,
        description_2=(data.get('description2') or '').strip() or None,
        created_at=now,
        updated_at=now
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({'message': 'Incoming payment added', 'id': record.id, 'sequenceNumber': record.sequence_number}), 201


@api_bp.route('/incoming-payments/<payment_id>', methods=['PUT'])
def update_incoming_payment(payment_id):
    guard = _require_admin()
    if guard:
        return guard
    record = IncomingPayment.query.get(payment_id)
    if not record:
        return jsonify({'message': 'Incoming payment not found'}), 404
    data = request.get_json() or {}
    if 'paymentDate' in data:
        value = (data.get('paymentDate') or '').strip()
        if not value:
            return jsonify({'message': 'paymentDate cannot be empty'}), 400
        record.payment_date = value
    if 'paymentSource' in data:
        value = (data.get('paymentSource') or '').strip()
        if not value:
            return jsonify({'message': 'paymentSource cannot be empty'}), 400
        record.payment_source = value
    if 'currency' in data:
        value = (data.get('currency') or '').strip().upper()
        if value not in ('USD', 'TRY', 'EUR'):
            return jsonify({'message': 'currency must be USD, TRY or EUR'}), 400
        record.currency = value
    if 'description1' in data:
        record.description_1 = (data.get('description1') or '').strip() or None
    if 'description2' in data:
        record.description_2 = (data.get('description2') or '').strip() or None
    record.updated_at = _iso_timestamp()
    db.session.commit()
    return jsonify({'message': 'Incoming payment updated'})


@api_bp.route('/incoming-payments/<payment_id>', methods=['DELETE'])
def delete_incoming_payment(payment_id):
    guard = _require_admin()
    if guard:
        return guard
    record = IncomingPayment.query.get(payment_id)
    if not record:
        return jsonify({'message': 'Incoming payment not found'}), 404
    db.session.delete(record)
    db.session.commit()
    return jsonify({'message': 'Incoming payment deleted'})


@api_bp.route('/outgoing-payments', methods=['GET'])
def get_outgoing_payments():
    guard = _require_admin()
    if guard:
        return guard
    records = OutgoingPayment.query.order_by(OutgoingPayment.sequence_number.desc()).all()
    return jsonify([{
        'id': r.id,
        'sequenceNumber': r.sequence_number,
        'paymentDate': r.payment_date,
        'paymentAmount': r.payment_amount,
        'currency': getattr(r, 'currency', None) or 'USD',
        'paymentType': r.payment_type,
        'paymentReason': r.payment_reason,
        'description1': r.description_1,
        'createdAt': r.created_at,
        'updatedAt': r.updated_at
    } for r in records])


@api_bp.route('/outgoing-payments', methods=['POST'])
def add_outgoing_payment():
    guard = _require_admin()
    if guard:
        return guard
    data = request.get_json() or {}
    payment_date = (data.get('paymentDate') or '').strip()
    payment_reason = (data.get('paymentReason') or '').strip()
    payment_type = (data.get('paymentType') or '').strip()
    currency = (data.get('currency') or 'USD').strip().upper()
    if currency not in ('USD', 'TRY', 'EUR'):
        currency = 'USD'
    payment_amount = data.get('paymentAmount')
    if not payment_date or not payment_reason or payment_type not in ('Cash', 'Bank'):
        return jsonify({'message': 'paymentDate, paymentType (Cash/Bank), paymentReason are required'}), 400
    try:
        payment_amount = float(payment_amount)
    except (TypeError, ValueError):
        return jsonify({'message': 'paymentAmount must be a number'}), 400
    now = _iso_timestamp()
    record = OutgoingPayment(
        id=str(uuid.uuid4()),
        sequence_number=_next_sequence(OutgoingPayment),
        payment_date=payment_date,
        payment_amount=payment_amount,
        currency=currency,
        payment_type=payment_type,
        payment_reason=payment_reason,
        description_1=(data.get('description1') or '').strip() or None,
        created_at=now,
        updated_at=now
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({'message': 'Outgoing payment added', 'id': record.id, 'sequenceNumber': record.sequence_number}), 201


@api_bp.route('/outgoing-payments/<payment_id>', methods=['PUT'])
def update_outgoing_payment(payment_id):
    guard = _require_admin()
    if guard:
        return guard
    record = OutgoingPayment.query.get(payment_id)
    if not record:
        return jsonify({'message': 'Outgoing payment not found'}), 404
    data = request.get_json() or {}
    if 'paymentDate' in data:
        value = (data.get('paymentDate') or '').strip()
        if not value:
            return jsonify({'message': 'paymentDate cannot be empty'}), 400
        record.payment_date = value
    if 'paymentReason' in data:
        value = (data.get('paymentReason') or '').strip()
        if not value:
            return jsonify({'message': 'paymentReason cannot be empty'}), 400
        record.payment_reason = value
    if 'paymentType' in data:
        value = (data.get('paymentType') or '').strip()
        if value not in ('Cash', 'Bank'):
            return jsonify({'message': 'paymentType must be Cash or Bank'}), 400
        record.payment_type = value
    if 'currency' in data:
        value = (data.get('currency') or '').strip().upper()
        if value not in ('USD', 'TRY', 'EUR'):
            return jsonify({'message': 'currency must be USD, TRY or EUR'}), 400
        record.currency = value
    if 'paymentAmount' in data:
        try:
            record.payment_amount = float(data.get('paymentAmount'))
        except (TypeError, ValueError):
            return jsonify({'message': 'paymentAmount must be a number'}), 400
    if 'description1' in data:
        record.description_1 = (data.get('description1') or '').strip() or None
    record.updated_at = _iso_timestamp()
    db.session.commit()
    return jsonify({'message': 'Outgoing payment updated'})


@api_bp.route('/outgoing-payments/<payment_id>', methods=['DELETE'])
def delete_outgoing_payment(payment_id):
    guard = _require_admin()
    if guard:
        return guard
    record = OutgoingPayment.query.get(payment_id)
    if not record:
        return jsonify({'message': 'Outgoing payment not found'}), 404
    db.session.delete(record)
    db.session.commit()
    return jsonify({'message': 'Outgoing payment deleted'})


# News and Updates (Haberler ve Güncellemeler)
@api_bp.route('/news', methods=['GET'])
def get_news():
    items = NewsItem.query.order_by(NewsItem.created_at.desc()).all()
    out = []
    for n in items:
        creator = User.query.get(n.created_by)
        out.append({
            'id': n.id,
            'title': n.title,
            'content': n.content,
            'createdAt': n.created_at,
            'createdBy': n.created_by,
            'createdByName': creator.name if creator else None
        })
    return jsonify(out)


@api_bp.route('/news', methods=['POST'])
def post_news():
    data = request.json or {}
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    created_by = data.get('createdBy') or data.get('created_by')
    if not title or not content:
        return jsonify({'message': 'title and content required'}), 400
    if not created_by:
        return jsonify({'message': 'createdBy required'}), 400
    creator = User.query.get(created_by)
    if not creator:
        return jsonify({'message': 'User not found'}), 404
    role = (creator.role or '').upper()
    if role not in ('ADMIN', 'USER'):
        return jsonify({'message': 'Only admin or user role can create news'}), 403
    news = NewsItem(
        id=str(uuid.uuid4()),
        title=title,
        content=content,
        created_at=datetime.utcnow().isoformat(),
        created_by=created_by
    )
    db.session.add(news)
    db.session.commit()
    # Notify all users except the creator
    all_users = User.query.filter(User.id != created_by).all()
    for u in all_users:
        n = Notification(
            id=str(uuid.uuid4()),
            user_id=u.id,
            title=data.get('notificationTitle') or title,
            message=(content[:80] + '...') if len(content) > 80 else content,
            link='/news',
            created_at=datetime.utcnow().isoformat(),
            type='NEWS'
        )
        db.session.add(n)
    db.session.commit()
    return jsonify({
        'id': news.id,
        'title': news.title,
        'content': news.content,
        'createdAt': news.created_at,
        'createdBy': news.created_by,
        'createdByName': creator.name
    }), 201


# Notifications
@api_bp.route('/notifications', methods=['GET'])
def get_notifications():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'User ID required'}), 400
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([{
        'id': n.id,
        'title': n.title,
        'message': n.message,
        'link': n.link,
        'isRead': n.is_read,
        'createdAt': n.created_at,
        'type': n.type
    } for n in notifications])

@api_bp.route('/notifications/<n_id>/read', methods=['PUT'])
def mark_notification_read(n_id):
    notification = Notification.query.get(n_id)
    if not notification:
        return jsonify({'message': 'Notification not found'}), 404
    notification.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read'}), 200


@api_bp.route('/notifications/read-all', methods=['PUT'])
def mark_all_notifications_read():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'User ID required'}), 400
    updated = Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All marked as read', 'count': updated}), 200
