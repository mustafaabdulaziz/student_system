
from flask import Blueprint, request, jsonify, session, current_app, send_from_directory, url_for
from models import db, Student, University, Program, Application, ApplicationMessage, User, Notification, Period, NewsItem, IncomingPayment, OutgoingPayment, AgencyCompany, UserUniversityCommission, PaymentSource
import os
import re
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

api_bp = Blueprint('api', __name__)

# Uploads at project root: student_system/uploads (when backend is in student_system/backend)
UPLOADS_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads'))

OUTGOING_PAYMENT_REASONS = frozenset({'commission', 'debt', 'company_expense'})
COMPANY_EXPENSE_TYPES = frozenset({
    'salaries', 'advertising', 'cekeyim', 'kira', 'cashback', 'deposit', 'support', 'other',
    # legacy values kept for reading/editing older records
    'deposit_support', 'rateb', 'terwij', 'ulasim', 'yemek', 'others',
})
NEW_COMPANY_EXPENSE_TYPES = frozenset({
    'salaries', 'advertising', 'cekeyim', 'kira', 'cashback', 'deposit', 'support', 'other',
})
COMMISSION_SHAPES = frozenset({
    'agency_commission', 'employee_commission', 'student_referral_commission',
})
STUDENT_FILE_TYPES = frozenset({'acceptance_letter', 'offer_letter', 'receipt', 'other'})
INCOMING_PAYMENT_TYPES = frozenset({'Cash', 'Bank', 'Scholarship'})


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


def _files_info_list(filenames, metadata=None):
    metadata = metadata if isinstance(metadata, dict) else {}
    items = []
    for f in (filenames or []):
        info = {
            'name': f.split('_', 1)[1] if '_' in f else f,
            'filename': f,
            'url': url_for('api.upload_file', filename=f, _external=False)
        }
        meta = metadata.get(f)
        if isinstance(meta, dict):
            file_type = meta.get('fileType')
            if file_type:
                info['fileType'] = file_type
            description = meta.get('description')
            if description:
                info['description'] = description
        items.append(info)
    return items


def _save_upload_files(file_storage_list):
    upload_folder = UPLOADS_DIR
    os.makedirs(upload_folder, exist_ok=True)
    saved = []
    for file in file_storage_list:
        if not file:
            continue
        raw_name = (getattr(file, 'filename', None) or '').strip()
        if not raw_name:
            continue
        safe = secure_filename(raw_name)
        if not safe or safe in ('.', ''):
            ext = os.path.splitext(raw_name)[1]
            safe = f"upload{ext}" if ext else 'upload.bin'
        filename = f"{uuid.uuid4()}_{safe}"
        file.save(os.path.join(upload_folder, filename))
        saved.append(filename)
    return saved


def _student_files_raw(student):
    if not student:
        return []
    return list(getattr(student, 'files', None) or [])


def _student_file_metadata_raw(student):
    if not student:
        return {}
    meta = getattr(student, 'file_metadata', None)
    return meta if isinstance(meta, dict) else {}


def _ensure_student_file_metadata_column():
    try:
        inspector = inspect(db.engine)
        if 'students' not in inspector.get_table_names():
            return
        cols = [c['name'] for c in inspector.get_columns('students')]
        if 'file_metadata' in cols:
            return
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE students ADD COLUMN file_metadata JSONB'))
            conn.commit()
    except Exception as e:
        print('ensure students.file_metadata column:', e)


def _file_type_label(file_type, description=None):
    labels = {
        'acceptance_letter': 'Acceptance letter',
        'offer_letter': 'Offer letter',
        'receipt': 'Receipt',
        'other': 'Other document'
    }
    label = labels.get(file_type, file_type or 'file')
    if file_type == 'other' and description:
        return f'{label}: {description}'
    return label


def _parse_upload_file_type():
    file_type = (request.form.get('fileType') or '').strip()
    if not file_type:
        return None, None
    if file_type not in STUDENT_FILE_TYPES:
        return None, 'Invalid fileType'
    description = (request.form.get('fileDescription') or '').strip() or None
    if file_type == 'other' and not description:
        return None, 'fileDescription is required when fileType is other'
    return file_type, None


def _apply_student_file_metadata(student, filenames, file_type=None, file_description=None, uploader_id=None):
    if not file_type or not filenames:
        return
    _ensure_student_file_metadata_column()
    meta = dict(_student_file_metadata_raw(student))
    for fn in filenames:
        entry = {'fileType': file_type}
        if file_type == 'other':
            entry['description'] = file_description
        if uploader_id:
            entry['uploadedBy'] = uploader_id
        meta[fn] = entry
    student.file_metadata = meta
    flag_modified(student, 'file_metadata')


def _remove_student_file_metadata(student, filename):
    meta = dict(_student_file_metadata_raw(student))
    if filename in meta:
        del meta[filename]
        student.file_metadata = meta
        flag_modified(student, 'file_metadata')


def _student_files_info(student):
    return _files_info_list(_student_files_raw(student), _student_file_metadata_raw(student))


def _application_files_raw(application, student=None):
    if student is None and application:
        student = Student.query.get(application.student_id)
    st_files = _student_files_raw(student)
    if st_files:
        return st_files
    return list(getattr(application, 'files', None) or [])


def _ensure_student_files_column():
    """Create students.files if missing (e.g. server started without run.py migrations)."""
    try:
        inspector = inspect(db.engine)
        if 'students' not in inspector.get_table_names():
            return
        cols = [c['name'] for c in inspector.get_columns('students')]
        if 'files' in cols:
            return
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE students ADD COLUMN files VARCHAR[]'))
            conn.commit()
    except Exception as e:
        print('ensure students.files column:', e)


def _ensure_payment_receipt_columns():
    """Create payment receipt_files columns if missing."""
    try:
        inspector = inspect(db.engine)
        table_names = inspector.get_table_names()
        with db.engine.connect() as conn:
            if 'incoming_payments' in table_names:
                incoming_cols = [c['name'] for c in inspector.get_columns('incoming_payments')]
                if 'receipt_files' not in incoming_cols:
                    conn.execute(text('ALTER TABLE incoming_payments ADD COLUMN receipt_files VARCHAR[]'))
                    conn.commit()
            if 'outgoing_payments' in table_names:
                outgoing_cols = [c['name'] for c in inspector.get_columns('outgoing_payments')]
                if 'receipt_files' not in outgoing_cols:
                    conn.execute(text('ALTER TABLE outgoing_payments ADD COLUMN receipt_files VARCHAR[]'))
                    conn.commit()
    except Exception as e:
        print('ensure payment receipt_files columns:', e)


def _payment_receipt_files_raw(record):
    if not record:
        return []
    return list(getattr(record, 'receipt_files', None) or [])


def _append_payment_receipts(record, filenames):
    _ensure_payment_receipt_columns()
    combined = _payment_receipt_files_raw(record) + list(filenames)
    record.receipt_files = combined
    flag_modified(record, 'receipt_files')


def _append_student_files(student, filenames):
    _ensure_student_files_column()
    combined = list(_student_files_raw(student)) + list(filenames)
    student.files = combined
    flag_modified(student, 'files')


def _touch_student(student):
    if not student:
        return
    student.updated_at = _iso_timestamp()


def _is_agent_user(user):
    return bool(user and (user.role or '').strip().lower() == 'agent')


def _staff_users():
    """Admin and USER role accounts (case-insensitive)."""
    return [u for u in User.query.all() if (u.role or '').strip().upper() in ('ADMIN', 'USER')]


def _form_uploader_id():
    return (request.form.get('user_id') or request.form.get('userId') or '').strip() or None


def _notify_staff_agent_file_upload(uploader, title, message, link, extra_user_ids=None):
    """Notify all admin/user accounts when an agent uploads files."""
    if not _is_agent_user(uploader):
        return
    notify_ids = {u.id for u in _staff_users()}
    for uid in (extra_user_ids or []):
        if uid:
            notify_ids.add(uid)
    notify_ids.discard(uploader.id)
    if not notify_ids:
        return
    now = datetime.utcnow().isoformat()
    for uid in notify_ids:
        db.session.add(Notification(
            id=str(uuid.uuid4()),
            user_id=uid,
            title=title,
            message=message,
            link=link,
            created_at=now,
            type='FILE_UPLOAD'
        ))
    db.session.commit()


def _notify_application_receipt_upload(application, uploader, link):
    """Notify admins and the application's responsible user about a receipt."""
    if not application:
        return
    notify_ids = {
        user.id for user in User.query.all()
        if (user.role or '').strip().upper() == 'ADMIN'
    }
    responsible_id = getattr(application, 'responsible_id', None)
    if responsible_id:
        notify_ids.add(responsible_id)
    if uploader:
        notify_ids.discard(uploader.id)
    if not notify_ids:
        return

    uploader_name = uploader.name if uploader and uploader.name else 'Bir kullanıcı'
    now = datetime.utcnow().isoformat()
    for user_id in notify_ids:
        db.session.add(Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title='Başvuru dekontu yüklendi',
            message=f"{uploader_name}, #{application.id} numaralı başvuruya dekont yükledi.",
            link=link,
            created_at=now,
            type='FILE_UPLOAD'
        ))
    db.session.commit()


def _add_application_agent_status_notification(application, new_status):
    """Queue a status-change notification for the application's agent."""
    agent_id = getattr(application, 'user_id', None)
    if not agent_id:
        return
    db.session.add(Notification(
        id=str(uuid.uuid4()),
        user_id=agent_id,
        title='Başvuru durumu güncellendi',
        message=f"#{application.id} numaralı başvurunun durumu {new_status} olarak güncellendi.",
        link=f"/applications/{application.id}",
        created_at=datetime.utcnow().isoformat(),
        type='STATUS'
    ))


def _notify_agent_owner_file_upload(student, application, uploader, link, file_type=None, file_description=None):
    """Notify the student's agent when admin/user uploads files."""
    if not uploader or not student:
        return
    role = (uploader.role or '').strip().upper()
    if role not in ('ADMIN', 'USER'):
        return
    agent_id = getattr(student, 'user_id', None)
    if not agent_id:
        return
    student_name = f"{student.first_name} {student.last_name}".strip()
    uploader_name = uploader.name or 'Staff'
    if file_type:
        doc_label = _file_type_label(file_type, file_description)
        if application:
            message = f"{uploader_name} uploaded {doc_label} for application #{application.id} (student {student_name})."
            title = 'Application document uploaded'
        else:
            message = f"{uploader_name} uploaded {doc_label} for student {student_name}."
            title = 'Student document uploaded'
    else:
        if application:
            message = f"{uploader_name} uploaded file(s) for application #{application.id} (student {student_name})."
            title = 'Application files uploaded'
        else:
            message = f"{uploader_name} uploaded file(s) for student {student_name}."
            title = 'Student files uploaded'
    now = datetime.utcnow().isoformat()
    db.session.add(Notification(
        id=str(uuid.uuid4()),
        user_id=agent_id,
        title=title,
        message=message,
        link=link,
        created_at=now,
        type='FILE_UPLOAD'
    ))
    db.session.commit()


