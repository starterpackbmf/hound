import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useIsMobile } from '../../lib/useMedia'
import { getMyCoins } from '../../lib/free'
import { getMyProfile } from '../../lib/profile'
import { isPremium, isPremiumRoute } from '../../lib/gate'
import RankBadge from '../../components/RankBadge'
import NotificationsBell from '../../components/NotificationsBell'
import OnboardingModal from '../../components/OnboardingModal'
import {
  IHome, IBook, IPlay, IZap, IEye, IPencil, IStar, GYinYang,
  ISearch, ILogOut, IMessage, IGlobe, IUsers, IExternalLink, ITarget,
  IMenu, IX, IClock, ICalendar, ISparkles, ISettings, ICheck,
} from '../../components/icons'

// Organização da sidebar — removidas duplicatas que vivem no /diary
// (Jornada, Histórico, Raio-X RP, Plano, Diário, Finalizar Dia)
const SECTIONS = [
  {
    key: 'main',
    label: null,
    items: [
      { to: '/app/inicio',        label: 'Início',              icon: IHome },
    ],
  },
  {
    key: 'workspace',
    label: 'Workspace',
    items: [
      // Destaque — leva pro sub-app /diary inteiro
      { to: '/diary/evolucao',    label: 'Diário do Trader',    icon: IPencil, highlight: true },
    ],
  },
  {
    key: 'aprendizado',
    label: 'Aprendizado',
    items: [
      // Destaque — leva pro sub-app /cursos inteiro
      { to: '/cursos/aulas',      label: 'Cursos & Aulas',      icon: IBook, highlight: true, variant: 'purple' },
      { to: '/app/oraculo',       label: 'Oráculo',             icon: GYinYang },
    ],
  },
  {
    key: 'monitoria',
    label: 'Monitoria',
    items: [
      { to: '/app/monitoria',      label: 'Agendar monitoria',  icon: ICalendar },
      { to: '/app/sessoes',        label: 'Sessões',            icon: IMessage },
    ],
  },
  {
    key: 'social',
    label: 'Social',
    items: [
      { to: '/app/comunidade',    label: 'Comunidade',          icon: IMessage },
      { to: '/app/social',        label: 'Social',              icon: IGlobe },
      { to: '/app/destaques',     label: 'Destaques',           icon: IStar },
      { to: '/app/desafios',      label: 'Desafios',            icon: IZap },
      { to: '/app/relatorio',     label: 'Relatório',           icon: ITarget },
    ],
  },
  {
    key: 'conta',
    label: 'Conta',
    items: [
      { to: '/app/parcerias',     label: 'Parcerias',           icon: IExternalLink },
      { to: '/app/packstore',     label: 'Pack Store',          icon: IStar },
      { to: '/app/minha-ficha',   label: 'Minha ficha',         icon: IUsers },
      { to: '/app/config',        label: 'Configurações',       icon: ISettings },
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
  const premium = isPremium(profile)

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', position: 'relative',
      padding: isMobile ? 0 : '14px 0 14px 14px',
    }}>
      <div className="mt-ambient" />
      <OnboardingModal />
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
          {!premium && !canBeMonitor && (
            <Link to="/app/upgrade" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 10px', borderRadius: 6,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(168,85,247,0.15) 50%, rgba(0,217,255,0.15) 100%)',
              border: '1px solid rgba(168,85,247,0.35)',
              color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              marginTop: 4,
              boxShadow: '0 0 16px rgba(168,85,247,0.15)',
            }}>
              ✨ VIRAR MENTORADO
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
        <nav className="mt-scrollbar-hidden" style={{ display: 'flex', flexDirection: 'column', padding: '4px 8px', gap: 1, flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {SECTIONS.map((section, si) => (
            <React.Fragment key={si}>
              {section.label && (
                <div style={{
                  fontSize: 9, color: 'var(--text-muted)', fontWeight: 600,
                  padding: si === 0 ? '6px 12px 4px' : '14px 12px 4px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}>{section.label}</div>
              )}
              {section.items.map(item => {
                const locked = !premium && isPremiumRoute(item.to)
                if (item.highlight) {
                  // Card de destaque — link pro sub-app (cyan p/ diário, purple p/ cursos)
                  const isPurple = item.variant === 'purple'
                  const accent = isPurple ? 'var(--purple)' : 'var(--cyan)'
                  const bgDefault = isPurple
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.16), rgba(236,72,153,0.1))'
                    : 'linear-gradient(135deg, rgba(0,217,255,0.14), rgba(168,85,247,0.1))'
                  const bgHover = isPurple
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.24), rgba(236,72,153,0.16))'
                    : 'linear-gradient(135deg, rgba(0,217,255,0.22), rgba(168,85,247,0.16))'
                  const borderCol = isPurple ? 'rgba(168,85,247,0.32)' : 'rgba(0,217,255,0.28)'
                  const shadowCol = isPurple ? 'rgba(168,85,247,0.15)' : 'rgba(0,217,255,0.12)'
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        marginBottom: 4,
                        background: bgDefault,
                        border: `1px solid ${borderCol}`,
                        color: 'var(--text-primary)',
                        fontSize: 12.5, fontWeight: 600,
                        transition: 'all .2s ease',
                        boxShadow: `0 0 18px ${shadowCol}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = bgHover
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = bgDefault
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <item.icon size={15} stroke={1.8} style={{ color: accent }} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <span style={{ fontSize: 10, color: accent }}>→</span>
                    </NavLink>
                  )
                }
                return (
                  <NavLink
                    key={item.to}
                    to={locked ? `/app/upgrade?from=${encodeURIComponent(item.to)}` : item.to}
                    end={item.to === '/app/inicio'}
                    style={({ isActive }) => ({
                      position: 'relative',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px 7px 12px',
                      borderRadius: 6,
                      fontSize: 12.5, fontWeight: 450,
                      color: isActive && !locked ? 'var(--cyan)' : (locked ? 'var(--text-faint)' : 'var(--text-secondary)'),
                      background: isActive && !locked ? 'rgba(0,217,255,0.08)' : 'transparent',
                      border: isActive && !locked ? '1px solid rgba(0,217,255,0.18)' : '1px solid transparent',
                      transition: 'background 150ms, color 150ms, border-color 150ms',
                      opacity: locked ? 0.55 : 1,
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={15} stroke={1.6} style={{
                          color: isActive && !locked ? 'var(--cyan)' : (locked ? 'var(--text-faint)' : 'var(--text-muted)'),
                          flexShrink: 0,
                        }} />
                        <span>{item.label}</span>
                        {locked && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>🔒</span>}
                        {!locked && item.liveDot && <span className="dot dot-live" style={{ marginLeft: 'auto', width: 5, height: 5 }} />}
                      </>
                    )}
                  </NavLink>
                )
              })}
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
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile?.name?.split(' ')[0]?.toLowerCase() || emailPrefix}
                </span>
                {premium ? (
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                    padding: '2px 5px', borderRadius: 3,
                    background: 'linear-gradient(135deg, #ec4899, #a855f7, #00d9ff)',
                    color: '#0a0a0e', flexShrink: 0,
                  }}>MENTORADO</span>
                ) : (
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                    padding: '2px 5px', borderRadius: 3,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', flexShrink: 0,
                  }}>FREE</span>
                )}
              </div>
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

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {/* Topbar (desktop only) — pill glass flutuante igual sidebar */}
        {!isMobile && (
          <header style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px 10px 24px',
            position: 'sticky', top: 14, zIndex: 5,
          }}>
            <div style={{ flex: 1 }} />

            {/* Pill-cluster que agrupa tudo — moldura glass única */}
            <div className="mt-sidebar-pill" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: 6,
              borderRadius: 14,
            }}>
              {/* SC balance — premium amber glow */}
              <NavLink
                to="/app/packstore"
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 12px', borderRadius: 9,
                  background: isActive
                    ? 'linear-gradient(180deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))'
                    : 'rgba(255,255,255,0.03)',
                  border: '1px solid ' + (isActive ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.06)'),
                  color: 'var(--amber)',
                  fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 600,
                  letterSpacing: '0.02em',
                  transition: 'all .15s ease',
                  textShadow: '0 0 10px rgba(245,158,11,0.4)',
                })}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(180deg, rgba(245,158,11,0.16), rgba(245,158,11,0.06))'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)' }}
                onMouseLeave={e => { if (!e.currentTarget.getAttribute('aria-current')) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' } }}
              >
                <IStar size={12} stroke={2} style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.6))' }} />
                {coins?.balance ?? '—'}
                <span style={{ opacity: 0.55, fontSize: 10, fontWeight: 500, marginLeft: -2 }}>SC</span>
              </NavLink>

              {/* Divider sutil */}
              <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.06)' }} />

              {/* Bell wrapper pra combinar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 6, borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all .15s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                <NotificationsBell />
              </div>

              <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.06)' }} />

              {/* Avatar + rank cluster */}
              <NavLink to="/app/minha-ficha" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 10px 5px 5px', borderRadius: 9,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all .15s ease',
                textDecoration: 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: profile?.avatar_url
                    ? `url(${profile.avatar_url}) center/cover`
                    : 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
                  color: '#0a0a0e', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(168,85,247,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}>
                  {!profile?.avatar_url && initial}
                </div>
                {rank && <RankBadge rank={rank} size="xs" glow />}
              </NavLink>
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
