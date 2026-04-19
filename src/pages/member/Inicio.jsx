import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { matilha } from '../../lib/matilha'
import { getMyProfile } from '../../lib/profile'
import { supabase } from '../../lib/supabase'
import { listEvents, partitionEvents } from '../../lib/events'
import { getMyCoins } from '../../lib/free'
import RankBadge from '../../components/RankBadge'
import Hound from '../../components/Hound'
import {
  IBook, ICalendar, IEye, IPencil, GYinYang,
  IArrowRight, ITrendingUp, ITrendingDown,
} from '../../components/icons'

export default function Inicio() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [liveEvent, setLiveEvent] = useState(null)
  const [coins, setCoins] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      const p = await getMyProfile().catch(() => null)
      if (cancel) return
      setProfile(p)

      if (p?.lovable_student_id) {
        matilha.summary(p.lovable_student_id).catch(() => null).then(s => !cancel && setSummary(s))
      }

      listEvents({ limit: 20 }).then(events => {
        if (cancel) return
        const { live } = partitionEvents(events)
        setLiveEvent(live[0] || null)
      }).catch(() => {})

      getMyCoins().catch(() => ({ balance: 0 })).then(c => !cancel && setCoins(c))

      if (!cancel) setLoading(false)
    })()
    return () => { cancel = true }
  }, [user])

  const name = profile?.name?.trim() || user?.email?.split('@')[0] || 'mentorado'
  const firstName = name.split(' ')[0]
  const badge = profile?.current_badge
  const status = profile?.status
  const roles = profile?.roles || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1040 }}>
      {/* HERO */}
      <section>
        <div className="eyebrow" style={{ marginBottom: 10 }}>SEJA BEM-VINDO</div>
        <h1 className="display" style={{
          fontSize: 40, fontWeight: 400, margin: '0 0 14px',
          color: 'var(--text-primary)', letterSpacing: '-0.025em',
          textShadow: '0 0 30px rgba(0,217,255,0.25), 0 0 60px rgba(168,85,247,0.15)',
        }}>
          {firstName}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="pill">
            <span className={`dot ${status === 'ativo' ? 'dot-up' : 'dot-muted'}`} />
            {status || 'pendente'}
          </span>
          {badge && <RankBadge rank={badge} size="sm" />}
          {roles.filter(r => r !== 'individual').map(r => (
            <span key={r} className="pill">
              <IEye size={11} stroke={1.6} />
              {r}
            </span>
          ))}
          {coins && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
              ⎈ {coins.balance} moedas
            </span>
          )}
        </div>
      </section>

      {/* BANNER AO VIVO */}
      {liveEvent && (
        <Link to="/app/aulas" style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '14px 18px',
          background: 'linear-gradient(90deg, #ec489914 0%, var(--surface-2) 40%)',
          border: '1px solid #ec489944',
          borderRadius: 10,
          transition: 'all 150ms',
          boxShadow: '0 0 30px #ec489922',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#ec489988'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#ec489944'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="dot dot-live" style={{ width: 8, height: 8 }} />
            <span className="glow-pink" style={{
              fontSize: 10, letterSpacing: '0.14em', color: 'var(--pink)',
              fontWeight: 600, fontFamily: 'var(--font-mono)',
            }}>AO VIVO AGORA</span>
          </div>
          <div style={{ height: 20, width: 1, background: 'var(--border)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
              {liveEvent.title}
            </div>
            {liveEvent.host_name && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                com {liveEvent.host_name}
              </div>
            )}
          </div>
          <span className="btn btn-primary" style={{ pointerEvents: 'none' }}>
            entrar <IArrowRight size={12} stroke={2} />
          </span>
        </Link>
      )}

      {/* GRID 2x2 SHORTCUTS */}
      <section>
        <div style={sectionHead}>
          <span className="label-muted">continuar de onde parou</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          <ShortcutCard
            icon={IBook} to="/app/estudo"
            title="área de estudo"
            sub="retome seus cursos e siga o caminho do Tradesystem."
            cta="ver cursos"
          />
          <ShortcutCard
            icon={ICalendar} to="/app/aulas"
            title="próxima aula ao vivo"
            sub="agenda, open class e replays da sala."
            cta="ver agenda"
          />
          <ShortcutCard
            icon={GYinYang} to="/app/oraculo"
            title="oráculo"
            sub="pergunte sobre qualquer aula, conceito ou estratégia. respostas treinadas no acervo."
            cta="abrir"
          />
          <ShortcutCard
            icon={IPencil} to="/app/diario"
            title="diário"
            sub="registre os trades do dia. vira hábito depois do pregão."
            cta="abrir diário"
          />
        </div>
      </section>

      {/* PERFIL / MATILHA */}
      <section>
        <div style={sectionHead}>
          <span className="label-muted">sua matilha</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <StatCard label="STATUS" value={status || 'pendente'} mono={false} accent="cyan" />
          <StatCard label="BADGE" value={badge ? badge.replace(/_/g, ' ') : '—'} mono={false} accent="purple" />
          <StatCard label="MOEDAS" value={coins?.balance ?? '—'} mono accent="pink" />
          <StatCard label="DIÁRIO" value={profile?.lovable_student_id ? 'ligado' : '—'} mono={false} accent="cyan" />
        </div>
      </section>

      {/* PERFORMANCE (se ligado ao diário) */}
      {profile?.lovable_student_id && summary?.total_trades > 0 && (
        <section>
          <div style={sectionHead}>
            <span className="label-muted">performance recente</span>
            <Link to="/app/diario" className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
              abrir diário <IArrowRight size={11} stroke={1.6} />
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="TRADES" value={summary.total_trades} mono accent="cyan" />
            <StatCard label="WIN RATE" value={`${summary.win_rate}%`} mono accent="pink" />
            <StatCard label="R:R MÉDIO" value={summary.risk_reward ? `${summary.risk_reward.toFixed(1)}x` : '—'} mono accent="purple" />
            <StatCard label="RESULTADO" value={`R$ ${Number(summary.total_result_brl).toLocaleString('pt-BR')}`} mono valueColor={summary.total_result_brl >= 0 ? 'var(--up)' : 'var(--down)'} accent={summary.total_result_brl >= 0 ? 'up' : 'down'} />
            <StatCard label="SEGUIU PLANO" value={`${summary.followed_plan_rate}%`} mono accent="cyan" />
          </div>
        </section>
      )}

      {/* Row inferior: atalhos + Hound */}
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 10 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={sectionHead}>
            <span className="label-muted">atalhos</span>
            <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>tecle ⌘K</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginTop: 6 }}>
            <Shortcut k="G → D" label="abrir diário" />
            <Shortcut k="G → E" label="ir pra estudo" />
            <Shortcut k="G → O" label="oráculo" />
            <Shortcut k="G → R" label="destaques" />
            <Shortcut k="N" label="novo trade" />
            <Shortcut k="?" label="todos os atalhos" />
          </div>
        </div>

        <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Hound size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
              o Hound tá de olho
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.45 }}>
              relatório pré-market chega todo dia 08:45
            </div>
          </div>
        </div>
      </section>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>carregando dados...</div>}
    </div>
  )
}

