import { useEffect, useState } from 'react'
import api from '../api'

export default function PersonPanel({ personId, onClose, onNavigate }) {
  const [person, setPerson] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setPerson(null)
    api.get(`/api/people/${personId}`)
      .then(r => setPerson(r.data))
      .finally(() => setLoading(false))
  }, [personId])

  return (
    <div className="w-80 bg-white border-l shadow-xl flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <span className="font-semibold text-gray-700">Profile</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
      )}

      {!loading && person && (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {person.photo_url && (
            <img src={person.photo_url} alt={person.name} className="w-full h-48 object-cover rounded-lg" />
          )}

          <div>
            <h2 className="text-xl font-bold">{person.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${person.is_alive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {person.is_alive ? 'Living' : 'Deceased'}
            </span>
          </div>

          <div className="text-sm space-y-1 text-gray-600">
            {person.birth_date && <div><span className="font-medium">Born:</span> {person.birth_date}</div>}
            {person.death_date && <div><span className="font-medium">Died:</span> {person.death_date}</div>}
            {person.gender    && <div><span className="font-medium">Gender:</span> {person.gender}</div>}
          </div>

          {person.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{person.notes}</p>
            </div>
          )}

          <RelGroup label="Parents"  people={person.parents}  onNavigate={onNavigate} />
          <RelGroup label="Spouse(s)" people={person.spouses}  onNavigate={onNavigate} />
          <RelGroup label="Children" people={person.children} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  )
}

function RelGroup({ label, people, onNavigate }) {
  if (!people?.length) return null
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <ul className="space-y-1">
        {people.map(p => (
          <li key={p.id}>
            <button
              onClick={() => onNavigate(p.id)}
              className="text-sm text-blue-600 hover:underline text-left"
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
