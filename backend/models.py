
from app import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String, primary_key=True)
    name = db.Column(db.String, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    password = db.Column(db.String, nullable=False)
    role = db.Column(db.String, nullable=False, default='ADMIN')
    phone = db.Column(db.String, nullable=True)
    country_code = db.Column(db.String, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.String, primary_key=True)
    first_name = db.Column(db.String, nullable=False)
    last_name = db.Column(db.String, nullable=False)
    passport_number = db.Column(db.String, unique=True, nullable=False)
    father_name = db.Column(db.String, nullable=False)
    mother_name = db.Column(db.String, nullable=False)
    gender = db.Column(db.String, nullable=False)
    phone = db.Column(db.String, nullable=False)
    email = db.Column(db.String, nullable=False)
    nationality = db.Column(db.String, nullable=False)
    degree_target = db.Column(db.String, nullable=False)
    dob = db.Column(db.String, nullable=False)
    residence_country = db.Column(db.String, nullable=False)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=True)  # Added to link student to agent
    created_at = db.Column(db.String, nullable=True)
    updated_at = db.Column(db.String, nullable=True)

class University(db.Model):
    __tablename__ = 'universities'
    id = db.Column(db.String, primary_key=True)
    name = db.Column(db.String, nullable=False)
    website = db.Column(db.String, nullable=False)
    country = db.Column(db.String, nullable=False)
    city = db.Column(db.String, nullable=False) # Added city field
    description = db.Column(db.Text, nullable=False)
    logo = db.Column(db.Text, nullable=True)  # URL or base64 - optional

class Program(db.Model):
    __tablename__ = 'programs'
    id = db.Column(db.String, primary_key=True)
    university_id = db.Column(db.String, db.ForeignKey('universities.id'), nullable=False)
    name = db.Column(db.String, nullable=False)
    name_in_arabic = db.Column(db.String, nullable=True)
    category = db.Column(db.String, nullable=True)
    degree = db.Column(db.String, nullable=False)
    language = db.Column(db.String, nullable=False)
    years = db.Column(db.Integer, nullable=False)
    deadline = db.Column(db.String, nullable=True)  # deprecated: use period_id
    period_id = db.Column(db.String, db.ForeignKey('periods.id'), nullable=True)
    fee = db.Column(db.Float, nullable=False)
    fee_before_discount = db.Column(db.Float, nullable=True)
    deposit = db.Column(db.Float, nullable=True)
    cash_price = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String, nullable=False, default='USD')
    country = db.Column(db.String, nullable=True)
    description = db.Column(db.Text)
    is_open = db.Column(db.Boolean, nullable=False, default=True)

class Application(db.Model):
    __tablename__ = 'applications'
    id = db.Column(db.String, primary_key=True)
    student_id = db.Column(db.String, db.ForeignKey('students.id'), nullable=False)
    program_id = db.Column(db.String, db.ForeignKey('programs.id'), nullable=False)
    period_id = db.Column(db.String, db.ForeignKey('periods.id'), nullable=True)
    status = db.Column(db.String, nullable=False)
    semester = db.Column(db.String, nullable=False)
    created_at = db.Column(db.String, nullable=False)
    updated_at = db.Column(db.String, nullable=True)
    files = db.Column(db.ARRAY(db.String))
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=True)  # Agent
    user = db.relationship('User', backref='applications', foreign_keys=[user_id])
    responsible_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=True)  # Admin or User responsible
    responsible = db.relationship('User', foreign_keys=[responsible_id])
    annual_payment = db.Column(db.Float, nullable=True)
    education_vat = db.Column(db.Float, nullable=True)
    gross_commission = db.Column(db.Float, nullable=True)
    abroad_vat = db.Column(db.Float, nullable=True)
    net_commission = db.Column(db.Float, nullable=True)
    bonus_max = db.Column(db.Float, nullable=True)
    bonus_min = db.Column(db.Float, nullable=True)
    agency_commission = db.Column(db.Float, nullable=True)
    agency_bonus = db.Column(db.Float, nullable=True)
    agency_contract_amount = db.Column(db.Float, nullable=True)
    agency_paid_contract_amount = db.Column(db.Float, nullable=True)
    agency_paid_contract_description = db.Column(db.String, nullable=True)
    agency_paid_contract_description_date = db.Column(db.String, nullable=True)
    agency_paid_contract_payment_method = db.Column(db.String, nullable=True)
    currency = db.Column(db.String, nullable=True, default='USD')
    remaining_min = db.Column(db.Float, nullable=True)
    remaining_max = db.Column(db.Float, nullable=True)



class ApplicationMessage(db.Model):
    __tablename__ = 'application_messages'
    id = db.Column(db.String, primary_key=True)
    application_id = db.Column(db.String, db.ForeignKey('applications.id'), nullable=False)
    sender = db.Column(db.String, nullable=False)  # 'ADMIN', 'USER', 'AGENT'
    sender_user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=True)  # who sent (for display name)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.String, nullable=False)

class Period(db.Model):
    __tablename__ = 'periods'
    id = db.Column(db.String, primary_key=True)
    name = db.Column(db.String, nullable=False)
    start_date = db.Column(db.String, nullable=False)
    end_date = db.Column(db.String, nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)


class NewsItem(db.Model):
    __tablename__ = 'news'
    id = db.Column(db.String, primary_key=True)
    title = db.Column(db.String, nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.String, nullable=False)
    created_by = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)


class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.String, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String, nullable=False)
    message = db.Column(db.String, nullable=False)
    link = db.Column(db.String, nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.String, nullable=False)
    type = db.Column(db.String, nullable=False)  # 'MESSAGE', 'STATUS', 'NEWS'


class IncomingPayment(db.Model):
    __tablename__ = 'incoming_payments'
    id = db.Column(db.String, primary_key=True)
    sequence_number = db.Column(db.Integer, nullable=False, unique=True)
    payment_date = db.Column(db.String, nullable=False)
    payment_source = db.Column(db.String, nullable=False)
    currency = db.Column(db.String, nullable=False, default='USD')
    description_1 = db.Column(db.String, nullable=True)
    description_2 = db.Column(db.String, nullable=True)
    created_at = db.Column(db.String, nullable=False)
    updated_at = db.Column(db.String, nullable=True)


class OutgoingPayment(db.Model):
    __tablename__ = 'outgoing_payments'
    id = db.Column(db.String, primary_key=True)
    sequence_number = db.Column(db.Integer, nullable=False, unique=True)
    payment_date = db.Column(db.String, nullable=False)
    payment_amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String, nullable=False, default='USD')
    payment_type = db.Column(db.String, nullable=False)  # Cash / Bank
    payment_reason = db.Column(db.String, nullable=False)
    description_1 = db.Column(db.String, nullable=True)
    created_at = db.Column(db.String, nullable=False)
    updated_at = db.Column(db.String, nullable=True)
