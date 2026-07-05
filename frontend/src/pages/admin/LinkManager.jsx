import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'

export default function LinkManager() {
  const [personASearch, setPersonASearch] = useState('')
  const [personBSearch, setPersonBSearch] = useState('')
  const [personAResults, setPersonAResults] = useState([])
  const [personBResults, setPersonBResults] = useState([])
  const [personA, setPersonA] = useState(null)
  const [personB, setPersonB] = useState(null)
  const [relType, setRelType] = useState('parent_child')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  async function search(q, setter) {
    if (!q.trim()) { setter([]); return }
    const r = await api.get(`/api/people?search=${encodeURIComponent(q)}`)
    setter(r.data)
  }

  useEffect(() => { search(personASearch, setPersonAResults) }, [personASearch])
  useEffect(() => { search(personBSearch, setPersonBResults) }, [personBSearch])

  async function handleCreate(e) {
    e.preventDefault()
    if (!personA || !personB) return
    setSaving(true)
    try {
      await api.post('/api/admin/relationships', {
        person_a_id: personA.id,
        person_b_id: personB.id,
        type: relType,
      })
      const label = relType === 'parent_child'
        ? `${personA.name} → parent of → ${personB.name}`
        : `${personA.name} ↔ spouse ↔ ${personB.name}`
      setToast(`Saved: ${label}`)
      setTimeout(() => setToast(''), 4000)
      setPersonA(null); setPersonB(null)
      setPersonASearch(''); setPersonBSearch('')
    } catch (err) {
      setToast('Error — this relationship may already exist.')
      setTimeout(() => setToast(''), 4000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Relationship manager</h1>

        {toast && (
          <div className="mb-4 bg-green-100 border border-green-300 text-green-800 rounded-lg px-4 py-3 text-sm">
            {toast}
          </div>
        )}

        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-6 space-y-4">
          <PersonPicker
            label="Person A"
            searchValue={personASearch}
            onSearch={setPersonASearch}
            results={personAResults}
            selected={personA}
            onSelect={p => { setPersonA(p); setPersonASearch(p.name); setPersonAResults([]) }}
            onClear={() => { setPersonA(null); setPersonASearch('') }}
          />

          <div>
            <label className="block text-sm font-medium mb-1">Relationship type</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={relType}
              onChange={e => setRelType(e.target.value)}
            >
              <option value="parent_child">Parent → Child (A is parent of B)</option>
              <option value="spouse">Spouse (A ↔ B)</option>
            </select>
          </div>

          <PersonPicker
            label="Person B"
            searchValue={personBSearch}
            onSearch={setPersonBSearch}
            results={personBResults}
            selected={personB}
            onSelect={p => { setPersonB(p); setPersonBSearch(p.name); setPersonBResults([]) }}
            onClear={() => { setPersonB(null); setPersonBSearch('') }}
          />

          <button
            type="submit"
            disabled={!personA || !personB || saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Create relationship'}
          </button>
        </form>

        <div className="mt-4">
          <Link to="/admin" className="text-sm text-gray-500 hover:underline">← Dashboard</Link>
        </div>
      </div>
    </div>
  )
}

function PersonPicker({ label, searchValue, onSearch, results, selected, onSelect, onClear }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Type name to search…"
        value={searchValue}
        onChange={e => onSearch(e.target.value)}
      />
      {results.length > 0 && !selected && (
        <ul className="border rounded mt-1 bg-white shadow text-sm max-h-40 overflow-y-auto">
          {results.map(p => (
            <li key={p.id} className="px-3 py-2 hover:bg-blue-50 cursor-pointer" onClick={() => onSelect(p)}>
              {p.name} {p.birth_date ? `(${p.birth_date.slice(0, 4)})` : ''}
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{selected.name}</span>
          <button type="button" className="text-xs text-red-500" onClick={onClear}>clear</button>
        </div>
      )}
    </div>
  )
}
