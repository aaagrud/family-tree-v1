import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/admin/stats').then(r => setStats(r.data))
  }, [])

  async function handleLogout() {
    await api.post('/api/auth/logout')
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">
            Log out
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Total people" value={stats.total_people} />
            <StatCard label="Living" value={stats.alive} />
            <StatCard label="Deceased" value={stats.deceased} />
          </div>
        )}

        <div className="flex gap-4 mb-8">
          <Link to="/admin/people/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
            + Add person
          </Link>
          <Link to="/admin/people" className="bg-white border hover:bg-gray-50 px-4 py-2 rounded-lg font-medium">
            All people
          </Link>
          <Link to="/admin/relationships" className="bg-white border hover:bg-gray-50 px-4 py-2 rounded-lg font-medium">
            Relationships
          </Link>
        </div>

        {stats?.recently_added?.length > 0 && (
          <div>
            <h2 className="font-semibold text-lg mb-2">Recently added</h2>
            <ul className="bg-white rounded-xl shadow divide-y">
              {stats.recently_added.map(p => (
                <li key={p.id} className="px-4 py-3 flex justify-between">
                  <Link to={`/admin/people/${p.id}/edit`} className="text-blue-700 hover:underline">{p.name}</Link>
                  <span className="text-sm text-gray-400">{p.created_at.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 text-center">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}
