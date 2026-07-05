import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../../api'

const EMPTY = {
  name: '', birth_date: '', death_date: '', is_alive: true,
  gender: '', notes: '', photo_url: '', parent_id: '', spouse_ids: [],
}

export default function PersonForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState({ ...EMPTY, parent_id: searchParams.get('parent_id') || '' })
  const [parentSearch, setParentSearch] = useState('')
  const [parentResults, setParentResults] = useState([])
  const [parentName, setParentName] = useState('')
  const [spouseSearch, setSpouseSearch] = useState('')
  const [spouseResults, setSpouseResults] = useState([])
  const [spouseNames, setSpouseNames] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [savedId, setSavedId] = useState(null)
  const [savedName, setSavedName] = useState('')

  useEffect(() => {
    if (isEdit) {
      api.get(`/api/people/${id}`).then(r => {
        const p = r.data
        setForm({
          name: p.name, birth_date: p.birth_date || '', death_date: p.death_date || '',
          is_alive: p.is_alive, gender: p.gender || '', notes: p.notes || '',
          photo_url: p.photo_url || '',
          parent_id: p.parents[0]?.id || '',
          spouse_ids: p.spouses.map(s => s.id),
        })
        if (p.parents[0]) setParentName(p.parents[0].name)
        setSpouseNames(p.spouses.map(s => s.name))
      })
    }
  }, [id, isEdit])

  const searchPeople = useCallback(async (q, setter) => {
    if (!q.trim()) { setter([]); return }
    const r = await api.get(`/api/people?search=${encodeURIComponent(q)}`)
    setter(r.data)
  }, [])

  useEffect(() => { searchPeople(parentSearch, setParentResults) }, [parentSearch, searchPeople])
  useEffect(() => { searchPeople(spouseSearch, setSpouseResults) }, [spouseSearch, searchPeople])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...form,
      parent_id: form.parent_id || null,
      spouse_ids: form.spouse_ids,
    }
    try {
      let res
      if (isEdit) {
        res = await api.put(`/api/admin/people/${id}`, payload)
      } else {
        res = await api.post('/api/admin/people', payload)
      }
      setSavedId(res.data.id)
      setSavedName(res.data.name)
      setToast(isEdit ? 'Changes saved!' : `${res.data.name} added!`)
      setTimeout(() => setToast(''), 3000)
      if (!isEdit) {
        setForm({ ...EMPTY })
        setParentName('')
        setSpouseNames([])
      }
    } finally {
      setLoading(false)
    }
  }

  function addAnother() {
    navigate(`/admin/people/new?parent_id=${savedId}`)
    setToast('')
    setSavedId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit person' : 'Add person'}</h1>

        {toast && (
          <div className="mb-4 bg-green-100 border border-green-300 text-green-800 rounded-lg px-4 py-3 flex justify-between items-center">
            <span>{toast}</span>
            {!isEdit && savedId && (
              <button
                onClick={addAnother}
                className="ml-4 text-sm bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded"
              >
                Add another (sibling)
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          <Field label="Name *">
            <input required className={input} value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>

          <Field label="Birth date (YYYY, YYYY-MM, or YYYY-MM-DD)">
            <input className={input} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} placeholder="1943" />
          </Field>

          <Field label="Still alive">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_alive} onChange={e => set('is_alive', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">{form.is_alive ? 'Yes' : 'No'}</span>
            </label>
          </Field>

          {!form.is_alive && (
            <Field label="Death date">
              <input className={input} value={form.death_date} onChange={e => set('death_date', e.target.value)} placeholder="1999-06" />
            </Field>
          )}

          <Field label="Gender">
            <select className={input} value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">— select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Parent">
            <input
              className={input}
              placeholder="Type name to search…"
              value={parentName}
              onChange={e => { setParentName(e.target.value); setParentSearch(e.target.value) }}
            />
            {parentResults.length > 0 && (
              <ul className="border rounded mt-1 bg-white shadow text-sm max-h-40 overflow-y-auto">
                {parentResults.map(p => (
                  <li
                    key={p.id}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                    onClick={() => { set('parent_id', p.id); setParentName(p.name); setParentResults([]) }}
                  >
                    {p.name} {p.birth_date ? `(${p.birth_date.slice(0, 4)})` : ''}
                  </li>
                ))}
              </ul>
            )}
            {form.parent_id && (
              <button type="button" className="text-xs text-red-500 mt-1" onClick={() => { set('parent_id', ''); setParentName('') }}>
                Clear parent
              </button>
            )}
          </Field>

          <Field label="Spouse(s)">
            <input
              className={input}
              placeholder="Type name to search…"
              value={spouseSearch}
              onChange={e => setSpouseSearch(e.target.value)}
            />
            {spouseResults.length > 0 && (
              <ul className="border rounded mt-1 bg-white shadow text-sm max-h-40 overflow-y-auto">
                {spouseResults.map(p => (
                  <li
                    key={p.id}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                    onClick={() => {
                      if (!form.spouse_ids.includes(p.id)) {
                        set('spouse_ids', [...form.spouse_ids, p.id])
                        setSpouseNames(n => [...n, p.name])
                      }
                      setSpouseSearch('')
                      setSpouseResults([])
                    }}
                  >
                    {p.name} {p.birth_date ? `(${p.birth_date.slice(0, 4)})` : ''}
                  </li>
                ))}
              </ul>
            )}
            {spouseNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {spouseNames.map((n, i) => (
                  <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    {n}
                    <button type="button" onClick={() => {
                      set('spouse_ids', form.spouse_ids.filter((_, j) => j !== i))
                      setSpouseNames(names => names.filter((_, j) => j !== i))
                    }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="Notes">
            <textarea className={`${input} h-24 resize-none`} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="School, job, anything…" />
          </Field>

          <Field label="Photo URL">
            <input className={input} value={form.photo_url} onChange={e => set('photo_url', e.target.value)} placeholder="https://…" />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add person'}
            </button>
            <button type="button" onClick={() => navigate('/admin/people')} className="border px-5 py-2 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const input = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  )
}
