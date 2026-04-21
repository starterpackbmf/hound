import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getMyProfile } from '../../lib/profile'
import {
  ITrendingUp, IPencil, IClock, ICheck, ITarget, ISparkles, IBook, IArrowLeft, ILogOut, IZap,
} from '../../components/icons'

const NAV = [
  { to: '/diary/evolucao',      label: 'evolução',         icon: ITrendingUp },
  { to: '/diary/diario',        label: 'diário do dia',    icon: IPencil },
  { to: '/diary/historico',     label: 'histórico',        icon: IClock },
  { to: '/diary/operacional',   label: 'raio-x setups',    icon: ITarget },
  { to: '/diary/wolf',          label: 'w.o.l.f ai',       icon: IZap },
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
    <div data-diary style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <div className="ink-ambient" />
      <aside style={{
        width: 220, minWidth: 220,
        background: 'var(--ink-bg)',
        borderRight: '1px solid var(--ink-line)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        zIndex: 1,
      }}>
        <div style={{ padding: '18px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link to="/app/inicio" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '0.14em',
            textDecoration: 'none', padding: '4px 2px', textTransform: 'uppercase',
          }}>
            <IArrowLeft size={11} stroke={1.6} />
            Voltar pra Matilha
          </Link>
          <div style={{ paddingTop: 10, borderTop: '1px solid var(--ink-line)' }}>
            <div style={{
              fontSize: 10, letterSpacing: '0.22em', fontWeight: 600,
              color: 'var(--ink-green)', fontFamily: 'JetBrains Mono, monospace',
              marginBottom: 4,
            }}>DIÁRIO · V1</div>
            <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink-text)' }}>
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
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13, fontWeight: isActive ? 500 : 450,
                color: isActive ? 'var(--ink-text)' : 'var(--ink-muted)',
                background: isActive ? 'var(--ink-green-soft)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 150ms',
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, background: 'var(--ink-green)', borderRadius: 2 }} />}
                  <item.icon size={14} stroke={1.5} style={{ color: isActive ? 'var(--ink-green)' : 'var(--ink-muted)' }} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: 10, borderTop: '1px solid var(--ink-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #18D18A, #6FE6F0)',
            color: '#07080A', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{!profile?.avatar_url && (name[0] || 'm').toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--ink-muted)' }}>{name}</div>
          <button onClick={onLogout} title="sair" style={{ color: 'var(--ink-dim)', padding: 4 }}>
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
