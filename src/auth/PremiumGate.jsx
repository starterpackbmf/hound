import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getMyProfile } from '../lib/profile'
import { isPremium } from '../lib/gate'

export default function PremiumGate({ children }) {
  const [state, setState] = useState('checking') // 'checking' | 'allowed' | 'denied'
  const loc = useLocation()

  useEffect(() => {
    getMyProfile()
      .then(p => setState(isPremium(p) ? 'allowed' : 'denied'))
      .catch(() => setState('denied'))
  }, [])

  if (state === 'checking') {
    return (
      <div style={{
        minHeight: '50vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 12,
      }}>
        carregando...
      </div>
    )
  }

  if (state === 'denied') {
    return <Navigate to={`/app/upgrade?from=${encodeURIComponent(loc.pathname)}`} replace />
  }

  return children
}
