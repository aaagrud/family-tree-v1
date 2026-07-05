import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import PeopleList from './pages/admin/PeopleList'
import PersonForm from './pages/admin/PersonForm'
import LinkManager from './pages/admin/LinkManager'
import Tree from './pages/Tree'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public placeholder — Phase 3+ will fill these in */}
        <Route path="/" element={<div className="p-8 text-xl">Family Tree — <a className="text-blue-600 underline" href="/tree">View tree</a></div>} />
        <Route path="/tree" element={<Tree />} />

        {/* Admin */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/people" element={<ProtectedRoute><PeopleList /></ProtectedRoute>} />
        <Route path="/admin/people/new" element={<ProtectedRoute><PersonForm /></ProtectedRoute>} />
        <Route path="/admin/people/:id/edit" element={<ProtectedRoute><PersonForm /></ProtectedRoute>} />
        <Route path="/admin/relationships" element={<ProtectedRoute><LinkManager /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
