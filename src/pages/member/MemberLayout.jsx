import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useIsMobile } from '../../lib/useMedia'
import { getMyCoins } from '../../lib/free'
import { getMyProfile } from '../../lib/profile'
import RankBadge from '../../components/RankBadge'
import NotificationsBell from '../../components/NotificationsBell'
import {
  IHome, IBook, IPlay, IZap, IEye, IPencil, IStar, GYinYang,
  ISearch, ILogOut, IMessage, IGlobe, IUsers, IExternalLink, ITarget,
  IMenu, IX, IClock, ICalendar, ISparkles, ISettings,
} from '../../components/icons'

// Organização da sidebar seguindo o Lovable (seções nomeadas)
const SECTIONS = [
  {
    label: null, // sem header — rotas principais
    items: [
      { to: '/app/inicio',        label: 'evolução',          icon: IHome },
      { to: '/app/jornada',       label: 'minha jornada',     icon: ISparkles },
    ],
  },
  {
    label: 'operacional',
    items: [
      { to: '/app/diario',        label: 'diário',            icon: IPencil },
      { to: '/app/historico',     label: 'histórico',         icon: IClock },
    ],
  },
  {
    label: 'aprendizado',
    items: [
      { to: '/app/estudo',        label: 'aulas',             icon: IBook },
      { to: '/app/oraculo',       label: 'oráculo',           icon: GYinYang },
      { to: '/app/resumo-semanal',label: 'w.o.l.f ai',        icon: IZap },
    ],
  },
  {
    label: 'monitoria',
    items: [
      { to: '/app/monitoria',     label: 'acompanhamento',    icon: ICalendar },
      { to: '/app/sessoes',       label: 'sessões',           icon: IMessage },
      { to: '/app/plano-execucao', label: 'plano',            icon: ITarget },
      { to: '/app/aulas',         label: 'ao vivo',           icon: IPlay, liveDot: true },
      { to: '/app/imersoes',      label: 'imersões',          icon: IEye },
    ],
  },
  {
    label: 'social',
    items: [
      { to: '/app/comunidade',    label: 'comunidade',        icon: IMessage },
      { to: '/app/social',        label: 'social',            icon: IGlobe },
      { to: '/app/destaques',     label: 'destaques',         icon: IStar },
      { to: '/app/desafios',      label: 'desafios',          icon: IZap },
      { to: '/app/relatorio',     label: 'relatório',         icon: ITarget },
    ],
  },
  {
    label: 'conta',
    items: [
      { to: '/app/cursos-gratis', label: 'cursos grátis',     icon: IBook },
      { to: '/app/parcerias',     label: 'parcerias',         icon: IExternalLink },
      { to: '/app/packstore',     label: 'pack store',        icon: IStar },
      { to: '/app/minha-ficha',   label: 'minha ficha',       icon: IUsers },
      { to: '/app/config',        label: 'configurações',     icon: ISettings },
    ],
  },
]

export default function MemberLayout() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const isMobile = useIsMobile(900)
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [coins, setCoins] = useState(null)

  useEffect(() => { setOpen(false) }, [loc.pathname])

  useEffect(() => {
    if (!user) return
    getMyProfile().catch(() => null).then(setProfile)
    getMyCoins().catch(() => ({ balance: 0 })).then(setCoins)
  }, [user])

  async function onLogout() {
    await signOut()
    nav('/login', { replace: true })
  }

  const emailPrefix = user?.email?.split('@')[0] || 'mentorado'
  const initial = (profile?.name?.[0] || emailPrefix[0] || 'm').toUpperCase()
  const rank = profile?.current_badge
  const canBeMonitor = (profile?.roles || []).some(r => ['monitor', 'admin', 'imortal'].includes(r))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--body)' }}>
      {isMobile && open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: '#00000099', zIndex: 19 }} />
      )}

      <aside style={{
        width: 220, minWidth: 220,
        background: 'rgba(14, 14, 20, 0.65)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
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
        <div style={{ padding: '16px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 6px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--cyan)', filter: 'drop-shadow(0 0 6px var(--cyan))' }}>
              <polygon points="7 1 13 12 1 12" fill="currentColor" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.22em', color: 'var(--text-primary)' }}>MATILHA</span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-faint)', padding: '0 6px', letterSpacing: '0.08em' }}>
            Jornada do Trader
          </div>
          {canBeMonitor && (
            <Link to="/mentor/visao-geral" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 9px', borderRadius: 6,
              background: 'var(--amber-dim-15)', border: '1px solid var(--amber-dim-25)',
              color: 'var(--amber)', fontSize: 11, fontWeight: 500,
              marginTop: 4,
            }}>
              ↔ trocar para monitor
            </Link>
          )}
          <button
            type="button"
            title="buscar (⌘K)"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 9px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 12,
              marginTop: 4,
            }}
          >
            <ISearch size={13} stroke={1.75} />
            <span style={{ flex: 1, textAlign: 'left' }}>buscar</span>
            <span className="kbd">⌘K</span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px', gap: 1, flex: 1, overflowY: 'auto' }}>
          {SECTIONS.map((section, si) => (
            <React.Fragment key={si}>
              {section.label && (
                <div style={{
                  fontSize: 10, color: 'var(--text-muted)', fontWeight: 500,
                  padding: si === 0 ? '6px 12px 4px' : '14px 12px 4px',
                  letterSpacing: '0.08em',
                }}>{section.label}</div>
              )}
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/app/inicio'}
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
        <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
              color: '#0a0a0e', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{initial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{profile?.name?.split(' ')[0]?.toLowerCase() || emailPrefix}</div>
              <div style={{
                fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{user?.email}</div>
            </div>
            <button
              onClick={onLogout}
              title="sair"
              style={{ color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ILogOut size={14} stroke={1.5} />
            </button>
          </div>
        </div>
      </aside>

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

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar (desktop only) */}
        {!isMobile && (
          <header style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'rgba(10, 10, 14, 0.55)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            position: 'sticky', top: 0, zIndex: 5,
          }}>
            <div style={{ flex: 1 }} />
            <NavLink to="/app/packstore" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 6,
              background: isActive ? 'var(--amber-dim-15)' : 'var(--surface-1)',
              border: '1px solid ' + (isActive ? 'var(--amber-dim-25)' : 'var(--border)'),
              color: 'var(--amber)', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
            })}>
              <IStar size={12} stroke={1.8} />
              {coins?.balance ?? '—'} SC
            </NavLink>
            <NotificationsBell />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
                color: '#0a0a0e', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{initial}</div>
              {rank && <RankBadge rank={rank} size="xs" />}
            </div>
          </header>
        )}

        <main style={{
          flex: 1,
          padding: isMobile ? '64px 16px 32px' : '24px 40px 40px',
          overflow: 'auto',
        }}>
          <div className="fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
