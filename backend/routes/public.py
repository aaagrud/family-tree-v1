from flask import Blueprint, jsonify, request
from models import db, Person, Relationship

public_bp = Blueprint('public', __name__)


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
    }


@public_bp.route('/api/tree')
def get_tree():
    people = Person.query.all()
    person_lookup = {p.id: p for p in people}

    # parent_ids_map: child_id -> [parent_id, ...]  (all registered parents)
    parent_ids_map = {}
    for rel in Relationship.query.filter_by(type='parent_child').all():
        parent_ids_map.setdefault(rel.person_b_id, []).append(rel.person_a_id)

    # spouse_map: person_id -> deduplicated full person dicts
    spouse_map = {}
    for rel in Relationship.query.filter_by(type='spouse').all():
        for pid, other_id in ((rel.person_a_id, rel.person_b_id), (rel.person_b_id, rel.person_a_id)):
            other = person_lookup.get(other_id)
            if not other:
                continue
            spouse_map.setdefault(pid, {})[other.id] = person_to_dict(other)
    spouse_map = {pid: list(d.values()) for pid, d in spouse_map.items()}

    result = []
    for p in people:
        d = person_to_dict(p)
        ids = parent_ids_map.get(p.id, [])
        d['parent_id']  = ids[0] if ids else None
        d['parent_ids'] = ids
        d['spouses']    = spouse_map.get(p.id, [])
        result.append(d)
    return jsonify(result)


@public_bp.route('/api/people')
def list_people():
    q = Person.query

    search = request.args.get('search')
    if search:
        q = q.filter(Person.name.ilike(f'%{search}%'))

    born_after = request.args.get('born_after')
    if born_after:
        q = q.filter(Person.birth_date >= born_after)

    born_before = request.args.get('born_before')
    if born_before:
        q = q.filter(Person.birth_date <= born_before)

    died_after = request.args.get('died_after')
    if died_after:
        q = q.filter(Person.death_date >= died_after)

    died_before = request.args.get('died_before')
    if died_before:
        q = q.filter(Person.death_date <= died_before)

    added_after = request.args.get('added_after')
    if added_after:
        from datetime import datetime
        q = q.filter(Person.created_at >= datetime.fromisoformat(added_after))

    alive = request.args.get('alive')
    if alive is not None:
        q = q.filter(Person.is_alive == (alive.lower() == 'true'))

    return jsonify([person_to_dict(p) for p in q.order_by(Person.name).all()])


@public_bp.route('/api/people/<int:person_id>')
def get_person(person_id):
    p = Person.query.get_or_404(person_id)
    data = person_to_dict(p)

    rels = Relationship.query.filter(
        (Relationship.person_a_id == person_id) | (Relationship.person_b_id == person_id)
    ).all()

    parents, children, spouses = [], [], []
    seen_spouses = set()
    for r in rels:
        if r.type == 'parent_child':
            if r.person_a_id == person_id:
                child = Person.query.get(r.person_b_id)
                if child:
                    children.append({'id': child.id, 'name': child.name, 'relationship_id': r.id})
            else:
                parent = Person.query.get(r.person_a_id)
                if parent:
                    parents.append({'id': parent.id, 'name': parent.name, 'relationship_id': r.id})
        elif r.type == 'spouse':
            other_id = r.person_b_id if r.person_a_id == person_id else r.person_a_id
            if other_id in seen_spouses:
                continue
            seen_spouses.add(other_id)
            other = Person.query.get(other_id)
            if other:
                spouses.append({'id': other.id, 'name': other.name, 'relationship_id': r.id})

    data['parents'] = parents
    data['children'] = children
    data['spouses'] = spouses
    return jsonify(data)
