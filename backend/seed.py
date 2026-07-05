import os
from app import app, db
from models import AdminUser
from werkzeug.security import generate_password_hash

with app.app_context():
    db.create_all()
    username = os.environ.get('ADMIN_USERNAME', 'admin')
    password = os.environ.get('ADMIN_PASSWORD', 'changeme')
    if not AdminUser.query.filter_by(username=username).first():
        user = AdminUser(username=username, password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        print(f"Admin '{username}' created.")
    else:
        print("Admin already exists.")