def _student_by_id_for_applications(applications):
    student_ids = list({a.student_id for a in applications if a.student_id})
    if not student_ids:
        return {}
    return {s.id: s for s in Student.query.filter(Student.id.in_(student_ids)).all()}


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
        'createdBy': getattr(s, 'created_by', None),
        'createdByName': s.creator.name if getattr(s, 'creator', None) else None,
        'files': [url_for('api.upload_file', filename=f, _external=False) for f in _student_files_raw(s)],
        'createdAt': getattr(s, 'created_at', None),
        'updatedAt': _student_updated_at_for_api(s) or _normalize_ts_z(getattr(s, 'created_at', None))
    }


def _period_is_active(period):
    return period is not None and getattr(period, 'active', True)


def _sync_program_archive_for_period(period_id, archived):
    return Program.query.filter_by(period_id=period_id).update(
        {'is_archived': bool(archived)},
        synchronize_session=False
    )


def _validate_application_period_and_program(period_id, program_id):
    program = Program.query.get(program_id) if program_id else None
    if program and getattr(program, 'is_archived', False):
        return jsonify({'message': 'Program is archived'}), 400
    effective_period_id = period_id or (program.period_id if program else None)
    if not effective_period_id:
        return None
    period = Period.query.get(effective_period_id)
    if not period:
        return jsonify({'message': 'Period not found'}), 404
    if not _period_is_active(period):
        return jsonify({'message': 'Period is not active'}), 400
    return None


def _serialize_program(p):
    return {
        'id': p.id,
        'universityId': p.university_id,
        'name': p.name,
        'nameInArabic': getattr(p, 'name_in_arabic', None),
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
        'description': p.description,
        'isOpen': bool(getattr(p, 'is_open', True)),
        'isArchived': bool(getattr(p, 'is_archived', False))
    }


def _normalize_created_at(created_at):
    if not created_at:
        return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    if created_at.endswith('Z'):
        return created_at
    if 'T' in created_at:
        return created_at + 'Z'
    return created_at + 'T00:00:00.000Z'


def _serialize_application(a, program_by_id, student_by_id=None):
    p = program_by_id.get(a.program_id)
    st = None
    if student_by_id is not None:
        st = student_by_id.get(a.student_id)
    elif a.student_id:
        st = Student.query.get(a.student_id)
    files_raw = _application_files_raw(a, st)
    data = {
        'id': a.id,
        'studentId': a.student_id,
        'programId': a.program_id,
        'periodId': getattr(a, 'period_id', None) or (p.period_id if p else None),
        'status': a.status,
        'semester': a.semester,
        'createdAt': _normalize_created_at(a.created_at),
        'updatedAt': _application_updated_at_for_api(a),
        'files': [url_for('api.upload_file', filename=f, _external=False) for f in files_raw],
        'userId': a.user_id,
        'agentPhone': a.user.phone if a.user else None,
        'agentName': a.user.name if a.user else None,
        'agentCountryCode': a.user.country_code if a.user else None,
        'createdBy': getattr(a, 'created_by', None),
        'createdByName': a.creator.name if getattr(a, 'creator', None) else None,
        'responsibleId': getattr(a, 'responsible_id', None),
        'responsibleName': a.responsible.name if getattr(a, 'responsible', None) and a.responsible else None,
        'agencyCompanyId': getattr(a, 'agency_company_id', None),
        'agencyCompanyName': a.agency_company.name if getattr(a, 'agency_company', None) and a.agency_company else None,
        'annualPayment': getattr(a, 'annual_payment', None),
        'educationVatRate': getattr(a, 'education_vat_rate', None),
        'educationVat': getattr(a, 'education_vat', None),
        'grossCommissionKind': getattr(a, 'gross_commission_kind', None) or 'amount',
        'grossCommissionRate': getattr(a, 'gross_commission_rate', None),
        'grossCommission': getattr(a, 'gross_commission', None),
        'abroadVatRate': getattr(a, 'abroad_vat_rate', 10.0),
        'abroadVat': getattr(a, 'abroad_vat', None),
        'netCommission': getattr(a, 'net_commission', None),
        'bonusMax': getattr(a, 'bonus_max', None),
        'bonusMin': getattr(a, 'bonus_min', None),
        'agencyCommissionKind': getattr(a, 'agency_commission_kind', None) or 'amount',
        'agencyCommissionRate': getattr(a, 'agency_commission_rate', None),
        'agencyCommission': getattr(a, 'agency_commission', None),
        'agencyBonus': getattr(a, 'agency_bonus', None),
        'depositSupport': getattr(a, 'deposit_support', None),
        'agencyContractAmount': getattr(a, 'agency_contract_amount', None),
        'currency': getattr(a, 'currency', None) or 'USD',
        'remainingMin': getattr(a, 'remaining_min', None),
        'remainingMax': getattr(a, 'remaining_max', None),
        'paymentDeserved': bool(getattr(a, 'payment_deserved', False)),
        'paymentDate': getattr(a, 'payment_date', None),
        'paymentMonth': getattr(a, 'payment_month', None)
    }
    if _request_staff_user():
        data['internalDescription'] = getattr(a, 'internal_description', None)
    return data


def _apply_acceptance_payment_markers(application):
    """When status is 'Acceptance Letter Waiting', stamp payment date/month."""
    status_norm = (application.status or '').strip().lower()
    if status_norm == 'kabul mektubu bekleniyor':
        now = datetime.utcnow()
        application.payment_date = now.strftime('%Y-%m-%d')
        application.payment_month = now.strftime('%Y-%m')


def _delete_upload_file(filename):
    if not filename:
        return
    file_path = os.path.join(UPLOADS_DIR, filename)
    if os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass


def _delete_notifications_for_link_fragment(fragment):
    if not fragment:
        return
    Notification.query.filter(Notification.link.like(f'%{fragment}%')).delete(synchronize_session=False)


def _delete_application_record(application):
    app_id = application.id
    ApplicationMessage.query.filter_by(application_id=app_id).delete(synchronize_session=False)
    _delete_notifications_for_link_fragment(f'/applications/{app_id}')
    db.session.delete(application)


def _request_role_value():
    q_role = (request.args.get('role') or '').strip()
    if q_role:
        return q_role.upper()
    if request.method == 'GET':
        return (request.args.get('role') or '').upper()
    if request.is_json:
        data = request.get_json(silent=True) or {}
        return (data.get('role') or '').upper()
    return (request.form.get('role') or '').upper()


def _session_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    user = User.query.get(user_id)
    if not user or not getattr(user, 'is_active', True):
        session.pop('user_id', None)
        return None
    return user


def _request_staff_user():
    user = _session_user()
    if user and (user.role or '').upper() in ('ADMIN', 'USER'):
        return user
    return None


def _require_admin():
    if _request_role_value() != 'ADMIN':
        return jsonify({'message': 'Only admin can access this endpoint'}), 403
    return None


def _next_sequence(model_cls):
    max_value = db.session.query(db.func.max(model_cls.sequence_number)).scalar()
    return int(max_value or 0) + 1


DEGREE_COMMISSION_DEGREES = frozenset({'Diploma', 'Bachelor', 'Master', 'PhD'})


def _normalize_degree_commissions(rows):
    out = []
    seen = set()
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        degree = (row.get('degree') or '').strip()
        commission_kind = (row.get('commissionKind') or '').strip()
        if degree not in DEGREE_COMMISSION_DEGREES or commission_kind not in ('rate', 'amount'):
            continue
        if degree in seen:
            continue
        try:
            commission_value = float(row.get('commissionValue'))
        except (TypeError, ValueError):
            continue
        seen.add(degree)
        out.append({
            'degree': degree,
            'commissionKind': commission_kind,
            'commissionValue': commission_value
        })
    return out


def _university_degree_commission(university, degree):
    if not university or not degree:
        return None
    rows = getattr(university, 'degree_commissions', None) or []
    for row in rows:
        if not isinstance(row, dict):
            continue
        if (row.get('degree') or '').strip() != degree:
            continue
        kind = (row.get('commissionKind') or '').strip()
        if kind not in ('rate', 'amount'):
            continue
        try:
            value = float(row.get('commissionValue'))
        except (TypeError, ValueError):
            continue
        return {'kind': kind, 'value': value}
    return None


def _normalize_agent_commissions(rows):
    out = []
    seen = set()
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        university_id = (row.get('universityId') or '').strip()
        commission_kind = (row.get('commissionKind') or '').strip()
        degree = (row.get('degree') or '').strip() or None
        if degree and degree not in DEGREE_COMMISSION_DEGREES:
            continue
        if commission_kind not in ('rate', 'amount') or not university_id:
            continue
        key = (university_id, degree or '')
        if key in seen:
            continue
        seen.add(key)
        try:
            commission_value = float(row.get('commissionValue'))
        except (TypeError, ValueError):
            continue
        deposit_support = None
        if row.get('depositSupport') not in (None, ''):
            try:
                deposit_support = float(row.get('depositSupport'))
            except (TypeError, ValueError):
                continue
        out.append({
            'universityId': university_id,
            'degree': degree,
            'commissionKind': commission_kind,
            'commissionValue': commission_value,
            'depositSupport': deposit_support
        })
    return out


def _agent_commissions_have_duplicate(rows):
    seen = set()
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        university_id = (row.get('universityId') or '').strip()
        if not university_id:
            continue
        degree = (row.get('degree') or '').strip()
        key = (university_id, degree)
        if key in seen:
            return True
        seen.add(key)
    return False


def _replace_user_agent_commissions(user_id, rows):
    UserUniversityCommission.query.filter_by(user_id=user_id).delete()
    for row in rows:
        db.session.add(UserUniversityCommission(
            id=str(uuid.uuid4()),
            user_id=user_id,
            university_id=row['universityId'],
            degree=row.get('degree'),
            commission_kind=row['commissionKind'],
            commission_value=row['commissionValue'],
            deposit_support=row.get('depositSupport')
        ))


def _agent_commission_for_user_university(user_id, university_id, degree=None):
    """Match agent commission: exact degree first, then empty/all-degree row. No other fallback."""
    if not user_id or not university_id:
        return None
    rows = UserUniversityCommission.query.filter_by(user_id=user_id, university_id=university_id).all()
    if not rows:
        return None
    matched = None
    if degree:
        for row in rows:
            if (getattr(row, 'degree', None) or '') == degree:
                matched = row
                break
    if matched is None:
        for row in rows:
            if not getattr(row, 'degree', None):
                matched = row
                break
    if matched is None:
        return None
    return {
        'kind': matched.commission_kind,
        'value': float(matched.commission_value),
        'depositSupport': float(matched.deposit_support) if matched.deposit_support is not None else None
    }


