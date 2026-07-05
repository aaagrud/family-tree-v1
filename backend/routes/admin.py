from flask import Blueprint, jsonify, request, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from models import db, Person, Relationship, AdminUser
from datetime import datetime

admin_bp = Blueprint('admin', __name__)


# ── Auth ────────────────────────────────────────────────────────────────────

@admin_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = AdminUser.query.filter_by(username=data.get('username')).first()
    if not user or not check_password_hash(user.password_hash, data.get('password', '')):
        return jsonify({'error': 'Invalid credentials'}), 401
    login_user(user, remember=False)
    session.permanent = False
    return jsonify({'username': user.username})


@admin_bp.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'ok': True})


@admin_bp.route('/api/auth/me')
@login_required
def me():
    return jsonify({'username': current_user.username})


# ── People ───────────────────────────────────────────────────────────────────

def person_to_dict(p):
    return {
        'id':         p.id,
        'name':       p.name,
        'birth_date': p.birth_date,
        'death_date': p.death_date,
        'is_alive':   p.is_alive,
        'gender':     p.gender,
        'notes':      p.notes,
        'photo_url':  p.photo_url,
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'updated_at': p.updated_at.isoformat() if p.updated_at else None,
    }


def _spouse_exists(id_a, id_b):
    return Relationship.query.filter(
        (Relationship.type == 'spouse') & (
            ((Relationship.person_a_id == id_a) & (Relationship.person_b_id == id_b)) |
            ((Relationship.person_a_id == id_b) & (Relationship.person_b_id == id_a))
        )
    ).first()


@admin_bp.route('/api/admin/people', methods=['POST'])
@login_required
def create_person():
    data = request.get_json()
    person = Person(
        name=data['name'],
        birth_date=data.get('birth_date') or None,
        death_date=data.get('death_date') or None,
        is_alive=data.get('is_alive', True),
        gender=data.get('gender') or None,
        notes=data.get('notes') or None,
        photo_url=data.get('photo_url') or None,
    )
    db.session.add(person)
    db.session.flush()

    parent_id = data.get('parent_id')
    if parent_id:
        db.session.add(Relationship(person_a_id=int(parent_id), person_b_id=person.id, type='parent_child'))

    for spouse_id in data.get('spouse_ids', []):
        if not _spouse_exists(person.id, int(spouse_id)):
            db.session.add(Relationship(person_a_id=person.id, person_b_id=int(spouse_id), type='spouse'))

    db.session.commit()
    return jsonify(person_to_dict(person)), 201


@admin_bp.route('/api/admin/people/<int:person_id>', methods=['PUT'])
@login_required
def update_person(person_id):
    person = Person.query.get_or_404(person_id)
    data = request.get_json()

    for field in ('name', 'birth_date', 'death_date', 'is_alive', 'gender', 'notes', 'photo_url'):
        if field in data:
            setattr(person, field, data[field] or None if field not in ('name', 'is_alive') else data[field])
    person.updated_at = datetime.utcnow()

    # Sync parent: replace whatever is there with the new value
    if 'parent_id' in data:
        Relationship.query.filter_by(person_b_id=person_id, type='parent_child').delete()
        if data['parent_id']:
            db.session.add(Relationship(
                person_a_id=int(data['parent_id']), person_b_id=person_id, type='parent_child'
            ))

    # Sync spouses: remove rels no longer in the list, add new ones
    if 'spouse_ids' in data:
        new_ids = {int(s) for s in data['spouse_ids'] if s}
        existing_rels = Relationship.query.filter(
            (Relationship.type == 'spouse') & (
                (Relationship.person_a_id == person_id) | (Relationship.person_b_id == person_id)
            )
        ).all()
        for rel in existing_rels:
            other = rel.person_b_id if rel.person_a_id == person_id else rel.person_a_id
            if other not in new_ids:
                db.session.delete(rel)
        db.session.flush()
        for spouse_id in new_ids:
            if not _spouse_exists(person_id, spouse_id):
                db.session.add(Relationship(person_a_id=person_id, person_b_id=spouse_id, type='spouse'))

    db.session.commit()
    return jsonify(person_to_dict(person))


@admin_bp.route('/api/admin/people/<int:person_id>', methods=['DELETE'])
@login_required
def delete_person(person_id):
    person = Person.query.get_or_404(person_id)
    Relationship.query.filter(
        (Relationship.person_a_id == person_id) | (Relationship.person_b_id == person_id)
    ).delete()
    db.session.delete(person)
    db.session.commit()
    return jsonify({'ok': True})


@admin_bp.route('/api/admin/people/<int:person_id>/death', methods=['POST'])
@login_required
def record_death(person_id):
    person = Person.query.get_or_404(person_id)
    data = request.get_json()
    person.death_date = data.get('death_date')
    person.is_alive = False
    person.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(person_to_dict(person))


# ── Relationships ─────────────────────────────────────────────────────────────

@admin_bp.route('/api/admin/relationships', methods=['POST'])
@login_required
def create_relationship():
    data = request.get_json()
    a, b, rtype = int(data['person_a_id']), int(data['person_b_id']), data['type']
    if rtype == 'spouse':
        existing = _spouse_exists(a, b)
        if existing:
            return jsonify({'id': existing.id, 'person_a_id': existing.person_a_id,
                            'person_b_id': existing.person_b_id, 'type': existing.type}), 200
    rel = Relationship(person_a_id=a, person_b_id=b, type=rtype)
    db.session.add(rel)
    db.session.commit()
    return jsonify({'id': rel.id, 'person_a_id': rel.person_a_id, 'person_b_id': rel.person_b_id, 'type': rel.type}), 201


@admin_bp.route('/api/admin/relationships/<int:rel_id>', methods=['DELETE'])
@login_required
def delete_relationship(rel_id):
    rel = Relationship.query.get_or_404(rel_id)
    db.session.delete(rel)
    db.session.commit()
    return jsonify({'ok': True})


# ── Admin list (for dashboard stats) ─────────────────────────────────────────

@admin_bp.route('/api/admin/stats')
@login_required
def stats():
    total = Person.query.count()
    alive = Person.query.filter_by(is_alive=True).count()
    recent = Person.query.order_by(Person.created_at.desc()).limit(5).all()
    return jsonify({
        'total_people': total,
        'alive': alive,
        'deceased': total - alive,
        'recently_added': [{'id': p.id, 'name': p.name, 'created_at': p.created_at.isoformat()} for p in recent],
    })
