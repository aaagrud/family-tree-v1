import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../api'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    api.get('/api/auth/me')
      .then(() => setStatus('ok'))
      .catch(() => setStatus('unauth'))
  }, [])

  if (status === 'checking') return <div className="p-8 text-gray-500">Checking session…</div>
  if (status === 'unauth') return <Navigate to="/admin/login" replace />
  return children
}
