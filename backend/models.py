
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
    degree = db.Column(db.String, nullable=False)
    language = db.Column(db.String, nullable=False)
    years = db.Column(db.Integer, nullable=False)
    deadline = db.Column(db.String, nullable=False)
    fee = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String, nullable=False, default='USD')
    description = db.Column(db.Text)

class Application(db.Model):
    __tablename__ = 'applications'
    id = db.Column(db.String, primary_key=True)
    student_id = db.Column(db.String, db.ForeignKey('students.id'), nullable=False)
    program_id = db.Column(db.String, db.ForeignKey('programs.id'), nullable=False)
    status = db.Column(db.String, nullable=False)
    semester = db.Column(db.String, nullable=False)
    created_at = db.Column(db.String, nullable=False)
    files = db.Column(db.ARRAY(db.String))
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=True)  # Added to link application to agent
    user = db.relationship('User', backref='applications')



class ApplicationMessage(db.Model):
    __tablename__ = 'application_messages'
    id = db.Column(db.String, primary_key=True)
    application_id = db.Column(db.String, db.ForeignKey('applications.id'), nullable=False)
    sender = db.Column(db.String, nullable=False)  # 'ADMIN' or 'USER'
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.String, nullable=False)

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.String, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String, nullable=False)
    message = db.Column(db.String, nullable=False)
    link = db.Column(db.String, nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.String, nullable=False)
    type = db.Column(db.String, nullable=False) # 'MESSAGE', 'STATUS'
