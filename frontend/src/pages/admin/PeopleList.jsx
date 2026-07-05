import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'

export default function PeopleList() {
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deathForm, setDeathForm] = useState(null)
  const [deathDate, setDeathDate] = useState('')

  async function load(q = '') {
    setLoading(true)
    const r = await api.get(`/api/people${q ? `?search=${encodeURIComponent(q)}` : ''}`)
    setPeople(r.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search])

  async function handleDelete(id, name) {
    if (!confirm(`Delete ${name}? This also removes their relationships.`)) return
    await api.delete(`/api/admin/people/${id}`)
    setPeople(p => p.filter(x => x.id !== id))
  }

  async function handleRecordDeath(id) {
    await api.post(`/api/admin/people/${id}/death`, { death_date: deathDate || null })
    setDeathForm(null)
    setDeathDate('')
    load(search)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">People</h1>
          <Link to="/admin/people/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
            + Add person
          </Link>
        </div>

        <input
          className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : people.length === 0 ? (
          <p className="text-gray-400">No people found.</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Born</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Added</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {people.map(p => (
                  <>
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.birth_date || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_alive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.is_alive ? 'Living' : 'Deceased'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{p.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <Link to={`/admin/people/${p.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                        {p.is_alive && (
                          <button
                            className="text-yellow-600 hover:underline"
                            onClick={() => { setDeathForm(p.id); setDeathDate('') }}
                          >
                            Record death
                          </button>
                        )}
                        <button className="text-red-500 hover:underline" onClick={() => handleDelete(p.id, p.name)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                    {deathForm === p.id && (
                      <tr key={`death-${p.id}`} className="bg-yellow-50">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">Death date for {p.name}:</span>
                            <input
                              className="border rounded px-2 py-1 text-sm"
                              placeholder="YYYY or YYYY-MM or YYYY-MM-DD"
                              value={deathDate}
                              onChange={e => setDeathDate(e.target.value)}
                            />
                            <button
                              className="bg-yellow-600 text-white text-sm px-3 py-1 rounded hover:bg-yellow-700"
                              onClick={() => handleRecordDeath(p.id)}
                            >
                              Save
                            </button>
                            <button className="text-sm text-gray-500 hover:underline" onClick={() => setDeathForm(null)}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <Link to="/admin" className="text-sm text-gray-500 hover:underline">← Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
