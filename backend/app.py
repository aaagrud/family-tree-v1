import os
from flask import Flask
from flask_login import LoginManager
from flask_cors import CORS
from dotenv import load_dotenv
from models import db, AdminUser

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ['SECRET_KEY']
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///family.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGIN', 'http://localhost:5173').split(',')]
CORS(app, origins=cors_origins, supports_credentials=True)

db.init_app(app)

login_manager = LoginManager(app)

@login_manager.user_loader
def load_user(user_id):
    return AdminUser.query.get(int(user_id))

@login_manager.unauthorized_handler
def unauthorized():
    from flask import jsonify
    return jsonify({'error': 'Not authenticated'}), 401

from routes.public import public_bp
from routes.admin import admin_bp

app.register_blueprint(public_bp)
app.register_blueprint(admin_bp)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