def _compute_application_finance(
    application,
    prefer_user_agency_commission=False,
    prefer_user_deposit_support=False,
    preserve_gross_commission=False,
    preserve_agency_commission=False
):
    program = Program.query.get(application.program_id) if application.program_id else None
    university = University.query.get(program.university_id) if program and program.university_id else None
    program_degree = getattr(program, 'degree', None) if program else None

    # Defaults from program/university
    if application.annual_payment is None and program:
        application.annual_payment = getattr(program, 'fee', None)
    if (not application.currency) and program:
        application.currency = getattr(program, 'currency', None) or 'USD'
    if application.education_vat_rate is None and university:
        uv = getattr(university, 'education_vat_rate', None)
        application.education_vat_rate = float(uv) if uv is not None else None
    if application.abroad_vat_rate is None and university:
        uv = getattr(university, 'abroad_vat_rate', None)
        application.abroad_vat_rate = float(uv) if uv is not None else None
    if application.bonus_max is None and university:
        uv = getattr(university, 'bonus_max', None)
        application.bonus_max = float(uv) if uv is not None else None
    if application.bonus_min is None and university:
        uv = getattr(university, 'bonus_min', None)
        application.bonus_min = float(uv) if uv is not None else None

    annual = float(application.annual_payment) if application.annual_payment is not None else None
    edu_rate = float(application.education_vat_rate) if application.education_vat_rate is not None else None

    # education kdv tutarı
    application.education_vat = (annual * edu_rate / 100.0) if (annual is not None and edu_rate is not None) else None
    edu_amount = float(application.education_vat) if application.education_vat is not None else 0.0

    # --- Brüt komisyon ---
    # Kaynak: üniversite derece komisyonu → yoksa üniversite genel komisyonu
    if not preserve_gross_commission:
        degree_cfg = _university_degree_commission(university, program_degree) if university else None
        if degree_cfg:
            ck, cv = degree_cfg['kind'], degree_cfg['value']
        elif university:
            ck = getattr(university, 'commission_kind', None)
            cv = getattr(university, 'commission_value', None)
        else:
            ck, cv = None, None

        if ck in ('rate', 'amount') and cv is not None:
            application.gross_commission_kind = ck
            if ck == 'rate':
                application.gross_commission_rate = float(cv)
                application.gross_commission = (
                    (annual - edu_amount) * float(cv) / 100.0
                    if annual is not None
                    else None
                )
            else:
                application.gross_commission_rate = None
                application.gross_commission = float(cv)
        else:
            if not getattr(application, 'gross_commission_kind', None):
                application.gross_commission_kind = 'amount'
            if application.gross_commission_kind != 'rate':
                application.gross_commission_rate = None

    gross_kind = getattr(application, 'gross_commission_kind', None) or 'amount'
    gross_rate = getattr(application, 'gross_commission_rate', None)
    if gross_kind == 'rate':
        application.gross_commission = (
            (annual - edu_amount) * float(gross_rate) / 100.0
            if gross_rate is not None and annual is not None
            else None
        )
    gross = float(application.gross_commission) if application.gross_commission is not None else None

    # yurtdışı kdv oranı default %10
    if application.abroad_vat_rate is None:
        application.abroad_vat_rate = 10.0
    abroad_rate = float(application.abroad_vat_rate) if application.abroad_vat_rate is not None else 10.0

    # yurtdışı kdv tutarı + net komisyon
    if gross is not None:
        application.abroad_vat = gross * abroad_rate / 100.0
        application.net_commission = gross - application.abroad_vat
    else:
        application.abroad_vat = None
        application.net_commission = None

    net = float(application.net_commission) if application.net_commission is not None else None

    # --- Acente komisyon ---
    # Kaynak: agent üniversite+derece → agent üniversite+tümü → sabit tutar 0
    agent_cfg = _agent_commission_for_user_university(
        application.user_id,
        program.university_id if program else None,
        program_degree
    )

    should_seed_agency = (
        (not preserve_agency_commission)
        and (prefer_user_agency_commission or application.agency_commission is None)
    )
    if should_seed_agency:
        if agent_cfg and agent_cfg.get('kind') in ('rate', 'amount') and agent_cfg.get('value') is not None:
            application.agency_commission_kind = agent_cfg['kind']
            if agent_cfg['kind'] == 'rate':
                application.agency_commission_rate = float(agent_cfg['value'])
                application.agency_commission = (
                    net * float(agent_cfg['value']) / 100.0
                    if net is not None
                    else None
                )
            else:
                application.agency_commission_rate = None
                application.agency_commission = float(agent_cfg['value'])
        else:
            application.agency_commission_kind = 'amount'
            application.agency_commission_rate = None
            application.agency_commission = 0.0

    agency_kind = getattr(application, 'agency_commission_kind', None) or 'amount'
    agency_rate = getattr(application, 'agency_commission_rate', None)
    if agency_kind == 'rate':
        application.agency_commission = (
            net * float(agency_rate) / 100.0
            if agency_rate is not None and net is not None
            else None
        )

    # depozito desteği: kullanıcı/universite eşleşmesindeki sabit tutar
    if prefer_user_deposit_support and agent_cfg and agent_cfg.get('depositSupport') is not None:
        application.deposit_support = agent_cfg['depositSupport']

    agency_bonus = float(application.agency_bonus) if application.agency_bonus is not None else 0.0
    agency_comm = float(application.agency_commission) if application.agency_commission is not None else 0.0

    # acenta anlaşma miktarı = acenta komisyon + acenta bonus
    application.agency_contract_amount = agency_comm + agency_bonus

    bonus_min = float(application.bonus_min) if application.bonus_min is not None else 0.0
    bonus_max = float(application.bonus_max) if application.bonus_max is not None else 0.0
    contract_amount = float(application.agency_contract_amount) if application.agency_contract_amount is not None else 0.0

    # kalan min/max
    if net is not None:
        application.remaining_min = (net + bonus_min) - contract_amount
        application.remaining_max = (net + bonus_max) - contract_amount
    else:
        application.remaining_min = None
        application.remaining_max = None

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
    db.session.flush()
    if (user.role or '').lower() == 'agent':
        raw_commissions = data.get('agentCommissions')
        if _agent_commissions_have_duplicate(raw_commissions):
            db.session.rollback()
            return jsonify({'message': 'Aynı üniversite ve derece için iki satır eklenemez'}), 400
        _replace_user_agent_commissions(user.id, _normalize_agent_commissions(raw_commissions))
    db.session.commit()
    return jsonify({'message': 'تمت إضافة المستخدم', 'id': user.id}), 201

# تحديث الملف الشخصي (كلمة السر والهاتف)
@api_bp.route('/users/update-profile', methods=['PUT'])
def update_profile():
    data = request.json or {}
    user_id = data.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'Kullanıcı bulunamadı'}), 404

    if 'name' in data and data['name']:
        user.name = data['name'].strip()
    if 'email' in data and data['email']:
        existing = User.query.filter(User.email == data['email'].strip(), User.id != user_id).first()
        if existing:
            return jsonify({'message': 'Bu e-posta başka bir kullanıcı tarafından kullanılıyor'}), 409
        user.email = data['email'].strip()
    if data.get('password'):
        current = (data.get('currentPassword') or '').strip()
        if not current:
            return jsonify({'message': 'Mevcut şifre gerekli'}), 400
        if user.password != current:
            return jsonify({'message': 'Mevcut şifre hatalı'}), 400
        new_password = str(data['password']).strip()
        if len(new_password) < 4:
            return jsonify({'message': 'Yeni şifre en az 4 karakter olmalı'}), 400
        user.password = new_password
    if 'phone' in data:
        user.phone = data['phone']
    if 'countryCode' in data:
        user.country_code = data.get('countryCode')

    db.session.commit()
    return jsonify({
        'message': 'Bilgiler güncellendi',
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
    commissions_by_user = {}
    for r in UserUniversityCommission.query.all():
        commissions_by_user.setdefault(r.user_id, []).append({
            'universityId': r.university_id,
            'degree': getattr(r, 'degree', None),
            'commissionKind': r.commission_kind,
            'commissionValue': r.commission_value,
            'depositSupport': r.deposit_support
        })
    return jsonify([{
        'id': u.id,
        'name': u.name,
        'email': u.email,
        'role': u.role,
        'phone': u.phone,
        'countryCode': getattr(u, 'country_code', None),
        'active': getattr(u, 'is_active', True),
        'agentCommissions': commissions_by_user.get(u.id, [])
    } for u in users])

# حذف مستخدم
def _user_delete_blockers(user_id):
    return {
        'studentCount': Student.query.filter_by(user_id=user_id).count(),
        'agentApplicationCount': Application.query.filter_by(user_id=user_id).count(),
        'responsibleApplicationCount': Application.query.filter_by(responsible_id=user_id).count(),
        'newsCount': NewsItem.query.filter_by(created_by=user_id).count(),
        'outgoingPaymentCount': OutgoingPayment.query.filter_by(user_id=user_id).count(),
    }


def _user_delete_block_message(blockers):
    parts = []
    if blockers['studentCount']:
        parts.append(f"{blockers['studentCount']} öğrenci")
    if blockers['agentApplicationCount']:
        parts.append(f"{blockers['agentApplicationCount']} başvuru (temsilci)")
    if blockers['responsibleApplicationCount']:
        parts.append(f"{blockers['responsibleApplicationCount']} başvuru (sorumlu)")
    if blockers['newsCount']:
        parts.append(f"{blockers['newsCount']} haber")
    if blockers['outgoingPaymentCount']:
        parts.append(f"{blockers['outgoingPaymentCount']} giden ödeme")
    if not parts:
        return None
    return 'Bu kullanıcıya bağlı kayıtlar var: ' + ', '.join(parts) + '. Silmeden önce bu kayıtları kaldırın veya başka kullanıcıya aktarın.'


@api_bp.route('/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    admin_err = _require_admin()
    if admin_err:
        return admin_err
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'Kullanıcı bulunamadı'}), 404

    blockers = _user_delete_blockers(user_id)
    block_message = _user_delete_block_message(blockers)
    if block_message:
        return jsonify({'message': block_message, 'blockers': blockers}), 400

    Notification.query.filter_by(user_id=user_id).delete(synchronize_session=False)
    ApplicationMessage.query.filter_by(sender_user_id=user_id).update(
        {ApplicationMessage.sender_user_id: None},
        synchronize_session=False
    )
    UserUniversityCommission.query.filter_by(user_id=user_id).delete(synchronize_session=False)

    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Kullanıcı silindi'}), 200
    except Exception:
        db.session.rollback()
        return jsonify({'message': 'Kullanıcı silinemedi. Bağlı kayıtlar olabilir.'}), 400

# تحديث مستخدم (تعديل + تفعيل/إلغاء تفعيل)
@api_bp.route('/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    admin_err = _require_admin()
    if admin_err:
        return admin_err
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'Kullanıcı bulunamadı'}), 404
    data = request.json or {}
    if 'name' in data:
        user.name = data['name']
    if 'email' in data:
        if User.query.filter(User.email == data['email'], User.id != user_id).first():
            return jsonify({'message': 'Bu e-posta başka bir kullanıcı tarafından kullanılıyor'}), 409
        user.email = data['email']
    if 'role' in data:
        user.role = data['role']
    if 'phone' in data:
        user.phone = data['phone']
    if 'countryCode' in data:
        user.country_code = data['countryCode']
    if 'password' in data and data['password']:
        new_password = str(data['password']).strip()
        if len(new_password) < 4:
            return jsonify({'message': 'Yeni şifre en az 4 karakter olmalı'}), 400
        user.password = new_password
    if 'active' in data:
        user.is_active = bool(data['active'])
    if 'agentCommissions' in data or (user.role or '').lower() == 'agent':
        raw_commissions = data.get('agentCommissions')
        if (user.role or '').lower() == 'agent' and _agent_commissions_have_duplicate(raw_commissions):
            return jsonify({'message': 'Aynı üniversite ve derece için iki satır eklenemez'}), 400
        rows = _normalize_agent_commissions(raw_commissions)
        _replace_user_agent_commissions(user.id, rows if (user.role or '').lower() == 'agent' else [])
    db.session.commit()
    return jsonify({'message': 'تم تحديث المستخدم', 'id': user.id}), 200


