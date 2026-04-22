import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getMyProfile } from '../lib/profile'

// Allow users with role monitor / admin / imortal / suporte (CS)
const ALLOWED_ROLES = ['monitor', 'admin', 'imortal', 'suporte']

export default function MonitorGuard({ children }) {
  const [state, setState] = useState('checking') // 'checking' | 'allowed' | 'denied'

  useEffect(() => {
    getMyProfile()
      .then(p => {
        const roles = p?.roles || []
        const ok = roles.some(r => ALLOWED_ROLES.includes(r))
        setState(ok ? 'allowed' : 'denied')
      })
      .catch(() => setState('denied'))
  }, [])

  if (state === 'checking') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--body)', color: 'var(--text-muted)', fontSize: 12,
      }}>
        verificando permissões...
      </div>
    )
  }

  if (state === 'denied') return <Navigate to="/app/inicio" replace />

  return children
}
