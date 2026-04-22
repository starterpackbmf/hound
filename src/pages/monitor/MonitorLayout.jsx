import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useIsMobile } from '../../lib/useMedia'
import { getMyProfile } from '../../lib/profile'
import {
  ITarget, IUsers, ICalendar, IFile, IBook, IPlay,
  ILogOut, IArrowLeft, IMenu, IX, ISettings, IMessage,
} from '../../components/icons'

const NAV = [
  { to: '/mentor/visao-geral',     label: 'visão geral',     icon: ITarget },
  { to: '/mentor/alunos',          label: 'alunos',          icon: IUsers },
  { to: '/mentor/agenda',          label: 'minha agenda',    icon: ICalendar },
  { to: '/mentor/aulas/nova',      label: 'agendar aula',    icon: IPlay },
  { to: '/mentor/relatorio',       label: 'relatório',       icon: IFile },
  { to: '/mentor/conteudos',       label: 'conteúdos',       icon: IBook },
]

// Itens visíveis só pra admin/suporte
const STAFF_NAV = [
  { to: '/mentor/feedbacks',       label: 'feedbacks (CS)',    icon: IMessage,  roles: ['admin', 'suporte'] },
  { to: '/mentor/config-zoom',     label: 'config do ao vivo', icon: ISettings, roles: ['admin', 'suporte'] },
]

export default function MonitorLayout() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const isMobile = useIsMobile(900)
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => {
    getMyProfile().catch(() => null).then(setProfile)
  }, [])

  async function onLogout() {
    await signOut()
    nav('/login', { replace: true })
  }

  const initial = (profile?.name?.[0] || 'M').toUpperCase()

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', position: 'relative',
      padding: isMobile ? 0 : '14px 0 14px 14px',
    }}>
      <div className="mt-ambient" />
      {isMobile && open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: '#00000099', zIndex: 19 }} />
      )}

      <aside className={isMobile ? '' : 'mt-sidebar-pill'} style={{
        width: 220, minWidth: 220,
        display: 'flex', flexDirection: 'column',
        zIndex: 10,
        ...(isMobile ? {
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 20,
          background: 'rgba(14, 14, 20, 0.85)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 200ms var(--ease)',
        } : {
          position: 'sticky', top: 14, height: 'calc(100vh - 28px)',
        }),
      }}>
        <div style={{ padding: '16px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 6px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--purple)', filter: 'drop-shadow(0 0 6px var(--purple))' }}>
              <polygon points="7 1 13 12 1 12" fill="currentColor" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.22em', color: 'var(--text-primary)' }}>MATILHA</span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--purple)', padding: '0 6px', letterSpacing: '0.14em', fontWeight: 600 }}>
            ÁREA DO MONITOR
          </div>
        </div>

        <nav className="mt-scrollbar-hidden" style={{ display: 'flex', flexDirection: 'column', padding: '8px 8px', gap: 1, flex: 1, overflowY: 'auto' }}>
          {[
            ...NAV,
            ...STAFF_NAV.filter(it => (profile?.roles || []).some(r => it.roles.includes(r))),
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px 7px 12px',
                borderRadius: 6,
                fontSize: 12.5, fontWeight: 450,
                color: isActive ? 'var(--purple)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(168,85,247,0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(168,85,247,0.22)' : '1px solid transparent',
                transition: 'background 150ms, color 150ms, border-color 150ms',
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={15} stroke={1.6} style={{ color: isActive ? 'var(--purple)' : 'var(--text-muted)' }} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          <div className="divider" style={{ margin: '14px 6px' }} />

          <Link to="/app/inicio" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 10px 6px 12px',
            borderRadius: 5,
            fontSize: 12, color: 'var(--text-muted)',
          }}>
            <IArrowLeft size={13} stroke={1.6} />
            voltar pra área do aluno
          </Link>
        </nav>

        <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg, #a855f7 0%, #00d9ff 100%)',
              color: '#0a0a0e', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{initial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.name?.split(' ')[0]?.toLowerCase() || 'monitor'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>monitor</div>
            </div>
            <button onClick={onLogout} title="sair" style={{ color: 'var(--text-muted)', padding: 4 }}>
              <ILogOut size={14} stroke={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {isMobile && (
        <button aria-label="menu" onClick={() => setOpen(v => !v)} style={{
          position: 'fixed', top: 14, right: 14, zIndex: 25,
          width: 40, height: 40, borderRadius: 6,
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {open ? <IX size={18} stroke={1.8} /> : <IMenu size={18} stroke={1.8} />}
        </button>
      )}

      <main style={{
        flex: 1, minWidth: 0,
        padding: isMobile ? '64px 16px 32px' : '24px 40px',
        overflow: 'auto',
        position: 'relative', zIndex: 1,
      }}>
        <div className="fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