@api_bp.route('/users/<user_id>/statement', methods=['GET'])
def get_user_statement(user_id):
    guard = _require_admin()
    if guard:
        return guard
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    debt_apps = Application.query.filter_by(user_id=user_id).all()
    debts = []
    total_debt = 0.0
    for app in debt_apps:
        if not bool(getattr(app, 'payment_deserved', False)):
            continue
        amount = getattr(app, 'agency_contract_amount', None)
        if amount is None:
            continue
        program = Program.query.get(app.program_id) if app.program_id else None
        uni = University.query.get(program.university_id) if program and program.university_id else None
        student = Student.query.get(app.student_id) if app.student_id else None
        amount_f = float(amount)
        total_debt += amount_f
        debts.append({
            'applicationId': app.id,
            'studentName': f"{student.first_name} {student.last_name}" if student else None,
            'universityName': uni.name if uni else None,
            'date': app.created_at,
            'amount': amount_f,
            'currency': getattr(app, 'currency', None) or 'USD'
        })

    payment_rows = OutgoingPayment.query.filter_by(user_id=user_id).order_by(OutgoingPayment.payment_date.desc()).all()
    payments = []
    total_payments = 0.0
    for p in payment_rows:
        amount_f = float(p.payment_amount or 0)
        total_payments += amount_f
        payments.append({
            'id': p.id,
            'sequenceNumber': p.sequence_number,
            'date': p.payment_date,
            'amount': amount_f,
            'currency': getattr(p, 'currency', None) or 'USD',
            'paymentType': p.payment_type,
            'paymentReason': p.payment_reason,
            'expenseType': getattr(p, 'expense_type', None),
            'commissionShape': getattr(p, 'commission_shape', None),
            'description1': p.description_1
        })

    return jsonify({
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email
        },
        'debts': debts,
        'payments': payments,
        'totalDebt': total_debt,
        'totalPayments': total_payments,
        'balance': total_debt - total_payments
    }), 200

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
        session.clear()
        session['user_id'] = user.id
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


@api_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True}), 200


@api_bp.route('/session', methods=['GET'])
def get_session():
    user = _session_user()
    if not user:
        return jsonify({'success': False}), 401
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
    }), 200


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
    data = request.json or {}
    user_role = data.get('role')
    user_id = data.get('user_id')
    actor_user_id = (data.get('actorUserId') or '').strip() or None
    created_by = actor_user_id or user_id
    if user_role == 'agent' and not user_id:
        return jsonify({'message': 'Agent user_id required'}), 400
    passport_number = str(data.get('passportNumber') or '').strip()
    if not passport_number:
        return jsonify({'message': 'Passport number is required', 'code': 'passport_required'}), 400
    if Student.query.filter_by(passport_number=passport_number).first():
        return jsonify({
            'message': 'A student with this passport number already exists',
            'code': 'passport_exists'
        }), 409
    created_at = _iso_timestamp()
    student = Student(
        id=str(uuid.uuid4()),
        first_name=data['firstName'],
        last_name=data['lastName'],
        passport_number=passport_number,
        father_name=data.get('fatherName') or '',
        mother_name=data.get('motherName') or '',
        gender=data['gender'],
        phone=data.get('phone') or '',
        email=data.get('email') or '',
        nationality=data['nationality'],
        degree_target=data.get('degreeTarget') or '',
        dob=data['dob'],
        residence_country=data.get('residenceCountry') or '',
        user_id=user_id,
        created_by=created_by,
        created_at=created_at,
        updated_at=created_at
    )
    db.session.add(student)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'message': 'A student with this passport number already exists',
            'code': 'passport_exists'
        }), 409
    # 7. Notify admin and users when an agent adds a student
    if user_id:
        agent_user = User.query.get(user_id)
        if agent_user and _is_agent_user(agent_user):
            for u in _staff_users():
                n = Notification(
                    id=str(uuid.uuid4()),
                    user_id=u.id,
                    title="New student by agent",
                    message=f"Agent {agent_user.name} added student {student.first_name} {student.last_name}.",
                    link=f"/students/{student.id}",
                    created_at=datetime.utcnow().isoformat(),
                    type="STATUS"
                )
                db.session.add(n)
            db.session.commit()
    print(f"Created student {student.id} user_id={user_id} created_by={created_by}")
    creator = User.query.get(created_by) if created_by else None
    return jsonify({
        'message': 'Student added',
        'id': student.id,
        'createdAt': created_at,
        'updatedAt': created_at,
        'createdBy': created_by,
        'createdByName': creator.name if creator else None
    }), 201


@api_bp.route('/students/<student_id>', methods=['PUT'])
def update_student(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'message': 'Student not found'}), 404
    data = request.json or {}
    if _request_role_value() == 'AGENT':
        return jsonify({'message': 'Agents cannot edit students'}), 403
    if 'passportNumber' in data:
        passport_number = str(data.get('passportNumber') or '').strip()
        if not passport_number:
            return jsonify({'message': 'Passport number is required', 'code': 'passport_required'}), 400
        existing = Student.query.filter(
            Student.passport_number == passport_number,
            Student.id != student_id
        ).first()
        if existing:
            return jsonify({
                'message': 'A student with this passport number already exists',
                'code': 'passport_exists'
            }), 409
        student.passport_number = passport_number
    student.first_name = data.get('firstName', student.first_name)
    student.last_name = data.get('lastName', student.last_name)
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
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'message': 'A student with this passport number already exists',
            'code': 'passport_exists'
        }), 409
    return jsonify({'message': 'Student updated', 'updatedAt': student.updated_at})


@api_bp.route('/students/<student_id>', methods=['DELETE'])
def delete_student(student_id):
    denied = _require_admin()
    if denied:
        return denied
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'message': 'Student not found'}), 404
    apps = Application.query.filter_by(student_id=student_id).all()
    deleted_app_ids = [a.id for a in apps]
    for app in apps:
        _delete_application_record(app)
    for filename in _student_files_raw(student):
        _delete_upload_file(filename)
    _delete_notifications_for_link_fragment(f'/students/{student_id}')
    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student deleted', 'deletedApplicationIds': deleted_app_ids}), 200


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
        'logo': getattr(u, 'logo', None),
        'educationVatRate': getattr(u, 'education_vat_rate', None),
        'abroadVatRate': getattr(u, 'abroad_vat_rate', None),
        'commissionKind': getattr(u, 'commission_kind', None),
        'commissionValue': getattr(u, 'commission_value', None),
        'bonusMax': getattr(u, 'bonus_max', None),
        'bonusMin': getattr(u, 'bonus_min', None),
        'degreeCommissions': getattr(u, 'degree_commissions', None) or []
    } for u in universities])

@api_bp.route('/universities', methods=['POST'])
def add_university():
    data = request.json
    user_role = data.get('role')
    if user_role == 'agent':
        return jsonify({'message': 'Agents are not allowed to add universities'}), 403
    evr = data.get('educationVatRate')
    if evr is not None and evr != '':
        try:
            evr = int(evr)
        except (TypeError, ValueError):
            return jsonify({'message': 'educationVatRate must be an integer'}), 400
    else:
        evr = None
    avr = data.get('abroadVatRate')
    if avr is not None and avr != '':
        try:
            avr = float(avr)
        except (TypeError, ValueError):
            return jsonify({'message': 'abroadVatRate must be a number'}), 400
    else:
        avr = None
    ck = (data.get('commissionKind') or '').strip() or None
    if ck is not None and ck not in ('amount', 'rate'):
        return jsonify({'message': 'commissionKind must be amount or rate'}), 400
    cv = data.get('commissionValue')
    if cv is not None and cv != '':
        try:
            cv = float(cv)
        except (TypeError, ValueError):
            return jsonify({'message': 'commissionValue must be a number'}), 400
    else:
        cv = None
    if ck and cv is None:
        return jsonify({'message': 'commissionValue required when commissionKind is set'}), 400
    if cv is not None and not ck:
        return jsonify({'message': 'commissionKind required when commissionValue is set'}), 400
    bmax = data.get('bonusMax')
    if bmax is not None and bmax != '':
        try:
            bmax = float(bmax)
        except (TypeError, ValueError):
            return jsonify({'message': 'bonusMax must be a number'}), 400
    else:
        bmax = None
    bmin = data.get('bonusMin')
    if bmin is not None and bmin != '':
        try:
            bmin = float(bmin)
        except (TypeError, ValueError):
            return jsonify({'message': 'bonusMin must be a number'}), 400
    else:
        bmin = None

    degree_commissions = None
    if 'degreeCommissions' in data:
        degree_commissions = _normalize_degree_commissions(data.get('degreeCommissions'))

    university = University(
        id=str(uuid.uuid4()),
        name=data['name'],
        website=data['website'],
        country=data['country'],
        city=data.get('city', ''),
        description=data['description'],
        logo=data.get('logo'),  # optional logo (base64 or URL)
        education_vat_rate=evr,
        abroad_vat_rate=avr,
        commission_kind=ck,
        commission_value=cv,
        bonus_max=bmax,
        bonus_min=bmin,
        degree_commissions=degree_commissions
    )
    db.session.add(university)
    db.session.commit()
    return jsonify({'message': 'University added', 'id': university.id, 'logo': university.logo}), 201

