import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getMyProfile } from '../../lib/profile'
import {
  IBook, IPlay, IEye, ISparkles,
  IArrowLeft, ILogOut, IChevronRight,
} from '../../components/icons'

const NAV = [
  { to: '/cursos/aulas',      label: 'Ao vivo',        icon: IPlay,  liveDot: true },
  { to: '/cursos/estudo',     label: 'Cursos',         icon: IBook },
  { to: '/cursos/imersoes',   label: 'Imersões',       icon: IEye },
  { to: '/cursos/gratis',     label: 'Cursos grátis',  icon: ISparkles },
]

export default function CursosLayout() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('cursos-sidebar-collapsed') === '1'
  })
  const nav = useNavigate()

  function toggleCollapsed() {
    setCollapsed(v => {
      const next = !v
      try { window.localStorage.setItem('cursos-sidebar-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  useEffect(() => {
    if (!user) return
    getMyProfile().catch(() => null).then(setProfile)
  }, [user])

  async function onLogout() {
    await signOut(); nav('/login', { replace: true })
  }

  const emailPrefix = user?.email?.split('@')[0] || 'aluno'
  const displayName = profile?.name?.split(' ')[0] || emailPrefix

  return (
    <div
      data-cursos
      style={{ display: 'flex', minHeight: '100vh', position: 'relative', padding: '14px 0 14px 14px' }}
    >
      <div className="mt-ambient" />

      <aside style={{
        width: collapsed ? 68 : 236,
        minWidth: collapsed ? 68 : 236,
        transition: 'width .35s cubic-bezier(0.22, 1, 0.36, 1), min-width .35s cubic-bezier(0.22, 1, 0.36, 1)',
        background: `
          linear-gradient(180deg, rgba(22,26,32,0.55) 0%, rgba(16,19,26,0.5) 50%, rgba(12,14,19,0.55) 100%) padding-box,
          linear-gradient(180deg, rgba(255,255,255,0.1), rgba(168,85,247,0.06) 30%, rgba(236,72,153,0.04) 70%, rgba(255,255,255,0.06)) border-box
        `,
        border: '1px solid transparent',
        borderRadius: 22,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 14, height: 'calc(100vh - 28px)',
        zIndex: 1,
        padding: 10,
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.06),
          0 1px 2px rgba(0,0,0,0.4),
          0 12px 24px rgba(0,0,0,0.5),
          0 24px 48px rgba(0,0,0,0.6)
        `,
        overflow: 'hidden',
      }}>
        {/* BRAND HEADER + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Link to="/app/inicio" style={{
            flex: 1, minWidth: 0,
            display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
            padding: collapsed ? 8 : '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            textDecoration: 'none',
            color: 'var(--text-primary)',
            transition: 'all .25s ease',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
            title={collapsed ? 'Cursos — Matilha' : undefined}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'linear-gradient(135deg, var(--purple), var(--pink))',
              color: '#07080A', fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>C</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  Matilha
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 1 }}>
                  CURSOS & AULAS
                </div>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              title="Recolher sidebar"
              style={{
                appearance: 'none', cursor: 'pointer',
                width: 30, height: 30, flexShrink: 0,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IChevronRight size={12} stroke={1.8} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={toggleCollapsed}
            title="Expandir sidebar"
            style={{
              appearance: 'none', cursor: 'pointer',
              width: '100%', height: 28,
              marginBottom: 8,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IChevronRight size={12} stroke={1.8} />
          </button>
        )}

        {/* NAV */}
        <nav className="mt-scrollbar-hidden" style={{
          display: 'flex', flexDirection: 'column', gap: 1, flex: 1,
          overflowY: 'auto', overflowX: 'hidden', paddingBottom: 10,
        }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '8px' : '8px 12px',
                borderRadius: 7,
                fontSize: 13, fontWeight: isActive ? 500 : 450,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(168,85,247,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(168,85,247,0.22)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 120ms ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={14} stroke={1.6} style={{
                    color: isActive ? 'var(--purple)' : 'var(--text-muted)', flexShrink: 0,
                  }} />
                  {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  {!collapsed && item.liveDot && <span className="dot dot-live" style={{ width: 5, height: 5 }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* FOOTER USER */}
        <div style={{
          padding: '12px 12px 6px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: collapsed ? 'none' : 'flex',
          alignItems: 'center', gap: 10,
          marginTop: 4,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: profile?.avatar_url
              ? `url(${profile.avatar_url}) center/cover`
              : 'linear-gradient(135deg, var(--purple), var(--pink))',
            color: '#07080A', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{!profile?.avatar_url && (displayName[0] || 'm').toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{displayName}</div>
          </div>
          <Link to="/app/inicio" title="voltar pra Matilha" style={{ color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
            <IArrowLeft size={13} stroke={1.6} />
          </Link>
          <button onClick={onLogout} title="sair" style={{ color: 'var(--text-muted)', padding: 4 }}>
            <ILogOut size={13} stroke={1.5} />
          </button>
        </div>
      </aside>

      <main style={{
        flex: 1, minWidth: 0, overflowX: 'hidden',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        padding: '18px 40px 64px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ width: '100%', maxWidth: 1280 }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
