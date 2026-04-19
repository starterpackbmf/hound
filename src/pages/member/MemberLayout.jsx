import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useIsMobile } from '../../lib/useMedia'
import {
  IHome, IBook, IPlay, IZap, IEye, IPencil, IStar, GYinYang,
  ISearch, ILogOut, IMessage, IGlobe, IUsers, IExternalLink, ITarget, IMenu, IX,
} from '../../components/icons'

const NAV = [
  {
    label: 'matilha',
    items: [
      { to: '/app/inicio',    label: 'início',    icon: IHome },
      { to: '/app/estudo',    label: 'estudo',    icon: IBook },
      { to: '/app/aulas',     label: 'ao vivo',   icon: IPlay, liveDot: true },
      { to: '/app/imersoes',  label: 'imersões',  icon: IZap },
      { to: '/app/monitoria', label: 'monitoria', icon: IEye },
      { to: '/app/diario',    label: 'diário',    icon: IPencil },
      { to: '/app/oraculo',   label: 'oráculo',   icon: GYinYang },
      { to: '/app/destaques', label: 'destaques', icon: IStar },
    ],
  },
  {
    label: 'comunidade',
    items: [
      { to: '/app/comunidade',    label: 'fórum',         icon: IMessage },
      { to: '/app/social',        label: 'social',        icon: IGlobe },
      { to: '/app/cursos-gratis', label: 'cursos grátis', icon: IBook },
      { to: '/app/relatorio',     label: 'relatório',     icon: ITarget },
      { to: '/app/packstore',     label: 'packstore',     icon: IStar },
      { to: '/app/parcerias',     label: 'parcerias',     icon: IExternalLink },
    ],
  },
]

export default function MemberLayout() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const isMobile = useIsMobile(900)
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [loc.pathname])

  async function onLogout() {
    await signOut()
    nav('/login', { replace: true })
  }

  const emailPrefix = user?.email?.split('@')[0] || 'mentorado'
  const initial = (emailPrefix[0] || 'm').toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--body)' }}>
      {isMobile && open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: '#00000099', zIndex: 19 }} />
      )}

      <aside style={{
        width: 220, minWidth: 220,
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        ...(isMobile ? {
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 20,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 200ms var(--ease)',
        } : {
          position: 'sticky', top: 0, height: '100vh',
        }),
      }}>
        {/* Logo + search */}
        <div style={{ padding: '16px 12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 6px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--amber)' }}>
              <polygon points="7 1 13 12 1 12" fill="currentColor" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.22em', color: 'var(--text-primary)' }}>
              MATILHA
            </span>
          </div>
          <button
            type="button"
            title="buscar (⌘K)"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 9px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 12,
              transition: 'all 150ms',
            }}
          >
            <ISearch size={13} stroke={1.75} />
            <span style={{ flex: 1, textAlign: 'left' }}>buscar</span>
            <span className="kbd">⌘K</span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px', gap: 1 }}>
          {NAV.map((section, si) => (
            <React.Fragment key={section.label}>
              {si > 0 && <div className="divider" style={{ margin: '12px 6px' }} />}
              <div style={{
                fontSize: 10, color: 'var(--text-muted)', fontWeight: 500,
                padding: '6px 12px 4px', letterSpacing: '0.08em',
              }}>{section.label}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 10px 6px 12px',
                    borderRadius: 5,
                    fontSize: 12.5, fontWeight: 450,
                    color: isActive ? 'var(--amber)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--amber-dim)' : 'transparent',
                    transition: 'background 150ms, color 150ms',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{
                        position: 'absolute', left: 0, top: 6, bottom: 6, width: 2,
                        background: isActive ? 'var(--amber)' : 'transparent',
                        borderRadius: '0 2px 2px 0',
                      }} />
                      <item.icon size={15} stroke={1.6} style={{ color: isActive ? 'var(--amber)' : 'var(--text-muted)' }} />
                      <span>{item.label}</span>
                      {item.liveDot && <span className="dot dot-live" style={{ marginLeft: 'auto', width: 5, height: 5 }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* Footer user */}
        <div style={{ marginTop: 'auto', padding: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg, #f97316 0%, #e4b528 100%)',
              color: '#0a0a0a', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{initial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {emailPrefix}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="sair"
              style={{
                color: 'var(--text-muted)', padding: 4, borderRadius: 4,
                display: 'flex', transition: 'color 150ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ILogOut size={14} stroke={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile toggle */}
      {isMobile && (
        <button
          aria-label="menu"
          onClick={() => setOpen(v => !v)}
          style={{
            position: 'fixed', top: 14, right: 14, zIndex: 25,
            width: 40, height: 40, borderRadius: 6,
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {open ? <IX size={18} stroke={1.8} /> : <IMenu size={18} stroke={1.8} />}
        </button>
      )}

      <main style={{
        flex: 1, minWidth: 0,
        padding: isMobile ? '64px 16px 32px' : '32px 40px',
        overflow: 'auto',
      }}>
        <div className="fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