# Programs
@api_bp.route('/programs', methods=['GET'])
def get_programs():
    role = _request_role_value()
    include_archived = request.args.get('includeArchived') in ('1', 'true', 'yes', 'True')
    archived_only = request.args.get('archivedOnly') in ('1', 'true', 'yes', 'True')

    query = Program.query.order_by(Program.name.asc())
    if role != 'ADMIN':
        query = query.filter(Program.is_archived == False)
    elif archived_only:
        query = query.filter(Program.is_archived == True)
    elif not include_archived:
        query = query.filter(Program.is_archived == False)
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
    denied = _require_admin()
    if denied:
        return denied
    data = request.json or {}
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
        description=data.get('description') or '',
        is_open=True if data.get('isOpen') is None else bool(data.get('isOpen')),
        is_archived=False
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
    denied = _require_admin()
    if denied:
        return denied
    program = Program.query.get(prog_id)
    if not program:
        return jsonify({'message': 'البرنامج غير موجود'}), 404
    linked_count = Application.query.filter_by(program_id=prog_id).count()
    if linked_count > 0:
        return jsonify({
            'message': 'Program has linked applications',
            'code': 'PROGRAM_HAS_APPLICATIONS',
            'applicationCount': linked_count
        }), 409
    db.session.delete(program)
    db.session.commit()
    return jsonify({'message': 'تم حذف البرنامج'}), 200

# Update Program
@api_bp.route('/programs/<prog_id>', methods=['PUT'])
def update_program(prog_id):
    denied = _require_admin()
    if denied:
        return denied
    program = Program.query.get(prog_id)
    if not program:
        return jsonify({'message': 'البرنامج غير موجود'}), 404
    data = request.json
    program.university_id = data.get('universityId', program.university_id)
    program.name = data.get('name', program.name)
    if 'nameInArabic' in data:
        program.name_in_arabic = data['nameInArabic'] or None
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
    if 'description' in data:
        program.description = data['description']
    if 'isOpen' in data:
        program.is_open = bool(data['isOpen'])
    if 'isArchived' in data:
        program.is_archived = bool(data['isArchived'])
    
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
    if 'educationVatRate' in data:
        evr = data.get('educationVatRate')
        if evr is None or evr == '':
            university.education_vat_rate = None
        else:
            try:
                university.education_vat_rate = int(evr)
            except (TypeError, ValueError):
                return jsonify({'message': 'educationVatRate must be an integer'}), 400
    if 'abroadVatRate' in data:
        avr = data.get('abroadVatRate')
        if avr is None or avr == '':
            university.abroad_vat_rate = None
        else:
            try:
                university.abroad_vat_rate = float(avr)
            except (TypeError, ValueError):
                return jsonify({'message': 'abroadVatRate must be a number'}), 400
    if 'commissionKind' in data:
        ck = (data.get('commissionKind') or '').strip() or None
        if ck and ck not in ('amount', 'rate'):
            return jsonify({'message': 'commissionKind must be amount or rate'}), 400
        university.commission_kind = ck
    if 'commissionValue' in data:
        cv = data.get('commissionValue')
        if cv is None or cv == '':
            university.commission_value = None
        else:
            try:
                university.commission_value = float(cv)
            except (TypeError, ValueError):
                return jsonify({'message': 'commissionValue must be a number'}), 400
    ck_final = getattr(university, 'commission_kind', None)
    cv_final = getattr(university, 'commission_value', None)
    if ck_final and cv_final is None:
        return jsonify({'message': 'commissionValue required when commissionKind is set'}), 400
    if cv_final is not None and not ck_final:
        return jsonify({'message': 'commissionKind required when commissionValue is set'}), 400
    if 'bonusMax' in data:
        bmax = data.get('bonusMax')
        if bmax is None or bmax == '':
            university.bonus_max = None
        else:
            try:
                university.bonus_max = float(bmax)
            except (TypeError, ValueError):
                return jsonify({'message': 'bonusMax must be a number'}), 400
    if 'bonusMin' in data:
        bmin = data.get('bonusMin')
        if bmin is None or bmin == '':
            university.bonus_min = None
        else:
            try:
                university.bonus_min = float(bmin)
            except (TypeError, ValueError):
                return jsonify({'message': 'bonusMin must be a number'}), 400
    if 'degreeCommissions' in data:
        university.degree_commissions = _normalize_degree_commissions(data.get('degreeCommissions'))
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
    programs_updated = 0
    if 'active' in data and isinstance(data['active'], bool):
        new_active = data['active']
        if new_active != period.active:
            programs_updated = _sync_program_archive_for_period(period_id, archived=not new_active)
        period.active = new_active
    db.session.commit()
    resp = {'message': 'Period updated'}
    if programs_updated:
        resp['programsUpdated'] = programs_updated
        resp['programsArchived'] = not period.active
    return jsonify(resp)


@api_bp.route('/periods/<period_id>', methods=['DELETE'])
def delete_period(period_id):
    period = Period.query.get(period_id)
    if not period:
        return jsonify({'message': 'Period not found'}), 404
    db.session.delete(period)
    db.session.commit()
    return jsonify({'message': 'Period deleted'})


@api_bp.route('/agency-companies', methods=['GET'])
def get_agency_companies():
    companies = AgencyCompany.query.order_by(AgencyCompany.name.asc()).all()
    return jsonify([{
        'id': c.id,
        'name': c.name
    } for c in companies])


@api_bp.route('/agency-companies', methods=['POST'])
def add_agency_company():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'message': 'Company name is required'}), 400
    company = AgencyCompany(
        id=str(uuid.uuid4()),
        name=name
    )
    db.session.add(company)
    db.session.commit()
    return jsonify({'message': 'Agency company added', 'id': company.id}), 201


@api_bp.route('/agency-companies/<company_id>', methods=['PUT'])
def update_agency_company(company_id):
    company = AgencyCompany.query.get(company_id)
    if not company:
        return jsonify({'message': 'Agency company not found'}), 404
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'message': 'Company name is required'}), 400
    company.name = name
    db.session.commit()
    return jsonify({'message': 'Agency company updated'}), 200


@api_bp.route('/agency-companies/<company_id>', methods=['DELETE'])
def delete_agency_company(company_id):
    company = AgencyCompany.query.get(company_id)
    if not company:
        return jsonify({'message': 'Agency company not found'}), 404
    linked_app = Application.query.filter_by(agency_company_id=company_id).first()
    if linked_app:
        return jsonify({'message': 'Bu aracı firmaya bağlı başvuru olduğu için silinemez'}), 400
    db.session.delete(company)
    db.session.commit()
    return jsonify({'message': 'Agency company deleted'}), 200


@api_bp.route('/payment-sources', methods=['GET'])
def get_payment_sources():
    sources = PaymentSource.query.order_by(PaymentSource.name.asc()).all()
    return jsonify([{
        'id': s.id,
        'name': s.name
    } for s in sources])


@api_bp.route('/payment-sources', methods=['POST'])
def add_payment_source():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'message': 'Payment source name is required'}), 400
    source = PaymentSource(
        id=str(uuid.uuid4()),
        name=name
    )
    db.session.add(source)
    db.session.commit()
    return jsonify({'message': 'Payment source added', 'id': source.id}), 201


@api_bp.route('/payment-sources/<source_id>', methods=['PUT'])
def update_payment_source(source_id):
    source = PaymentSource.query.get(source_id)
    if not source:
        return jsonify({'message': 'Payment source not found'}), 404
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'message': 'Payment source name is required'}), 400
    source.name = name
    db.session.commit()
    return jsonify({'message': 'Payment source updated'}), 200


