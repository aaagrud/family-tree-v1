from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Person(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String, nullable=False)
    birth_date = db.Column(db.String, nullable=True)
    death_date = db.Column(db.String, nullable=True)
    is_alive   = db.Column(db.Boolean, default=True)
    gender     = db.Column(db.String, nullable=True)
    notes      = db.Column(db.Text, nullable=True)
    photo_url  = db.Column(db.String, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Relationship(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    person_a_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=False)
    person_b_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=False)
    type        = db.Column(db.String, nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('person_a_id', 'person_b_id', 'type'),
    )


class AdminUser(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String, unique=True, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def get_id(self):
        return str(self.id)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False
