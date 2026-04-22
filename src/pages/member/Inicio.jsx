import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { matilha } from '../../lib/matilha'
import { getMyProfile } from '../../lib/profile'
import { isPremium } from '../../lib/gate'
import { listEvents, partitionEvents, EVENT_KIND_LABELS } from '../../lib/events'
import { listLiveSessions } from '../../lib/liveSessions'
import { listSocialPosts, getMyCoins } from '../../lib/free'
import { listPosts as listCommunityPosts, categoryMeta } from '../../lib/community'
import RankBadge from '../../components/RankBadge'
import {
  IArrowRight, IPlay, ICalendar, ITrendingUp, ITrendingDown,
} from '../../components/icons'

// Student ID do Mateus no banco Matilha/Lovable (fonte dos "trades de referência").
// Se não setado, a seção "Diário do Mateus" mostra aviso de config pendente.
const PORTFOLIO_STUDENT_ID = import.meta.env.VITE_PORTFOLIO_STUDENT_ID || null

export default function Inicio() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [coins, setCoins] = useState(null)

  const [liveNow, setLiveNow] = useState(null)
  const [nextLive, setNextLive] = useState(null)
  const [recentLive, setRecentLive] = useState(null)

  const [events, setEvents] = useState([])
  const [portfolioTrades, setPortfolioTrades] = useState(null)
  const [portfolioSummary, setPortfolioSummary] = useState(null)
  const [communityPosts, setCommunityPosts] = useState([])
  const [socialPosts, setSocialPosts] = useState([])

  useEffect(() => {
    if (!user) return
    let cancel = false
    ;(async () => {
      const [p, c] = await Promise.all([
        getMyProfile().catch(() => null),
        getMyCoins().catch(() => ({ balance: 0 })),
      ])
      if (cancel) return
      setProfile(p); setCoins(c)

      listLiveSessions({ upcoming: false, limit: 20 }).then(sessions => {
        if (cancel) return
        const now = Date.now()
        const live = (sessions || []).find(s => {
          const starts = new Date(s.starts_at).getTime()
          const ends = s.ends_at ? new Date(s.ends_at).getTime() : starts + 90*60*1000
          return now >= starts - 10*60*1000 && now <= ends
        })
        const upcoming = (sessions || [])
          .filter(s => new Date(s.starts_at).getTime() > now - 10*60*1000 && s !== live)
          .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0]
        const past = (sessions || [])
          .filter(s => {
            const ends = s.ends_at ? new Date(s.ends_at).getTime() : new Date(s.starts_at).getTime() + 90*60*1000
            return ends < now
          })
          .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))[0]
        setLiveNow(live || null)
        setNextLive(upcoming || null)
        setRecentLive(past || null)
      }).catch(() => {})

      listEvents({ limit: 30 }).then(evs => {
        if (cancel) return
        setEvents(partitionEvents(evs).upcoming.slice(0, 5))
      }).catch(() => {})

      if (PORTFOLIO_STUDENT_ID) {
        const now = new Date()
        const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
        matilha.trades(PORTFOLIO_STUDENT_ID, from, to)
          .then(data => !cancel && setPortfolioTrades((data?.trades || data || []).slice(0, 8)))
          .catch(() => setPortfolioTrades([]))
        matilha.summary(PORTFOLIO_STUDENT_ID, from, to)
          .then(data => !cancel && setPortfolioSummary(data))
          .catch(() => {})
      } else {
        setPortfolioTrades([])
      }

      listCommunityPosts({ limit: 4 })
        .then(posts => !cancel && setCommunityPosts(posts || []))
        .catch(() => {})
      listSocialPosts()
        .then(posts => !cancel && setSocialPosts((posts || []).slice(0, 3)))
        .catch(() => {})
    })()
    return () => { cancel = true }
  }, [user])

  const premium = isPremium(profile)
  const displayName = profile?.name?.split(' ')[0]?.toLowerCase() || user?.email?.split('@')[0] || 'mentorado'

  return (
    <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* ==== GREETING ==== */}
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: '0.18em', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4 }}>
            {greetingByHour()}
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 500, margin: 0, letterSpacing: '-0.02em',
            fontFamily: 'var(--font-display, Instrument Serif, serif)',
            color: 'var(--text-primary)',
          }}>
            {displayName}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--text-muted)' }}>
          <span className="pill" style={{
            fontSize: 9,
            background: premium ? 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(168,85,247,0.12))' : 'var(--surface-2)',
            borderColor: premium ? 'rgba(168,85,247,0.35)' : 'var(--border)',
            color: premium ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 700, letterSpacing: '0.12em',
          }}>
            {premium ? '✨ MENTORADO' : 'FREE'}
          </span>
          {profile?.current_badge && <RankBadge rank={profile.current_badge} size="xs" glow />}
          <span style={{ background: 'var(--border)', width: 3, height: 3, borderRadius: '50%', display: 'inline-block', margin: '0 4px' }} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtLongDate()}</span>
        </div>
      </header>

      {/* ==== HERO ==== */}
      <LiveHero liveNow={liveNow} nextLive={nextLive} recentLive={recentLive} />

      {/* ==== PORTFOLIO + EVENTS ==== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 18 }} className="inicio-two-cols">
        <PortfolioSection trades={portfolioTrades} summary={portfolioSummary} configured={!!PORTFOLIO_STUDENT_ID} premium={premium} />
        <EventsSection events={events} />
      </div>

      {/* ==== ATIVIDADE ==== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="inicio-two-cols">
        <CommunitySection posts={communityPosts} />
        <SocialSection posts={socialPosts} />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .inicio-two-cols { grid-template-columns: 1fr !important; }
          .hero-two { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

// ============================================================
// LIVE HERO
// ============================================================
function LiveHero({ liveNow, nextLive, recentLive }) {
  if (liveNow) return <LiveNowBanner session={liveNow} />
  if (nextLive) return <NextLiveBanner session={nextLive} recentLive={recentLive} />
  return <QuietBanner recentLive={recentLive} />
}

function LiveNowBanner({ session }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      padding: '26px 28px', borderRadius: 16,
      background: `
        radial-gradient(ellipse at top left, rgba(236,72,153,0.25), transparent 60%),
        radial-gradient(ellipse at bottom right, rgba(168,85,247,0.22), transparent 60%),
        linear-gradient(180deg, rgba(24,8,20,0.9), rgba(14,6,18,0.92))
      `,
      border: '1px solid rgba(236,72,153,0.45)',
      boxShadow: '0 0 48px rgba(236,72,153,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
    }}>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <PulseDot />
        <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--pink)', fontWeight: 700 }}>AO VIVO AGORA</span>
      </div>
      <div style={{ fontSize: 10.5, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
        SALA ABERTA
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)', maxWidth: '80%' }}>
        {session.title}
      </h2>
      {session.host_name && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
          com <span style={{ color: 'var(--text-primary)' }}>{session.host_name}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <Link to="/cursos/aulas" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 20px', borderRadius: 10,
          background: 'linear-gradient(135deg, #ec4899, #a855f7)',
          color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(236,72,153,0.35)',
        }}>
          <IPlay size={13} stroke={2.2} />
          entrar na sala
          <IArrowRight size={12} stroke={2} />
        </Link>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          iniciou {relativeTime(session.starts_at)}
        </span>
      </div>
    </div>
  )
}

function NextLiveBanner({ session, recentLive }) {
  const starts = new Date(session.starts_at)
  const diffMs = starts.getTime() - Date.now()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffMin = Math.floor((diffMs % 3600000) / 60000)
  const isSoon = diffMs < 60 * 60 * 1000

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: recentLive ? '1.4fr 1fr' : '1fr', gap: 16,
    }} className="hero-two">
      <div style={{
        padding: '24px 26px', borderRadius: 16,
        background: `radial-gradient(ellipse at top right, rgba(0,217,255,0.14), transparent 55%),
                     linear-gradient(180deg, rgba(18,22,32,0.85), rgba(12,14,22,0.9))`,
        border: '1px solid rgba(0,217,255,0.28)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <ICalendar size={12} stroke={1.8} style={{ color: 'var(--cyan)' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--cyan)', fontWeight: 600 }}>PRÓXIMA AULA</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: '2px 0 6px', letterSpacing: '-0.01em' }}>
          {session.title}
        </h2>
        {session.host_name && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
            com <span style={{ color: 'var(--text-primary)' }}>{session.host_name}</span>
          </div>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '10px 12px', borderRadius: 9,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          width: 'fit-content',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600 }}>COMEÇA EM</span>
            <span style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 600,
              color: isSoon ? 'var(--pink)' : 'var(--cyan)', letterSpacing: '0.02em' }}>
              {diffMs < 0 ? 'agora' : diffHours > 0 ? `${diffHours}h ${diffMin}m` : `${diffMin}min`}
            </span>
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600 }}>HORÁRIO</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {starts.toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Link to="/cursos/aulas" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--cyan)', textDecoration: 'none',
          }}>
            ver agenda completa <IArrowRight size={11} stroke={1.8} />
          </Link>
        </div>
      </div>
      {recentLive && <RecentLiveCard session={recentLive} />}
    </div>
  )
}

function QuietBanner({ recentLive }) {
  return (
    <div style={{
      padding: '24px 26px', borderRadius: 16,
      background: 'linear-gradient(180deg, rgba(18,22,32,0.7), rgba(12,14,22,0.75))',
      border: '1px solid var(--border)',
      display: 'grid', gridTemplateColumns: recentLive ? '1fr 1fr' : '1fr', gap: 20,
    }} className="hero-two">
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>
          SEM AULAS AGENDADAS
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
          Nada rolando no momento
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
          Aulas ao vivo, open class e imersões aparecem aqui assim que forem agendadas.
        </p>
        <Link to="/cursos/aulas" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--cyan)', textDecoration: 'none', marginTop: 12,
        }}>
          ver replays <IArrowRight size={11} stroke={1.8} />
        </Link>
      </div>
      {recentLive && <RecentLiveCard session={recentLive} />}
    </div>
  )
}

function RecentLiveCard({ session }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
        ÚLTIMA AULA
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
        {session.title}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {relativeTime(session.ends_at || session.starts_at)}
      </div>
      {session.replay_url && (
        <Link to="/cursos/aulas" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: 'var(--amber)', textDecoration: 'none', marginTop: 8,
        }}>
          ▶ ver replay
        </Link>
      )}
    </div>
  )
}

// ============================================================
// PORTFOLIO
// ============================================================
function PortfolioSection({ trades, summary, configured, premium }) {
  const loading = trades === null
  return (
    <div style={{
      padding: 22, borderRadius: 14,
      background: `radial-gradient(ellipse at top left, rgba(168,85,247,0.08), transparent 60%),
                   linear-gradient(180deg, rgba(18,22,32,0.75), rgba(14,16,22,0.8))`,
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--purple)', fontWeight: 600, marginBottom: 4 }}>
            DIÁRIO DA REFERÊNCIA
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>
            Trades do Mateus Schwartz
          </h3>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
            Cada trade que ele pega na sala ao vivo, registrado em tempo real.
          </p>
        </div>
        {premium && (
          <Link to="/diary/historico" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: 'var(--cyan)', textDecoration: 'none',
            padding: '6px 10px', borderRadius: 6,
            border: '1px solid rgba(0,217,255,0.2)',
            background: 'rgba(0,217,255,0.05)',
            flexShrink: 0,
          }}>
            meu diário <IArrowRight size={10} stroke={1.8} />
          </Link>
        )}
      </div>

      {!configured ? (
        <PortfolioNotConfigured />
      ) : loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
          carregando trades...
        </div>
      ) : trades.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
          Nenhum trade registrado este mês ainda.
        </div>
      ) : (
        <>
          <PortfolioStats summary={summary} />
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {trades.slice(0, 6).map((t, i) => <TradeRow key={t.id || i} trade={t} />)}
          </div>
          {!premium && (
            <div style={{
              marginTop: 14, padding: '12px 14px', borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.08))',
              border: '1px solid rgba(236,72,153,0.22)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  Quer ver isso ao vivo?
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Mentorados acompanham cada entrada e saída em tempo real na sala.
                </div>
              </div>
              <Link to="/app/upgrade" className="btn" style={{
                fontSize: 11, padding: '7px 12px',
                background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                color: '#fff', border: 'none',
              }}>
                virar mentorado
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PortfolioNotConfigured() {
  return (
    <div style={{
      padding: 16, borderRadius: 8, fontSize: 11.5,
      background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)',
      color: 'var(--text-muted)', lineHeight: 1.5,
    }}>
      <div style={{ color: 'var(--amber)', fontWeight: 600, marginBottom: 4 }}>⚙ aguardando configuração</div>
      Defina <code style={{ color: 'var(--amber)' }}>VITE_PORTFOLIO_STUDENT_ID</code> no <code>.env</code> com o student_id do Mateus no banco Matilha (API do diário).
    </div>
  )
}

function PortfolioStats({ summary }) {
  if (!summary) return null
  const total = summary.total_result_brl ?? summary.total_brl ?? summary.result ?? 0
  const wr = summary.win_rate ?? summary.winrate ?? 0
  const n = summary.total_trades ?? summary.trades_count ?? summary.n ?? 0
  const up = total >= 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      <MiniStat label="RESULTADO DO MÊS" value={fmtBRL(total)} tone={up ? 'positive' : 'negative'}
        icon={up ? <ITrendingUp size={12} stroke={2} /> : <ITrendingDown size={12} stroke={2} />} />
      <MiniStat label="WIN RATE" value={`${Math.round(wr)}%`} tone="neutral" />
      <MiniStat label="TRADES" value={n} tone="neutral" />
    </div>
  )
}

function MiniStat({ label, value, tone, icon }) {
  const color = tone === 'positive' ? 'var(--green)' : tone === 'negative' ? 'var(--red)' : 'var(--text-primary)'
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: 'var(--surface-2)', border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color, fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>
        {icon}
        {value}
      </div>
    </div>
  )
}

function TradeRow({ trade }) {
  const result = Number(trade.result_brl ?? trade.result ?? trade.resultado ?? 0)
  const isWin = result > 0
  const isFlat = result === 0
  const setup = trade.setup || trade.strategy || '—'
  const asset = trade.asset || trade.ativo || trade.symbol || '—'
  const direction = (trade.direction || trade.direcao || '').toLowerCase().startsWith('v') ? 'venda' : 'compra'
  const points = trade.points ?? trade.pontos
  const dateStr = trade.date || trade.data || trade.created_at
  const date = dateStr ? new Date(dateStr) : null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr 64px auto auto',
      gap: 10, alignItems: 'center',
      padding: '8px 10px', borderRadius: 7,
      background: 'rgba(255,255,255,0.015)',
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span className="pill" style={{
          fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
          color: 'var(--text-secondary)', padding: '1px 6px',
        }}>{String(setup).toUpperCase()}</span>
        <span style={{ fontSize: 11.5, color: 'var(--text-primary)' }}>{asset}</span>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: direction === 'compra' ? 'var(--green)' : 'var(--red)',
          letterSpacing: '0.08em',
        }}>
          {direction === 'compra' ? '↑ C' : '↓ V'}
        </span>
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
        {points != null ? `${points > 0 ? '+' : ''}${points} pts` : ''}
      </span>
      <span className="pill" style={{
        fontSize: 9, fontWeight: 700,
        color: isFlat ? 'var(--text-muted)' : isWin ? 'var(--green)' : 'var(--red)',
        borderColor: isFlat ? 'var(--border)' : isWin ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
        background: isFlat ? 'var(--surface-2)' : isWin ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
      }}>
        {isFlat ? '—' : isWin ? 'W' : 'L'}
      </span>
      <span style={{
        fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600,
        color: isFlat ? 'var(--text-muted)' : isWin ? 'var(--green)' : 'var(--red)',
        minWidth: 72, textAlign: 'right',
      }}>
        {fmtBRL(result)}
      </span>
    </div>
  )
}

// ============================================================
// EVENTS
// ============================================================
function EventsSection({ events }) {
  return (
    <div style={{
      padding: 20, borderRadius: 14,
      background: 'linear-gradient(180deg, rgba(18,22,32,0.72), rgba(14,16,22,0.78))',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--cyan)', fontWeight: 600, marginBottom: 2 }}>
            AGENDA
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Próximos eventos</h3>
        </div>
        <Link to="/cursos/aulas" style={{ fontSize: 10.5, color: 'var(--text-muted)', textDecoration: 'none' }}>
          tudo →
        </Link>
      </div>
      {events.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 11.5, padding: '20px 0', textAlign: 'center', lineHeight: 1.5 }}>
          Nenhum evento agendado.
          <div style={{ fontSize: 10, marginTop: 6, color: 'var(--text-faint)' }}>
            Monitores podem agendar em /mentor/aulas/nova.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map(e => <EventMiniCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  )
}

function EventMiniCard({ event }) {
  const starts = new Date(event.starts_at)
  const kindLabel = EVENT_KIND_LABELS?.[event.kind] || event.kind
  return (
    <div style={{
      padding: 10, borderRadius: 8,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        flexShrink: 0, width: 40, textAlign: 'center',
        padding: '6px 0', borderRadius: 6,
        background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.12)',
      }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>
          {starts.toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3).toUpperCase()}
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
          {String(starts.getDate()).padStart(2, '0')}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>
          {(kindLabel || '').toString().toUpperCase()}
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {starts.toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// COMMUNITY
// ============================================================
function CommunitySection({ posts }) {
  return (
    <div style={{
      padding: 20, borderRadius: 14,
      background: 'linear-gradient(180deg, rgba(18,22,32,0.72), rgba(14,16,22,0.78))',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--purple)', fontWeight: 600, marginBottom: 2 }}>
            COMUNIDADE
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Matilha em ação</h3>
        </div>
        <Link to="/app/comunidade" style={{ fontSize: 10.5, color: 'var(--text-muted)', textDecoration: 'none' }}>
          abrir →
        </Link>
      </div>
      {posts.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 11.5, padding: '20px 0', textAlign: 'center' }}>
          nada por aqui ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.slice(0, 4).map(p => <PostMini key={p.id} post={p} />)}
        </div>
      )}
    </div>
  )
}

function PostMini({ post }) {
  const cat = categoryMeta(post.category)
  const t = post.created_at ? new Date(post.created_at) : null
  return (
    <div style={{
      padding: 10, borderRadius: 7,
      background: 'rgba(255,255,255,0.018)',
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 14, lineHeight: 1 }}>{cat.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {(post.body || '').slice(0, 140)}{post.body?.length > 140 ? '…' : ''}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>
          <span style={{ color: 'var(--purple)', fontWeight: 600, letterSpacing: '0.05em' }}>
            {cat.label}
          </span>
          {t && <span style={{ fontFamily: 'var(--font-mono)' }}>· {relativeTime(t)}</span>}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SOCIAL
// ============================================================
function SocialSection({ posts }) {
  return (
    <div style={{
      padding: 20, borderRadius: 14,
      background: 'linear-gradient(180deg, rgba(18,22,32,0.72), rgba(14,16,22,0.78))',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--amber)', fontWeight: 600, marginBottom: 2 }}>
            REDES DO MATEUS
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Últimas publicações</h3>
        </div>
        <Link to="/app/social" style={{ fontSize: 10.5, color: 'var(--text-muted)', textDecoration: 'none' }}>
          tudo →
        </Link>
      </div>
      {posts.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 11.5, padding: '20px 0', textAlign: 'center' }}>
          cadastre posts em <code>social_posts</code> pra aparecer aqui.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map(p => <SocialPostMini key={p.id} post={p} />)}
        </div>
      )}
    </div>
  )
}

function SocialPostMini({ post }) {
  const platform = (post.platform || 'other').toLowerCase()
  const pm = {
    instagram: { label: 'INSTAGRAM', color: '#E1306C', emoji: '📷' },
    youtube:   { label: 'YOUTUBE',   color: '#FF0000', emoji: '▶' },
    twitter:   { label: 'X',         color: '#ededed', emoji: '𝕏' },
    other:     { label: 'LINK',      color: 'var(--amber)', emoji: '🔗' },
  }[platform] || { label: 'LINK', color: 'var(--amber)', emoji: '🔗' }
  return (
    <a href={post.post_url || '#'} target="_blank" rel="noreferrer" style={{
      display: 'flex', gap: 10, padding: 10, borderRadius: 7, alignItems: 'flex-start',
      background: 'rgba(255,255,255,0.018)',
      border: '1px solid rgba(255,255,255,0.05)',
      textDecoration: 'none', color: 'inherit',
    }}>
      <span style={{ fontSize: 14, lineHeight: 1.1, color: pm.color }}>{pm.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.3, marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {post.title || post.description?.slice(0, 80) || '(sem título)'}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>
          <span style={{ color: pm.color, fontWeight: 600, letterSpacing: '0.05em' }}>{pm.label}</span>
          {post.posted_at && <span style={{ fontFamily: 'var(--font-mono)' }}>· {relativeTime(post.posted_at)}</span>}
        </div>
      </div>
    </a>
  )
}

// ============================================================
// HELPERS
// ============================================================
function PulseDot() {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
      <span style={{
        position: 'absolute', inset: 0,
        background: 'var(--pink)', borderRadius: '50%',
        animation: 'mt-pulse 1.4s ease-out infinite',
      }} />
      <span style={{
        position: 'absolute', inset: 2,
        background: 'var(--pink)', borderRadius: '50%',
      }} />
      <style>{`@keyframes mt-pulse { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }`}</style>
    </span>
  )
}

function greetingByHour() {
  const h = new Date().getHours()
  if (h < 6) return 'BOA MADRUGADA'
  if (h < 12) return 'BOM DIA'
  if (h < 18) return 'BOA TARDE'
  return 'BOA NOITE'
}
function fmtLongDate() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}
function fmtBRL(v) {
  if (v == null || Number.isNaN(Number(v))) return 'R$ 0'
  const n = Number(v)
  const sign = n > 0 ? '+' : ''
  return sign + n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function relativeTime(iso) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const abs = Math.abs(diff)
  const future = diff < 0
  const min = Math.round(abs / 60000)
  const hr = Math.round(abs / 3600000)
  const dy = Math.round(abs / 86400000)
  if (min < 1) return future ? 'em instantes' : 'agora'
  if (min < 60) return future ? `em ${min}min` : `${min}min atrás`
  if (hr < 24) return future ? `em ${hr}h` : `${hr}h atrás`
  if (dy < 7) return future ? `em ${dy}d` : `${dy}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
