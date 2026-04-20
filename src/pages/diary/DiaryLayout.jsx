import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getMyProfile } from '../../lib/profile'
import {
  ITrendingUp, IPencil, IClock, ICheck, ITarget, ISparkles, IBook, IArrowLeft, ILogOut,
} from '../../components/icons'

const NAV = [
  { to: '/diary/evolucao',      label: 'evolução',         icon: ITrendingUp },
  { to: '/diary/diario',        label: 'diário do dia',    icon: IPencil },
  { to: '/diary/historico',     label: 'histórico',        icon: IClock },
  { to: '/diary/finalizar-dia', label: 'finalizar dia',    icon: ICheck },
  { to: '/diary/operacional',   label: 'raio-x setups',    icon: ITarget },
  { to: '/diary/plano',         label: 'plano',            icon: IBook },
  { to: '/diary/jornada',       label: 'jornada',          icon: ISparkles },
]

export default function DiaryLayout() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    if (!user) return
    getMyProfile().catch(() => null).then(setProfile)
  }, [user])

  async function onLogout() {
    await signOut(); nav('/login', { replace: true })
  }

  const emailPrefix = user?.email?.split('@')[0] || 'mentorado'
  const name = profile?.name?.split(' ')[0]?.toLowerCase() || emailPrefix

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0e', color: '#fff' }}>
      <aside style={{
        width: 220, minWidth: 220,
        background: '#0a0a0e',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '18px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link to="/app/inicio" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em',
            textDecoration: 'none', padding: '4px 2px',
          }}>
            <IArrowLeft size={11} stroke={1.6} />
            VOLTAR PRA MATILHA
          </Link>
          <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{
              fontSize: 10, letterSpacing: '0.22em', fontWeight: 600,
              color: 'rgba(34,197,94,0.7)', fontFamily: 'JetBrains Mono, monospace',
              marginBottom: 2,
            }}>DIÁRIO · V1</div>
            <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' }}>
              trade workspace
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', padding: '4px 10px', gap: 2, flex: 1, overflowY: 'auto' }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13, fontWeight: 450,
                color: isActive ? '#22c55e' : 'rgba(255,255,255,0.6)',
                background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                textDecoration: 'none',
                borderLeft: isActive ? '2px solid #22c55e' : '2px solid transparent',
                transition: 'all 150ms',
              })}
            >
              <item.icon size={15} stroke={1.6} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: 10, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #22c55e, #00d9ff)',
            color: '#0a0a0e', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{!profile?.avatar_url && (name[0] || 'm').toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{name}</div>
          <button onClick={onLogout} title="sair" style={{ color: 'rgba(255,255,255,0.4)', padding: 4 }}>
            <ILogOut size={13} stroke={1.5} />
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  )
}