function ShortcutCard({ icon: Ico, title, sub, cta, to, meta, progress }) {
  return (
    <Link to={to} className="card card-hover" style={{
      display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
      color: 'var(--text-primary)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ico size={18} stroke={1.5} style={{ color: 'var(--amber)' }} />
        {meta && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{meta}</span>}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{sub}</div>
      </div>
      {progress != null && (
        <div style={{ height: 2, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginTop: 2 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--amber)' }} />
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
        {cta} <IArrowRight size={11} stroke={1.8} />
      </div>
    </Link>
  )
}

function StatCard({ label, value, sub, mono = true, delta, deltaUp, dotLive, valueColor, accent }) {
  return (
    <div className={`card ${accent ? `leftbar-${accent}` : ''}`} style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="label-muted" style={{ fontSize: 9.5 }}>{label}</span>
        {dotLive && <span className="dot dot-live" style={{ width: 5, height: 5 }} />}
      </div>
      <div style={{
        fontSize: 18, fontWeight: 500,
        color: valueColor || 'var(--text-primary)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
        fontFeatureSettings: mono ? '"zero","ss01"' : undefined,
        letterSpacing: mono ? '-0.01em' : undefined,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</div>}
      {delta && (
        <div style={{
          fontSize: 10, color: deltaUp ? 'var(--up)' : 'var(--down)',
          fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {deltaUp ? <ITrendingUp size={10} stroke={1.8} /> : <ITrendingDown size={10} stroke={1.8} />}
          {delta}
        </div>
      )}
    </div>
  )
}

function Shortcut({ k, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 8px', borderRadius: 4,
      fontSize: 11.5, color: 'var(--text-secondary)',
    }}>
      <span className="kbd" style={{ minWidth: 48, textAlign: 'center' }}>{k}</span>
      {label}
    </div>
  )
}

const sectionHead = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
}