@api_bp.route('/payment-sources/<source_id>', methods=['DELETE'])
def delete_payment_source(source_id):
    source = PaymentSource.query.get(source_id)
    if not source:
        return jsonify({'message': 'Payment source not found'}), 404
    linked_payment = IncomingPayment.query.filter_by(payment_source_id=source_id).first()
    if not linked_payment:
        linked_payment = IncomingPayment.query.filter_by(payment_source=source.name).first()
    if linked_payment:
        return jsonify({'message': 'Bu ödeme kaynağına bağlı gelen ödeme olduğu için silinemez'}), 400
    db.session.delete(source)
    db.session.commit()
    return jsonify({'message': 'Payment source deleted'}), 200


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
        student_by_id = _student_by_id_for_applications(applications)
        return jsonify({
            'items': [_serialize_application(a, program_by_id, student_by_id) for a in applications],
            'total': total,
            'page': page,
            'pageSize': page_size,
            'totalPages': max(1, (total + page_size - 1) // page_size)
        })
    applications = query.all()
    program_ids = [a.program_id for a in applications if a.program_id]
    program_by_id = {p.id: p for p in Program.query.filter(Program.id.in_(program_ids)).all()} if program_ids else {}
    student_by_id = _student_by_id_for_applications(applications)
    return jsonify([_serialize_application(a, program_by_id, student_by_id) for a in applications])


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
    actor_user_id = (request.form.get('actorUserId') or '').strip() or None
    created_by = actor_user_id or user_id
    responsible_id = request.form.get('responsible_id') or None
    agency_company_id = request.form.get('agency_company_id') or None
    period_error = _validate_application_period_and_program(period_id, program_id)
    if period_error:
        return period_error
    created_at = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    saved_files = _save_upload_files(files)
    if files and any((getattr(f, 'filename', None) or '').strip() for f in files) and not saved_files:
        return jsonify({'message': 'Could not save uploaded files'}), 400
    application = Application(
        id=_generate_app_id(),
        student_id=student_id,
        program_id=program_id,
        period_id=period_id,
        status=status,
        semester=semester,
        created_at=created_at,
        updated_at=created_at,
        files=[],
        user_id=user_id,
        created_by=created_by,
        responsible_id=responsible_id,
        agency_company_id=agency_company_id
    )
    _compute_application_finance(
        application,
        prefer_user_agency_commission=True,
        prefer_user_deposit_support=True
    )
    db.session.add(application)
    stu = Student.query.get(student_id)
    if stu:
        stu.updated_at = created_at
        if saved_files:
            _append_student_files(stu, saved_files)
    db.session.commit()
    if stu:
        db.session.refresh(stu)
    # 7. Notify admin and users when an agent adds an application
    if user_id:
        agent_user = User.query.get(user_id)
        if agent_user and _is_agent_user(agent_user):
            for u in _staff_users():
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
    file_urls = [url_for('api.upload_file', filename=f, _external=False) for f in _student_files_raw(stu)]
    program = Program.query.get(application.program_id) if application.program_id else None
    program_by_id = {program.id: program} if program else {}
    student_by_id = {stu.id: stu} if stu else {}
    return jsonify({
        'message': 'Application added',
        'id': application.id,
        'files': file_urls,
        'createdAt': application.created_at,
        'updatedAt': application.updated_at or application.created_at,
        'studentId': student_id,
        'studentUpdatedAt': stu.updated_at if stu else None,
        'application': _serialize_application(application, program_by_id, student_by_id)
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
    agency_company_id = request.form.get('agency_company_id') or None
    actor_user_id = (request.form.get('actorUserId') or request.form.get('user_id') or '').strip() or None
    period_error = _validate_application_period_and_program(period_id, program_id)
    if period_error:
        return period_error
    created_at = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    saved_files = _save_upload_files(files)

    app_id = _generate_app_id()
    application = Application(
        id=app_id,
        student_id=student_id,
        program_id=program_id,
        period_id=period_id,
        status=status,
        semester=semester,
        agency_company_id=agency_company_id,
        created_by=actor_user_id,
        created_at=created_at,
        updated_at=created_at,
        files=[]
    )
    _compute_application_finance(
        application,
        prefer_user_agency_commission=True,
        prefer_user_deposit_support=True
    )
    db.session.add(application)
    stu = Student.query.get(student_id)
    if stu:
        stu.updated_at = created_at
        if saved_files:
            _append_student_files(stu, saved_files)
    db.session.commit()
    file_urls = [url_for('api.upload_file', filename=f, _external=False) for f in _student_files_raw(stu)]
    program = Program.query.get(application.program_id) if application.program_id else None
    program_by_id = {program.id: program} if program else {}
    student_by_id = {stu.id: stu} if stu else {}
    return jsonify({
        'message': 'Application added',
        'id': application.id,
        'files': file_urls,
        'createdAt': application.created_at,
        'updatedAt': application.updated_at or application.created_at,
        'studentId': student_id,
        'studentUpdatedAt': _student_updated_at_for_api(stu) if stu else None,
        'application': _serialize_application(application, program_by_id, student_by_id)
    }), 201


# Messages for applications
def _serialize_application_message(message):
    sender_user = User.query.get(message.sender_user_id) if message.sender_user_id else None
    return {
        'id': message.id,
        'applicationId': message.application_id,
        'sender': message.sender,
        'senderUserId': message.sender_user_id,
        'senderName': sender_user.name if sender_user else None,
        'message': message.message,
        'createdAt': message.created_at
    }


@api_bp.route('/applications/<app_id>/messages', methods=['GET'])
def get_application_messages(app_id):
    msgs = ApplicationMessage.query.filter(
        ApplicationMessage.application_id == app_id,
        db.or_(
            ApplicationMessage.channel == 'public',
            ApplicationMessage.channel.is_(None)
        )
    ).order_by(ApplicationMessage.created_at).all()
    return jsonify([_serialize_application_message(message) for message in msgs])


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
        created_at=datetime.utcnow().isoformat(),
        channel='public'
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
            admins_and_users = _staff_users()
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


@api_bp.route('/applications/<app_id>/internal-messages', methods=['GET'])
def get_internal_application_messages(app_id):
    if not _request_staff_user():
        return jsonify({'message': 'Only admin and user roles can access internal messages'}), 403
    if not Application.query.get(app_id):
        return jsonify({'message': 'Application not found'}), 404
    messages = ApplicationMessage.query.filter_by(
        application_id=app_id,
        channel='internal'
    ).order_by(ApplicationMessage.created_at).all()
    return jsonify([_serialize_application_message(message) for message in messages])


@api_bp.route('/applications/<app_id>/internal-messages', methods=['POST'])
def post_internal_application_message(app_id):
    staff_user = _request_staff_user()
    if not staff_user:
        return jsonify({'message': 'Only admin and user roles can send internal messages'}), 403
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'message': 'Application not found'}), 404
    data = request.get_json(silent=True) or {}
    message_text = str(data.get('message') or '').strip()
    if not message_text:
        return jsonify({'message': 'message required'}), 400
    if len(message_text) > 10000:
        return jsonify({'message': 'Message cannot exceed 10000 characters'}), 400

    staff_by_id = {u.id: u for u in _staff_users()}
    mentioned_ids = set()
    for raw_id in (data.get('mentionedUserIds') or data.get('mentioned_user_ids') or []):
        uid = str(raw_id or '').strip()
        if uid and uid in staff_by_id and uid != staff_user.id:
            mentioned_ids.add(uid)
    for match in re.finditer(r'@\[([^\]]+)\]\(([^)]+)\)', message_text):
        uid = (match.group(2) or '').strip()
        if uid and uid in staff_by_id and uid != staff_user.id:
            mentioned_ids.add(uid)

    # Resolve plain @DisplayName mentions (longest name first)
    plain_text = re.sub(r'@\[([^\]]+)\]\(([^)]+)\)', r'@\1', message_text)
    named_staff = sorted(
        [
            (u, (u.name or u.email or '').strip())
            for u in staff_by_id.values()
            if (u.name or u.email or '').strip()
        ],
        key=lambda item: len(item[1]),
        reverse=True,
    )
    for idx, ch in enumerate(plain_text):
        if ch != '@':
            continue
        if idx > 0 and not plain_text[idx - 1].isspace():
            continue
        after = plain_text[idx + 1:]
        for user, name in named_staff:
            if after == name or after.startswith(name + ' ') or after.startswith(name + '\n'):
                if user.id != staff_user.id:
                    mentioned_ids.add(user.id)
                break

    preview = re.sub(r'@\[([^\]]+)\]\(([^)]+)\)', r'@\1', message_text)
    preview = (preview[:50] + '...') if len(preview) > 50 else preview

    message = ApplicationMessage(
        id=str(uuid.uuid4()),
        application_id=app_id,
        sender=(staff_user.role or 'USER').upper(),
        sender_user_id=staff_user.id,
        message=message_text,
        created_at=datetime.utcnow().isoformat(),
        channel='internal'
    )
    db.session.add(message)
    _touch_application_and_student(application)

    # Notify: all ADMIN + responsible USER (if set) + mentioned staff
    notify_ids = set()
    for user in staff_by_id.values():
        if (user.role or '').upper() == 'ADMIN':
            notify_ids.add(user.id)
    responsible_id = getattr(application, 'responsible_id', None)
    if responsible_id and responsible_id in staff_by_id:
        resp = staff_by_id[responsible_id]
        if (resp.role or '').upper() == 'USER':
            notify_ids.add(responsible_id)
    notify_ids.update(mentioned_ids)
    notify_ids.discard(staff_user.id)

    for user_id in notify_ids:
        is_mentioned = user_id in mentioned_ids
        db.session.add(Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title='You were mentioned' if is_mentioned else 'New Internal Message',
            message=f'App #{app_id}: {preview}',
            link=f'/applications/{app_id}',
            created_at=datetime.utcnow().isoformat(),
            type='MESSAGE'
        ))
    db.session.commit()

    student = Student.query.get(application.student_id)
    return jsonify({
        'message': 'Internal message added',
        'id': message.id,
        'sender': message.sender,
        'senderName': staff_user.name,
        'createdAt': message.created_at,
        'mentionedUserIds': list(mentioned_ids),
        'updatedAt': _application_updated_at_for_api(application),
        'studentId': application.student_id,
        'studentUpdatedAt': _student_updated_at_for_api(student) if student else None
    }), 201


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


# Student attachments (shared across all applications for that student)
@api_bp.route('/students/<student_id>/files', methods=['GET', 'POST'])
def student_files(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'message': 'Student not found'}), 404

    if request.method == 'GET':
        return jsonify(_student_files_info(student))

    file_type, type_error = _parse_upload_file_type()
    if type_error:
        return jsonify({'message': type_error}), 400
    file_description = (request.form.get('fileDescription') or '').strip() or None

    uploaded = request.files.getlist('files')
    if not uploaded or not any((getattr(f, 'filename', None) or '').strip() for f in uploaded):
        return jsonify({'message': 'No files provided'}), 400
    saved = _save_upload_files(uploaded)
    if not saved:
        return jsonify({'message': 'Could not save uploaded files'}), 400
    try:
        _append_student_files(student, saved)
        uploader_id = _form_uploader_id() or getattr(student, 'user_id', None)
        _apply_student_file_metadata(student, saved, file_type, file_description, uploader_id)
        _touch_student(student)
        db.session.commit()
        db.session.refresh(student)
    except Exception as e:
        db.session.rollback()
        print('student_files POST error:', e)
        return jsonify({'message': f'Failed to save files: {e}'}), 500

    uploader = User.query.get(uploader_id) if uploader_id else None
    link = f'/students/{student.id}'
    if _is_agent_user(uploader):
        _notify_staff_agent_file_upload(
            uploader,
            title='Student files uploaded',
            message=f"Agent {uploader.name if uploader else 'Unknown'} uploaded file(s) for student {student.first_name} {student.last_name}.",
            link=link
        )
    else:
        _notify_agent_owner_file_upload(
            student, None, uploader, link,
            file_type=file_type, file_description=file_description
        )

    return jsonify({
        'message': 'Files added',
        'files': _student_files_info(student),
        'studentId': student.id,
        'studentUpdatedAt': _student_updated_at_for_api(student)
    }), 201


@api_bp.route('/students/<student_id>/files/<path:filename>', methods=['DELETE'])
def delete_student_file(student_id, filename):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'message': 'Student not found'}), 404

    current_files = _student_files_raw(student)
    if filename not in current_files:
        return jsonify({'message': 'File not found'}), 404

    student.files = [f for f in current_files if f != filename]
    _remove_student_file_metadata(student, filename)
    _touch_student(student)
    db.session.commit()

    upload_folder = UPLOADS_DIR
    file_path = os.path.join(upload_folder, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    return jsonify({
        'message': 'File deleted successfully',
        'studentId': student.id,
        'studentUpdatedAt': _student_updated_at_for_api(student)
    }), 200


# Application file routes — read/write student-level attachments (shared across applications)
@api_bp.route('/applications/<app_id>/files', methods=['GET', 'POST'])
def application_files(app_id):
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'message': 'Application not found'}), 404
    student = Student.query.get(application.student_id)
    if not student:
        return jsonify({'message': 'Student not found'}), 404

    if request.method == 'GET':
        return jsonify(_student_files_info(student))

    file_type, type_error = _parse_upload_file_type()
    if type_error:
        return jsonify({'message': type_error}), 400
    file_description = (request.form.get('fileDescription') or '').strip() or None

    uploaded = request.files.getlist('files')
    if not uploaded or not any((getattr(f, 'filename', None) or '').strip() for f in uploaded):
        return jsonify({'message': 'No files provided'}), 400
    saved = _save_upload_files(uploaded)
    if not saved:
        return jsonify({'message': 'Could not save uploaded files'}), 400
    try:
        _append_student_files(student, saved)
        uploader_id = _form_uploader_id() or getattr(application, 'user_id', None)
        _apply_student_file_metadata(student, saved, file_type, file_description, uploader_id)
        _touch_application_and_student(application)
        db.session.commit()
        db.session.refresh(student)
    except Exception as e:
        db.session.rollback()
        print('application_files POST error:', e)
        return jsonify({'message': f'Failed to save files: {e}'}), 500

    uploader = User.query.get(uploader_id) if uploader_id else None
    link = f"/applications/{application.id}"
    if file_type == 'receipt':
        _notify_application_receipt_upload(application, uploader, link)
    elif _is_agent_user(uploader):
        extra = [application.responsible_id] if getattr(application, 'responsible_id', None) else None
        _notify_staff_agent_file_upload(
            uploader,
            title='Application files uploaded',
            message=f"Agent {uploader.name if uploader else 'Unknown'} uploaded file(s) to application #{application.id}.",
            link=link,
            extra_user_ids=extra
        )
    else:
        _notify_agent_owner_file_upload(
            student, application, uploader, link,
            file_type=file_type, file_description=file_description
        )

    return jsonify({
        'message': 'Files added',
        'files': _student_files_info(student),
        'updatedAt': _application_updated_at_for_api(application),
        'studentId': application.student_id,
        'studentUpdatedAt': _student_updated_at_for_api(student)
    }), 201


