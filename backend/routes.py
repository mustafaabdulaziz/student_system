
from flask import Blueprint, request, jsonify, session, current_app, send_from_directory, url_for
from models import db, Student, University, Program, Application, User, Notification
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename

api_bp = Blueprint('api', __name__)

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
        country_code=data.get('countryCode')
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
    
    if data.get('password'):
        user.password = data['password']
    
    if 'phone' in data:
        user.phone = data['phone']
    if 'countryCode' in data:
        user.country_code = data.get('countryCode')
        
    db.session.commit()
    return jsonify({'message': 'تم تحديث البيانات بنجاح'}), 200

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
        'countryCode': getattr(u, 'country_code', None)
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

# Login endpoint
@api_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    if user and user.password == password:
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'phone': user.phone,
                'countryCode': getattr(user, 'country_code', None)
            }
        })
    return jsonify({'success': False, 'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401

# Students
@api_bp.route('/students', methods=['GET'])
def get_students():
    user_role = request.args.get('role')
    user_id = request.args.get('user_id')
    if user_role == 'agent' and user_id:
        students = Student.query.filter_by(user_id=user_id).all()
    else:
        students = Student.query.all()
    # Debug log: show how many students returned and their user_ids
    try:
        print(f"GET /api/students called with role={user_role} user_id={user_id} -> returning {len(students)} students")
        sample = [(s.id, getattr(s, 'user_id', None)) for s in students[:10]]
        print('sample students (id,user_id)=', sample)
    except Exception:
        pass

    return jsonify([{
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
        'userId': getattr(s, 'user_id', None)
    } for s in students])

@api_bp.route('/students', methods=['POST'])
def add_student():
    data = request.json
    user_role = data.get('role')
    user_id = data.get('user_id')
    if user_role == 'agent' and not user_id:
        return jsonify({'message': 'Agent user_id required'}), 400
    student = Student(
        id=str(uuid.uuid4()),
        first_name=data['firstName'],
        last_name=data['lastName'],
        passport_number=data['passportNumber'],
        father_name=data['fatherName'],
        mother_name=data['motherName'],
        gender=data['gender'],
        phone=data['phone'],
        email=data['email'],
        nationality=data['nationality'],
        degree_target=data['degreeTarget'],
        dob=data['dob'],
        residence_country=data['residenceCountry'],
        user_id=user_id
    )
    db.session.add(student)
    db.session.commit()
    print(f"Created student {student.id} user_id={user_id}")
    return jsonify({'message': 'Student added', 'id': student.id}), 201

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
    programs = Program.query.all()
    return jsonify([{
        'id': p.id,
        'universityId': p.university_id,
        'name': p.name,
        'degree': p.degree,
        'language': p.language,
        'years': p.years,
        'deadline': p.deadline,
        'fee': p.fee,
        'currency': getattr(p, 'currency', 'USD'),
        'description': p.description
    } for p in programs])

@api_bp.route('/programs', methods=['POST'])
def add_program():
    data = request.json
    user_role = data.get('role')
    if user_role == 'agent':
        return jsonify({'message': 'Agents are not allowed to add programs'}), 403
    program = Program(
        id=str(uuid.uuid4()),
        university_id=data['universityId'],
        name=data['name'],
        degree=data['degree'],
        language=data['language'],
        years=data['years'],
        deadline=data['deadline'],
        fee=data['fee'],
        currency=data.get('currency', 'USD'),
        description=data.get('description', '')
    )
    db.session.add(program)
    db.session.commit()
    return jsonify({'message': 'Program added', 'id': program.id}), 201

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
    program.degree = data.get('degree', program.degree)
    program.language = data.get('language', program.language)
    if 'years' in data:
        program.years = data['years']
    if 'deadline' in data:
        program.deadline = data['deadline']
    if 'fee' in data:
        program.fee = data['fee']
    if 'currency' in data:
        program.currency = data['currency']
    if 'description' in data:
        program.description = data['description']
    
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


@api_bp.route('/applications', methods=['GET'])
def get_applications():
    user_role = request.args.get('role')
    user_id = request.args.get('user_id')
    if user_role == 'agent' and user_id:
        applications = Application.query.filter_by(user_id=user_id).all()
    else:
        applications = Application.query.all()
    def _file_urls(file_list):
        if not file_list:
            return []
        return [url_for('api.upload_file', filename=f, _external=False) for f in file_list]

    return jsonify([{
        'id': a.id,
        'studentId': a.student_id,
        'programId': a.program_id,
        'status': a.status,
        'semester': a.semester,
        'createdAt': a.created_at,
        'files': _file_urls(a.files),
        'userId': a.user_id,
        'agentPhone': a.user.phone if a.user else None,
        'agentName': a.user.name if a.user else None,
        'agentCountryCode': a.user.country_code if a.user else None
    } for a in applications])


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
    status = request.form.get('status')
    semester = request.form.get('semester')
    user_role = request.form.get('role')
    user_id = request.form.get('user_id')
    created_at = datetime.utcnow().isoformat()
    saved_files = []
    upload_folder = os.path.join(current_app.root_path, 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    for file in files:
        filename = f"{uuid.uuid4()}_{file.filename}"
        file.save(os.path.join(upload_folder, filename))
        saved_files.append(filename)
    application = Application(
        id=_generate_app_id(),
        student_id=student_id,
        program_id=program_id,
        status=status,
        semester=semester,
        created_at=created_at,
        files=saved_files,
        user_id=user_id
    )
    db.session.add(application)
    db.session.commit()
    file_urls = [url_for('api.upload_file', filename=f, _external=False) for f in saved_files]
    return jsonify({'message': 'Application added', 'id': application.id, 'files': file_urls}), 201


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
    status = request.form.get('status')
    semester = request.form.get('semester')
    created_at = datetime.utcnow().isoformat()
    saved_files = []
    upload_folder = os.path.join(current_app.root_path, 'uploads')
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
        status=status,
        semester=semester,
        created_at=created_at,
        files=saved_files
    )
    db.session.add(application)
    db.session.commit()
    file_urls = [url_for('api.upload_file', filename=f, _external=False) for f in saved_files]
    return jsonify({'message': 'Application added', 'id': application.id, 'files': file_urls}), 201


# Messages for applications
@api_bp.route('/applications/<app_id>/messages', methods=['GET'])
def get_application_messages(app_id):
    msgs = ApplicationMessage.query.filter_by(application_id=app_id).order_by(ApplicationMessage.created_at).all()
    return jsonify([{
        'id': m.id,
        'applicationId': m.application_id,
        'sender': m.sender,
        'message': m.message,
        'createdAt': m.created_at
    } for m in msgs])


@api_bp.route('/applications/<app_id>/messages', methods=['POST'])
def post_application_message(app_id):
    data = request.json or {}
    sender = data.get('sender')
    message = data.get('message')
    if not sender or not message:
        return jsonify({'message': 'sender and message required'}), 400
    msg = ApplicationMessage(
        id=str(uuid.uuid4()),
        application_id=app_id,
        sender=sender,
        message=message,
        created_at=datetime.utcnow().isoformat()
    )
    db.session.add(msg)
    db.session.commit()

    # Notification Logic
    application = Application.query.get(app_id)
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

    return jsonify({'message': 'Message added', 'id': msg.id}), 201


@api_bp.route('/universities/import', methods=['POST'])
def import_universities():
    if 'file' not in request.files:
        return jsonify({'message': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    upload_folder = os.path.join(current_app.root_path, 'uploads')
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
    upload_folder = os.path.join(current_app.root_path, 'uploads')
    return send_from_directory(upload_folder, filename, as_attachment=False)


# List files for an application / upload additional files
@api_bp.route('/applications/<app_id>/files', methods=['GET', 'POST'])
def application_files(app_id):
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'message': 'Application not found'}), 404

    upload_folder = os.path.join(current_app.root_path, 'uploads')
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
    db.session.commit()
    files_info = [
        {
            'name': f.split('_', 1)[1] if '_' in f else f,
            'filename': f,
            'url': url_for('api.upload_file', filename=f, _external=False)
        } for f in application.files
    ]
    return jsonify({'message': 'Files added', 'files': files_info}), 201

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
    db.session.commit()

    upload_folder = os.path.join(current_app.root_path, 'uploads')
    file_path = os.path.join(upload_folder, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            pass # ignore if file already missing or locked

    return jsonify({'message': 'File deleted successfully'}), 200

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
    db.session.commit()
    
    # Create notification
    # Notify Student Owner
    if application.user_id:
        notify_user_id = application.user_id
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=notify_user_id,
            title="Application Status Update",
            message=f"Your application #{application.id} status changed to {new_status}",
            link=f"/applications/{application.id}",
            created_at=datetime.utcnow().isoformat(),
            type="STATUS"
        )
        db.session.add(notification)
        db.session.commit()
        
    return jsonify({'message': 'Status updated', 'status': application.status}), 200

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
