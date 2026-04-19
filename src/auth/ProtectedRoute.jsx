import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--body)', color: 'var(--text-muted)', fontSize: 12,
      }}>
        carregando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return children
}