@api_bp.route('/applications/<app_id>/files/<path:filename>', methods=['DELETE'])
def delete_application_file(app_id, filename):
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'message': 'Application not found'}), 404
    student = Student.query.get(application.student_id)
    if not student:
        return jsonify({'message': 'Student not found'}), 404

    current_files = _application_files_raw(application, student)
    if filename not in current_files:
        return jsonify({'message': 'File not found'}), 404

    student.files = [f for f in _student_files_raw(student) if f != filename]
    application.files = [f for f in (application.files or []) if f != filename]
    _remove_student_file_metadata(student, filename)
    _touch_application_and_student(application)
    db.session.commit()

    upload_folder = UPLOADS_DIR
    file_path = os.path.join(upload_folder, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    return jsonify({
        'message': 'File deleted successfully',
        'updatedAt': _application_updated_at_for_api(application),
        'studentId': application.student_id,
        'studentUpdatedAt': _student_updated_at_for_api(student)
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
    previous_status = application.status
    application.status = new_status
    _apply_acceptance_payment_markers(application)
    _touch_application_and_student(application)

    # Notify the assigned agent only for an actual status change.
    if previous_status != new_status:
        _add_application_agent_status_notification(application, new_status)
    
    # 6. Notify admin(s) when application is sent to review (e.g. by agent)
    if new_status in (
        'Yeni Başvuru',
        'Teklif mektubu bekleniyor',
        'Teklif Mektubu Bekleniyor',
        'Under Review',
        'UnderReview',
        'UNDER_REVIEW',
    ):
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
        'paymentDate': application.payment_date,
        'paymentMonth': application.payment_month,
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
    staff_user = _request_staff_user()
    if 'internalDescription' in data and not staff_user:
        return jsonify({'message': 'Only admin and user roles can update the internal description'}), 403
    previous_status = application.status
    if 'status' in data and data['status']:
        application.status = data['status']
        _apply_acceptance_payment_markers(application)
    if 'userId' in data:
        application.user_id = data['userId'] or None
    if 'responsibleId' in data:
        application.responsible_id = data['responsibleId'] or None
    if 'agencyCompanyId' in data:
        application.agency_company_id = data['agencyCompanyId'] or None
    if 'programId' in data or 'periodId' in data:
        new_program_id = data.get('programId') if 'programId' in data else application.program_id
        new_period_id = data.get('periodId') if 'periodId' in data else getattr(application, 'period_id', None)
        new_program_id = (new_program_id or '').strip() if isinstance(new_program_id, str) else new_program_id
        new_period_id = (new_period_id or '').strip() if isinstance(new_period_id, str) else new_period_id
        if not new_program_id:
            return jsonify({'message': 'programId required'}), 400
        if not new_period_id:
            return jsonify({'message': 'periodId required'}), 400
        program_changed = new_program_id != application.program_id
        period_changed = new_period_id != getattr(application, 'period_id', None)
        if program_changed or period_changed:
            period_error = _validate_application_period_and_program(new_period_id, new_program_id)
            if period_error:
                return period_error
            program = Program.query.get(new_program_id)
            if not program:
                return jsonify({'message': 'Program not found'}), 404
            if program.period_id and program.period_id != new_period_id:
                return jsonify({'message': 'Program does not belong to selected period'}), 400
        application.program_id = new_program_id
        application.period_id = new_period_id
    if 'internalDescription' in data:
        description = str(data.get('internalDescription') or '').strip()
        if len(description) > 10000:
            return jsonify({'message': 'Internal description cannot exceed 10000 characters'}), 400
        application.internal_description = description or None
    commission_kind_map = {
        'grossCommissionKind': 'gross_commission_kind',
        'agencyCommissionKind': 'agency_commission_kind'
    }
    for api_key, db_attr in commission_kind_map.items():
        if api_key in data:
            kind = (data.get(api_key) or 'amount').strip().lower()
            if kind not in ('amount', 'rate'):
                return jsonify({'message': f'{api_key} must be amount or rate'}), 400
            setattr(application, db_attr, kind)
    numeric_map = {
        'annualPayment': 'annual_payment',
        'educationVatRate': 'education_vat_rate',
        'grossCommissionRate': 'gross_commission_rate',
        'grossCommission': 'gross_commission',
        'abroadVatRate': 'abroad_vat_rate',
        'bonusMax': 'bonus_max',
        'bonusMin': 'bonus_min',
        'agencyCommissionRate': 'agency_commission_rate',
        'agencyCommission': 'agency_commission',
        'agencyBonus': 'agency_bonus',
        'depositSupport': 'deposit_support',
        'agencyContractAmount': 'agency_contract_amount',
        'remainingMin': 'remaining_min',
        'remainingMax': 'remaining_max'
    }
    for api_key, db_attr in numeric_map.items():
        if api_key in data:
            value = data.get(api_key)
            setattr(application, db_attr, value if value not in (None, '') else None)
    _compute_application_finance(
        application,
        prefer_user_agency_commission=(
            'agencyCommission' not in data
            and 'agencyCommissionKind' not in data
            and 'agencyCommissionRate' not in data
        ),
        preserve_gross_commission=(
            'grossCommission' in data
            or 'grossCommissionKind' in data
            or 'grossCommissionRate' in data
        ),
        preserve_agency_commission=(
            'agencyCommission' in data
            or 'agencyCommissionKind' in data
            or 'agencyCommissionRate' in data
        )
    )

    if 'currency' in data:
        value = (data.get('currency') or '').strip().upper()
        if value in ('USD', 'TRY', 'EUR'):
            application.currency = value
    if 'paymentDeserved' in data:
        application.payment_deserved = bool(data.get('paymentDeserved'))
    if application.status != previous_status:
        _add_application_agent_status_notification(application, application.status)
    _touch_application_and_student(application)
    db.session.commit()
    stu = Student.query.get(application.student_id)
    response_data = {
        'message': 'Application updated',
        'id': application.id,
        'status': application.status,
        'programId': application.program_id,
        'periodId': getattr(application, 'period_id', None),
        'userId': application.user_id,
        'responsibleId': application.responsible_id,
        'agencyCompanyId': application.agency_company_id,
        'agencyCompanyName': application.agency_company.name if application.agency_company else None,
        'annualPayment': application.annual_payment,
        'educationVatRate': application.education_vat_rate,
        'educationVat': application.education_vat,
        'grossCommissionKind': application.gross_commission_kind or 'amount',
        'grossCommissionRate': application.gross_commission_rate,
        'grossCommission': application.gross_commission,
        'abroadVatRate': application.abroad_vat_rate if application.abroad_vat_rate is not None else 10.0,
        'abroadVat': application.abroad_vat,
        'netCommission': application.net_commission,
        'bonusMax': application.bonus_max,
        'bonusMin': application.bonus_min,
        'agencyCommissionKind': application.agency_commission_kind or 'amount',
        'agencyCommissionRate': application.agency_commission_rate,
        'agencyCommission': application.agency_commission,
        'agencyBonus': application.agency_bonus,
        'depositSupport': application.deposit_support,
        'agencyContractAmount': application.agency_contract_amount,
        'currency': application.currency or 'USD',
        'remainingMin': application.remaining_min,
        'remainingMax': application.remaining_max,
        'paymentDeserved': application.payment_deserved,
        'paymentDate': application.payment_date,
        'paymentMonth': application.payment_month,
        'updatedAt': _application_updated_at_for_api(application),
        'studentId': application.student_id,
        'studentUpdatedAt': _student_updated_at_for_api(stu)
    }
    if staff_user:
        response_data['internalDescription'] = application.internal_description
    return jsonify(response_data), 200


@api_bp.route('/applications/<app_id>', methods=['DELETE'])
def delete_application(app_id):
    denied = _require_admin()
    if denied:
        return denied
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'message': 'Application not found'}), 404
    student_id = application.student_id
    _delete_application_record(application)
    stu = Student.query.get(student_id)
    student_updated_at = None
    if stu:
        stu.updated_at = _iso_timestamp()
        student_updated_at = stu.updated_at
    db.session.commit()
    return jsonify({
        'message': 'Application deleted',
        'studentId': student_id,
        'studentUpdatedAt': student_updated_at
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
        'paymentType': getattr(r, 'payment_type', None) or 'Cash',
        'paymentSource': (r.payment_source_rel.name if getattr(r, 'payment_source_rel', None) else r.payment_source),
        'paymentSourceId': getattr(r, 'payment_source_id', None),
        'paymentAmount': getattr(r, 'payment_amount', None),
        'currency': getattr(r, 'currency', None) or 'USD',
        'description1': r.description_1,
        'description2': r.description_2,
        'receiptFiles': _files_info_list(_payment_receipt_files_raw(r)),
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
    payment_type = (data.get('paymentType') or '').strip()
    payment_source = (data.get('paymentSource') or '').strip()
    payment_source_id = (data.get('paymentSourceId') or '').strip()
    source_obj = None
    if payment_source_id:
        source_obj = PaymentSource.query.get(payment_source_id)
        if not source_obj:
            return jsonify({'message': 'Selected payment source not found'}), 400
        payment_source = source_obj.name
    payment_amount = data.get('paymentAmount')
    currency = (data.get('currency') or 'USD').strip().upper()
    if currency not in ('USD', 'TRY', 'EUR'):
        currency = 'USD'
    try:
        payment_amount = float(payment_amount)
    except (TypeError, ValueError):
        return jsonify({'message': 'paymentAmount must be a number'}), 400
    if not payment_date or payment_type not in INCOMING_PAYMENT_TYPES or not payment_source:
        return jsonify({'message': 'paymentDate, paymentType (Cash/Bank/Scholarship), paymentSource and paymentAmount are required'}), 400
    now = _iso_timestamp()
    record = IncomingPayment(
        id=str(uuid.uuid4()),
        sequence_number=_next_sequence(IncomingPayment),
        payment_date=payment_date,
        payment_type=payment_type,
        payment_source=payment_source,
        payment_source_id=(source_obj.id if source_obj else None),
        payment_amount=payment_amount,
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
        record.payment_source_id = None
    if 'paymentSourceId' in data:
        source_id = (data.get('paymentSourceId') or '').strip()
        if not source_id:
            return jsonify({'message': 'paymentSourceId cannot be empty'}), 400
        source_obj = PaymentSource.query.get(source_id)
        if not source_obj:
            return jsonify({'message': 'Selected payment source not found'}), 400
        record.payment_source_id = source_obj.id
        record.payment_source = source_obj.name
    if 'paymentType' in data:
        value = (data.get('paymentType') or '').strip()
        if value not in INCOMING_PAYMENT_TYPES:
            return jsonify({'message': 'paymentType must be Cash, Bank or Scholarship'}), 400
        record.payment_type = value
    if 'paymentAmount' in data:
        try:
            record.payment_amount = float(data.get('paymentAmount'))
        except (TypeError, ValueError):
            return jsonify({'message': 'paymentAmount must be a number'}), 400
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
    for filename in _payment_receipt_files_raw(record):
        _delete_upload_file(filename)
    db.session.delete(record)
    db.session.commit()
    return jsonify({'message': 'Incoming payment deleted'})


@api_bp.route('/incoming-payments/<payment_id>/receipts', methods=['GET', 'POST'])
def incoming_payment_receipts(payment_id):
    guard = _require_admin()
    if guard:
        return guard
    record = IncomingPayment.query.get(payment_id)
    if not record:
        return jsonify({'message': 'Incoming payment not found'}), 404

    if request.method == 'GET':
        return jsonify(_files_info_list(_payment_receipt_files_raw(record)))

    uploaded = request.files.getlist('files')
    if not uploaded or not any((getattr(f, 'filename', None) or '').strip() for f in uploaded):
        return jsonify({'message': 'No files provided'}), 400
    saved = _save_upload_files(uploaded)
    if not saved:
        return jsonify({'message': 'Could not save uploaded files'}), 400
    try:
        _append_payment_receipts(record, saved)
        record.updated_at = _iso_timestamp()
        db.session.commit()
        db.session.refresh(record)
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to save receipts: {e}'}), 500
    return jsonify({
        'message': 'Receipts added',
        'receiptFiles': _files_info_list(_payment_receipt_files_raw(record))
    }), 201


@api_bp.route('/incoming-payments/<payment_id>/receipts/<path:filename>', methods=['DELETE'])
def delete_incoming_payment_receipt(payment_id, filename):
    guard = _require_admin()
    if guard:
        return guard
    record = IncomingPayment.query.get(payment_id)
    if not record:
        return jsonify({'message': 'Incoming payment not found'}), 404
    current_files = _payment_receipt_files_raw(record)
    if filename not in current_files:
        return jsonify({'message': 'File not found'}), 404
    record.receipt_files = [f for f in current_files if f != filename]
    flag_modified(record, 'receipt_files')
    record.updated_at = _iso_timestamp()
    db.session.commit()
    _delete_upload_file(filename)
    return jsonify({
        'message': 'Receipt deleted',
        'receiptFiles': _files_info_list(_payment_receipt_files_raw(record))
    }), 200


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
        'expenseType': getattr(r, 'expense_type', None),
        'commissionShape': getattr(r, 'commission_shape', None),
        'description1': r.description_1,
        'receiptFiles': _files_info_list(_payment_receipt_files_raw(r)),
        'userId': getattr(r, 'user_id', None),
        'userName': (r.user.name if getattr(r, 'user', None) else None),
        'userRole': ((r.user.role or '').lower() if getattr(r, 'user', None) else None),
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
    user_id = (data.get('userId') or '').strip()
    if currency not in ('USD', 'TRY', 'EUR'):
        currency = 'USD'
    payment_amount = data.get('paymentAmount')
    if not payment_date or not payment_reason or payment_type not in ('Cash', 'Bank'):
        return jsonify({'message': 'paymentDate, paymentType (Cash/Bank), paymentReason are required'}), 400
    if payment_reason not in OUTGOING_PAYMENT_REASONS:
        return jsonify({'message': 'paymentReason must be commission, debt or company_expense'}), 400
    expense_value = None
    commission_shape_value = None
    if payment_reason == 'company_expense':
        expense_value = (data.get('expenseType') or '').strip()
        if expense_value not in NEW_COMPANY_EXPENSE_TYPES:
            return jsonify({'message': 'expenseType required for Firma masrafı: salaries, advertising, cekeyim, kira, cashback, deposit, support, other'}), 400
    if payment_reason == 'commission':
        commission_shape_value = (data.get('commissionShape') or '').strip()
        if commission_shape_value not in COMMISSION_SHAPES:
            return jsonify({'message': 'commissionShape required for Komisyon: agency_commission, employee_commission, student_referral_commission'}), 400
    try:
        payment_amount = float(payment_amount)
    except (TypeError, ValueError):
        return jsonify({'message': 'paymentAmount must be a number'}), 400
    user_value = None
    if user_id:
        user_obj = User.query.get(user_id)
        if not user_obj:
            return jsonify({'message': 'Selected user not found'}), 400
        user_value = user_obj.id
    now = _iso_timestamp()
    record = OutgoingPayment(
        id=str(uuid.uuid4()),
        sequence_number=_next_sequence(OutgoingPayment),
        payment_date=payment_date,
        payment_amount=payment_amount,
        currency=currency,
        payment_type=payment_type,
        payment_reason=payment_reason,
        expense_type=expense_value,
        commission_shape=commission_shape_value,
        description_1=(data.get('description1') or '').strip() or None,
        user_id=user_value,
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
        if value not in OUTGOING_PAYMENT_REASONS:
            return jsonify({'message': 'paymentReason must be commission, debt or company_expense'}), 400
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
    if 'userId' in data:
        user_id = (data.get('userId') or '').strip()
        if not user_id:
            record.user_id = None
        else:
            user_obj = User.query.get(user_id)
            if not user_obj:
                return jsonify({'message': 'Selected user not found'}), 400
            record.user_id = user_obj.id
    if record.payment_reason == 'company_expense':
        et = (record.expense_type or '').strip()
        if 'expenseType' in data:
            et = (data.get('expenseType') or '').strip()
        if not et:
            return jsonify({'message': 'expenseType required for company_expense'}), 400
        if 'expenseType' in data and et not in NEW_COMPANY_EXPENSE_TYPES:
            # Allow keeping an already-stored legacy value if the field was not changed
            if et not in COMPANY_EXPENSE_TYPES:
                return jsonify({'message': 'expenseType must be salaries, advertising, cekeyim, kira, cashback, deposit, support or other'}), 400
        elif et not in COMPANY_EXPENSE_TYPES:
            return jsonify({'message': 'expenseType required for company_expense'}), 400
        record.expense_type = et
    else:
        record.expense_type = None
    if record.payment_reason == 'commission':
        cs = (getattr(record, 'commission_shape', None) or '').strip()
        if 'commissionShape' in data:
            cs = (data.get('commissionShape') or '').strip()
        if cs not in COMMISSION_SHAPES:
            return jsonify({'message': 'commissionShape required for Komisyon: agency_commission, employee_commission, student_referral_commission'}), 400
        record.commission_shape = cs
    else:
        record.commission_shape = None
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
    for filename in _payment_receipt_files_raw(record):
        _delete_upload_file(filename)
    db.session.delete(record)
    db.session.commit()
    return jsonify({'message': 'Outgoing payment deleted'})


@api_bp.route('/outgoing-payments/<payment_id>/receipts', methods=['GET', 'POST'])
def outgoing_payment_receipts(payment_id):
    guard = _require_admin()
    if guard:
        return guard
    record = OutgoingPayment.query.get(payment_id)
    if not record:
        return jsonify({'message': 'Outgoing payment not found'}), 404

    if request.method == 'GET':
        return jsonify(_files_info_list(_payment_receipt_files_raw(record)))

    uploaded = request.files.getlist('files')
    if not uploaded or not any((getattr(f, 'filename', None) or '').strip() for f in uploaded):
        return jsonify({'message': 'No files provided'}), 400
    saved = _save_upload_files(uploaded)
    if not saved:
        return jsonify({'message': 'Could not save uploaded files'}), 400
    try:
        _append_payment_receipts(record, saved)
        record.updated_at = _iso_timestamp()
        db.session.commit()
        db.session.refresh(record)
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to save receipts: {e}'}), 500
    return jsonify({
        'message': 'Receipts added',
        'receiptFiles': _files_info_list(_payment_receipt_files_raw(record))
    }), 201


@api_bp.route('/outgoing-payments/<payment_id>/receipts/<path:filename>', methods=['DELETE'])
def delete_outgoing_payment_receipt(payment_id, filename):
    guard = _require_admin()
    if guard:
        return guard
    record = OutgoingPayment.query.get(payment_id)
    if not record:
        return jsonify({'message': 'Outgoing payment not found'}), 404
    current_files = _payment_receipt_files_raw(record)
    if filename not in current_files:
        return jsonify({'message': 'File not found'}), 404
    record.receipt_files = [f for f in current_files if f != filename]
    flag_modified(record, 'receipt_files')
    record.updated_at = _iso_timestamp()
    db.session.commit()
    _delete_upload_file(filename)
    return jsonify({
        'message': 'Receipt deleted',
        'receiptFiles': _files_info_list(_payment_receipt_files_raw(record))
    }), 200


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


@api_bp.route('/news/<news_id>', methods=['DELETE'])
def delete_news(news_id):
    denied = _require_admin()
    if denied:
        return denied
    news = NewsItem.query.get(news_id)
    if not news:
        return jsonify({'message': 'News not found'}), 404
    db.session.delete(news)
    db.session.commit()
    return jsonify({'message': 'News deleted'}), 200


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


@api_bp.route('/notifications/<n_id>/unread', methods=['PUT'])
def mark_notification_unread(n_id):
    notification = Notification.query.get(n_id)
    if not notification:
        return jsonify({'message': 'Notification not found'}), 404
    notification.is_read = False
    db.session.commit()
    return jsonify({'message': 'Marked as unread'}), 200


@api_bp.route('/notifications/read-all', methods=['PUT'])
def mark_all_notifications_read():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': 'User ID required'}), 400
    updated = Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All marked as read', 'count': updated}), 200
