import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getMyProfile } from '../../lib/profile'
import {
  ITrendingUp, IPencil, IClock, ICheck, ITarget, ISparkles, IBook, IArrowLeft, ILogOut, IZap,
  ISearch, IChevronRight, IChevronDown, IPlus,
} from '../../components/icons'

const NAV = [
  { to: '/diary/evolucao',    label: 'Evolução',         icon: ITrendingUp },
  { to: '/diary/diario',      label: 'Diário do dia',    icon: IPencil },
  { to: '/diary/historico',   label: 'Histórico',        icon: IClock },
  { to: '/diary/operacional', label: 'Raio-X Setups',    icon: ITarget },
  { to: '/diary/wolf',        label: 'W.O.L.F AI',       icon: IZap },
  { to: '/diary/plano',       label: 'Plano',            icon: IBook },
  { to: '/diary/jornada',     label: 'Jornada',          icon: ISparkles },
]

const SETUPS = [
  { code: 'TA',  label: 'Trade de Abertura',    color: '#18D18A' },
  { code: 'TC',  label: 'Trade de Continuação', color: '#6FE6F0' },
  { code: 'TRM', label: 'Retorno às Médias',    color: '#A498FF' },
  { code: 'FQ',  label: 'Falha e Quebra',       color: '#E7C67A' },
]

export default function DiaryLayout() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [setupsOpen, setSetupsOpen] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    if (!user) return
    getMyProfile().catch(() => null).then(setProfile)
  }, [user])

  // atalho / abre o search (placeholder)
  useEffect(() => {
    function onKey(e) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        // TODO: open command palette
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function onLogout() {
    await signOut(); nav('/login', { replace: true })
  }

  const emailPrefix = user?.email?.split('@')[0] || 'mentorado'
  const displayName = profile?.name?.split(' ')[0] || emailPrefix

  return (
    <div data-diary style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <div className="ink-ambient" />
      <aside style={{
        width: 236, minWidth: 236,
        background: 'var(--ink-bg)',
        borderRight: '1px solid var(--ink-line)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        zIndex: 1,
        padding: 10,
      }}>
        {/* BRAND HEADER */}
        <Link to="/app/inicio" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--ink-line)',
          borderRadius: 10,
          textDecoration: 'none',
          color: 'var(--ink-text)',
          marginBottom: 10,
          transition: 'background .12s ease, border-color .12s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 5,
            background: 'linear-gradient(135deg, var(--ink-green), var(--ink-cyan))',
            color: '#07080A', fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>M</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-text)', lineHeight: 1.1 }}>
              Matilha
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-dim)', letterSpacing: '0.1em', marginTop: 1 }}>
              DIARY WORKSPACE
            </div>
          </div>
          <IChevronRight size={12} stroke={1.6} style={{ color: 'var(--ink-dim)', transform: 'rotate(180deg)' }} />
        </Link>

        {/* SEARCH */}
        <button
          type="button"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-dim)',
            fontSize: 13,
            cursor: 'pointer',
            borderRadius: 6,
            transition: 'background .12s',
            marginBottom: 2,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--ink-text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-dim)' }}
        >
          <ISearch size={14} stroke={1.6} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search</span>
          <span className="ink-kbd">/</span>
        </button>

        {/* MAIN NAV */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflowY: 'auto', paddingBottom: 10 }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                borderRadius: 7,
                fontSize: 13, fontWeight: isActive ? 500 : 450,
                color: isActive ? 'var(--ink-text)' : 'var(--ink-muted)',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: isActive ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'background .1s ease, color .1s ease, border-color .1s ease',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.color = 'var(--ink-text)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.color = 'var(--ink-muted)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={14} stroke={1.6} style={{ color: isActive ? 'var(--ink-text)' : 'var(--ink-muted)', flexShrink: 0 }} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--ink-line)', margin: '10px 6px' }} />

          {/* SETUPS (como folders coloridos) */}
          <button
            onClick={() => setSetupsOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-dim)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {setupsOpen ? <IChevronDown size={10} stroke={1.8} /> : <IChevronRight size={10} stroke={1.8} />}
            Setups
          </button>
          {setupsOpen && SETUPS.map(s => (
            <NavLink
              key={s.code}
              to={`/diary/operacional?setup=${s.code}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 12px',
                borderRadius: 6,
                fontSize: 13, fontWeight: 450,
                color: 'var(--ink-muted)',
                textDecoration: 'none',
                transition: 'background .1s ease, color .1s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink-text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: 2,
                background: s.color, flexShrink: 0,
              }} />
              <span style={{ flex: 1 }}>{s.label}</span>
              <IChevronRight size={11} stroke={1.6} style={{ color: 'var(--ink-dim)' }} />
            </NavLink>
          ))}

          {/* ACTION: registrar trade */}
          <button
            onClick={() => nav('/diary/diario')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%',
              padding: '7px 12px',
              marginTop: 4,
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-dim)',
              fontSize: 13,
              cursor: 'pointer',
              borderRadius: 6,
              transition: 'background .1s ease, color .1s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink-text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-dim)'; e.currentTarget.style.background = 'transparent' }}
          >
            <IPlus size={14} stroke={1.6} style={{ flexShrink: 0 }} />
            <span>Registrar trade</span>
          </button>
        </nav>

        {/* FOOTER USER */}
        <div style={{
          padding: '10px 10px',
          borderTop: '1px solid var(--ink-line)',
          display: 'flex', alignItems: 'center', gap: 10,
          margin: '0 -10px -10px',
          paddingLeft: 16, paddingRight: 12,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #18D18A, #6FE6F0)',
            color: '#07080A', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{!profile?.avatar_url && (displayName[0] || 'm').toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-text)', fontWeight: 500 }}>{displayName}</div>
          </div>
          <Link to="/app/inicio" title="voltar pra Matilha" style={{ color: 'var(--ink-dim)', padding: 4, display: 'flex' }}>
            <IArrowLeft size={13} stroke={1.6} />
          </Link>
          <button onClick={onLogout} title="sair" style={{ color: 'var(--ink-dim)', padding: 4 }}>
            <ILogOut size={13} stroke={1.5} />
          </button>
        </div>
      </aside>

      <main style={{
        flex: 1, minWidth: 0, overflowX: 'hidden',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        padding: '32px 40px 64px',
      }}>
        <div style={{ width: '100%', maxWidth: 1280 }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
