import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { getMyProfile } from '../../lib/profile'
import { supabase } from '../../lib/supabase'
import RankBadge from '../../components/RankBadge'

const PERIODS = [
  { id: '7d', label: '7d', days: 7 },
  { id: '14d', label: '14d', days: 14 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
  { id: '180d', label: '180d', days: 180 },
  { id: '1y', label: '1 ano', days: 365 },
  { id: 'all', label: 'Tudo', days: null },
]

const SETUPS = [
  { id: 'all', label: 'Todas' },
  { id: 'TRM', label: 'TRM' },
  { id: 'FQ',  label: 'FQ' },
  { id: 'TC',  label: 'TC' },
  { id: 'TA',  label: 'TA' },
]

const ASSETS = [
  { id: 'all', label: 'Todos' },
  { id: 'WIN', label: 'Índice' },
  { id: 'WDO', label: 'Dólar' },
]

// paleta INK
const GREEN = '#18D18A'
const RED = '#FF5470'
const GOLD = '#E7C67A'
const CYAN = '#6FE6F0'
const VIOLET = '#A498FF'
const TEXT = '#E9EBEE'
const MUTED = 'rgba(233,235,238,0.62)'
const DIM = 'rgba(233,235,238,0.40)'
const LINE = 'rgba(255,255,255,0.06)'

function fmtBRL(n, { sign = false } = {}) {
  const abs = Math.abs(n)
  const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const pre = n < 0 ? '−' : (sign && n > 0 ? '+' : '')
  return `${pre}R$ ${s}`
}
function fmtPct(n, { sign = false } = {}) {
  const s = Math.abs(n).toFixed(1)
  const pre = n < 0 ? '−' : (sign && n > 0 ? '+' : '')
  return `${pre}${s}%`
}

export default function Evolucao() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [trades, setTrades] = useState([])
  const [period, setPeriod] = useState('all')
  const [setup, setSetup] = useState('all')
  const [asset, setAsset] = useState('all')
  const [customRange, setCustomRange] = useState({ from: '', to: '' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getMyProfile().catch(() => null),
      supabase.from('trades').select('*').eq('user_id', user.id).order('date'),
    ]).then(([p, t]) => {
      setProfile(p)
      setTrades(t.data || [])
    }).finally(() => setLoading(false))
  }, [user])

  const filtered = useMemo(() => {
    let list = trades
    if (period === 'custom' && (customRange.from || customRange.to)) {
      if (customRange.from) list = list.filter(t => t.date >= customRange.from)
      if (customRange.to) list = list.filter(t => t.date <= customRange.to)
    } else if (period !== 'all') {
      const daysBack = PERIODS.find(p => p.id === period)?.days
      if (daysBack) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - daysBack)
        const iso = cutoff.toISOString().slice(0, 10)
        list = list.filter(t => t.date >= iso)
      }
    }
    if (setup !== 'all') list = list.filter(t => t.setup === setup)
    if (asset !== 'all') list = list.filter(t => (t.ativo || '').toUpperCase() === asset)
    return list
  }, [trades, period, setup, asset, customRange])

  // métricas principais
  const metrics = useMemo(() => {
    if (filtered.length === 0) {
      return { totalBrl: 0, winRate: 0, winCount: 0, lossCount: 0, total: 0, daysOperated: 0, maxDD: 0, maxDDPct: 0 }
    }
    const totalBrl = filtered.reduce((s, t) => s + (t.resultado_brl || 0), 0)
    const wins = filtered.filter(t => (t.resultado_brl || 0) > 0).length
    const losses = filtered.filter(t => (t.resultado_brl || 0) < 0).length
    const winRate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0
    const daysSet = new Set(filtered.map(t => t.date))
    const daysOperated = daysSet.size

    const byDate = {}
    filtered.forEach(t => { byDate[t.date] = (byDate[t.date] || 0) + (t.resultado_brl || 0) })
    const days = Object.keys(byDate).sort()
    let cumulative = 0, peak = 0, maxDD = 0
    days.forEach(d => {
      cumulative += byDate[d]
      if (cumulative > peak) peak = cumulative
      const dd = cumulative - peak
      if (dd < maxDD) maxDD = dd
    })
    // drawdown % só faz sentido quando o pico é representativo (usa o maior entre pico e |DD| como denom)
    const denom = Math.max(peak, Math.abs(maxDD))
    const maxDDPct = denom > 0 ? Math.abs(maxDD / denom) * 100 : 0
    return { totalBrl, winRate, winCount: wins, lossCount: losses, total: filtered.length, daysOperated, maxDD, maxDDPct, maxDDPeak: peak }
  }, [filtered])

  // curva de capital (cumulativo)
  const equity = useMemo(() => {
    const byDate = {}
    filtered.forEach(t => { byDate[t.date] = (byDate[t.date] || 0) + (t.resultado_brl || 0) })
    const days = Object.keys(byDate).sort()
    let cum = 0
    return days.map(d => { cum += byDate[d]; return { date: d, value: cum, dayPnl: byDate[d] } })
  }, [filtered])

  // resultado diário (bars)
  const daily = useMemo(() => {
    const byDate = {}
    filtered.forEach(t => { byDate[t.date] = (byDate[t.date] || 0) + (t.resultado_brl || 0) })
    const days = Object.keys(byDate).sort().slice(-30)
    return days.map(d => ({ date: d, value: byDate[d] }))
  }, [filtered])

  // por estratégia
  // "Pontos capturados" do trade = média ponderada (os pts que o mercado moveu a favor),
  // NÃO média × contratos — esse último seria "pts acumulados em contratos" e infla o número.
  // Ex: 10 contratos pegando 5 pts médio cada → capturei 5 pts do mercado (não 50).
  const tradePoints = (t) => {
    const mp = Number(t.media_ponderada)
    if (Number.isFinite(mp)) return mp
    // fallback: se só tem total_points e contratos, divide de volta
    const tp = Number(t.total_points) || 0
    const c = Number(t.contratos_iniciais) || 1
    return c > 0 ? tp / c : tp
  }

  const bySetup = useMemo(() => {
    const m = {}
    ;['TA', 'TC', 'TRM', 'FQ'].forEach(k => { m[k] = { trades: [], points: 0, brl: 0 } })
    filtered.forEach(t => {
      if (!m[t.setup]) return
      m[t.setup].trades.push(t)
      m[t.setup].points += tradePoints(t)
      m[t.setup].brl += t.resultado_brl || 0
    })
    return Object.entries(m).map(([code, d]) => {
      const ops = d.trades.length
      const pointsArr = d.trades.map(tradePoints)
      const wins = pointsArr.filter(p => p > 0).length
      const losses = pointsArr.filter(p => p < 0).length
      const hitRate = ops > 0 ? Math.round((wins / ops) * 100) : 0
      const avgWin = wins > 0 ? pointsArr.filter(p => p > 0).reduce((s, p) => s + p, 0) / wins : 0
      const avgLoss = losses > 0 ? Math.abs(pointsArr.filter(p => p < 0).reduce((s, p) => s + p, 0) / losses) : 0
      const payoff = avgLoss > 0 ? avgWin / avgLoss : 0
      return { code, ops, points: d.points, brl: d.brl, hitRate, payoff }
    })
  }, [filtered])

  // complementares
  const complements = useMemo(() => {
    const wins = filtered.filter(t => (t.resultado_brl || 0) > 0)
    const losses = filtered.filter(t => (t.resultado_brl || 0) < 0)
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.resultado_brl || 0), 0) / wins.length : 0
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.resultado_brl || 0), 0) / losses.length) : 0
    const rrRatio = avgLoss > 0 ? avgWin / avgLoss : 0
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length || 1) : 0
    return { avgWin, avgLoss, rrRatio, profitFactor }
  }, [filtered])

  // streak de dias consecutivos positivos
  const streak = useMemo(() => {
    const byDate = {}
    filtered.forEach(t => { byDate[t.date] = (byDate[t.date] || 0) + (t.resultado_brl || 0) })
    const days = Object.keys(byDate).sort().reverse()
    let count = 0
    for (const d of days) { if (byDate[d] > 0) count++; else break }
    return count
  }, [filtered])

  const initial = (profile?.name?.[0] || 'M').toUpperCase()
  const rank = profile?.current_badge

  return (
    <div style={{ maxWidth: 1280, position: 'relative', zIndex: 1 }}>
      {/* HEADER */}
      <div className="ink-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : `linear-gradient(135deg, ${GREEN}, ${CYAN})`,
            color: '#07080A', fontSize: 20, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 0 0 1px ${LINE}, 0 8px 24px rgba(24,209,138,0.15)`,
          }}>{!profile?.avatar_url && initial}</div>
          <div>
            <div style={{
              fontFamily: 'var(--ink-font-serif)',
              fontSize: 32, fontWeight: 400, letterSpacing: '-0.01em',
              color: TEXT, lineHeight: 1.1,
            }}>
              {profile?.name || 'Mentorado'}
            </div>
            <div style={{ fontSize: 11, color: DIM, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Portfólio de Performance
            </div>
          </div>
        </div>
        {rank && (
          <div style={{ padding: 4 }}>
            <RankBadge rank={rank} size="md" glow />
          </div>
        )}
      </div>

      {/* FILTROS */}
      <div className="ink-fade-up" style={{ marginBottom: 22, position: 'relative', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: TEXT, marginBottom: 3 }}>Evolução</div>
            <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.04em' }}>Performance do trader</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
            {activeFilterCount(period, asset) > 0 && (
              <button onClick={() => { setPeriod('all'); setAsset('all'); setCustomRange({ from: '', to: '' }) }}
                style={{ fontSize: 11, color: DIM, padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                limpar
              </button>
            )}
            <button onClick={() => setFiltersOpen(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 6,
                background: filtersOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: '1px solid var(--ink-line)',
                color: 'var(--ink-text)',
                fontSize: 11.5, cursor: 'pointer',
                transition: 'background .12s ease, border-color .12s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--ink-line-strong)' }}
              onMouseLeave={e => { if (!filtersOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--ink-line)' } }}>
              <span style={{ opacity: 0.7 }}>⚙</span>
              filtros
              {activeFilterCount(period, asset) > 0 && (
                <span style={{
                  padding: '0 6px', borderRadius: 99, fontSize: 10,
                  background: 'var(--ink-green)', color: '#07080A', fontWeight: 700,
                }}>{activeFilterCount(period, asset)}</span>
              )}
            </button>

            {filtersOpen && (
              <>
                <div onClick={() => setFiltersOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  zIndex: 100, minWidth: 440,
                  padding: 14, borderRadius: 10,
                  background: 'linear-gradient(180deg, rgba(20,24,29,0.98), rgba(14,16,19,0.98))',
                  border: '1px solid var(--ink-line-strong)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  animation: 'ink-fade-up .15s ease-out both',
                }}>
                  <FilterRow label="período" options={PERIODS} value={period} onChange={(id) => { setPeriod(id); setCustomRange({ from: '', to: '' }) }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 68, marginTop: 2 }}>
                    <DateField value={customRange.from} onChange={v => { setCustomRange(r => ({ ...r, from: v })); setPeriod('custom') }} placeholder="de" />
                    <span style={{ color: DIM, fontSize: 11 }}>→</span>
                    <DateField value={customRange.to} onChange={v => { setCustomRange(r => ({ ...r, to: v })); setPeriod('custom') }} placeholder="até" />
                  </div>
                  <FilterRow label="ativo" options={ASSETS} value={asset} onChange={setAsset} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <MetricCard
          label="RESULTADO TOTAL"
          value={fmtBRL(metrics.totalBrl, { sign: true })}
          accent={metrics.totalBrl >= 0 ? GREEN : RED}
          sparkData={equity.map(e => e.value)}
          sparkColor={metrics.totalBrl >= 0 ? GREEN : RED}
        />
        <WinRateCard winRate={metrics.winRate} wins={metrics.winCount} losses={metrics.lossCount} total={metrics.total} />
        <DaysCard days={metrics.daysOperated} streak={streak} />
        <MetricCard
          label="MAX DRAWDOWN"
          value={metrics.maxDD < 0 ? `−R$ ${Math.abs(metrics.maxDD).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'R$ 0'}
          accent={metrics.maxDD < 0 ? RED : MUTED}
          sub={
            metrics.maxDDPeak > 0
              ? `${metrics.maxDDPct.toFixed(1)}% do pico`
              : metrics.maxDD < 0
                ? 'ainda sem pico positivo'
                : ''
          }
        />
      </div>

      {/* CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 14, marginBottom: 28 }}>
        <EquityCard data={equity} />
        <DailyCard data={daily} />
      </div>

      {/* STRATEGY METRICS */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 14, color: TEXT, fontWeight: 500 }}>Métricas por Estratégia</div>
        <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.06em' }}>CLIQUE PRA FILTRAR</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        {bySetup.map(s => <StrategyCard key={s.code} stats={s} active={setup === s.code} onClick={() => setSetup(setup === s.code ? 'all' : s.code)} />)}
      </div>

      {/* COMPLEMENTARES */}
      <div style={{ marginBottom: 12, fontSize: 14, color: TEXT, fontWeight: 500 }}>Métricas Complementares</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <ComplementCard label="MÉDIA VENCEDORA" sub="por trade" value={fmtBRL(complements.avgWin)} color={GREEN} />
        <ComplementCard label="MÉDIA PERDEDORA" sub="por trade" value={fmtBRL(complements.avgLoss)} color={RED} />
        <ComplementCard label="RISCO X RETORNO" sub="razão média" value={`${complements.rrRatio.toFixed(2)}:1`} color={CYAN} />
        <ComplementCard label="PROFIT FACTOR" sub="ganho / perda total" value={complements.profitFactor.toFixed(2)} color={GOLD} />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 40, color: DIM, fontSize: 12 }}>
          carregando…
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTES ─────────────────────────────────────────────────────

function activeFilterCount(period, asset) {
  let n = 0
  if (period !== 'all') n++
  if (asset !== 'all') n++
  return n
}

function DateField({ value, onChange, placeholder }) {
  const [focus, setFocus] = useState(false)
  const ref = useRef(null)
  const display = value
    ? new Date(value + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '')
    : null
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px',
      borderRadius: 6,
      border: `1px solid ${focus ? 'rgba(24,209,138,0.4)' : 'var(--ink-line)'}`,
      background: focus ? 'rgba(24,209,138,0.04)' : 'rgba(255,255,255,0.02)',
      cursor: 'pointer',
      transition: 'border-color .15s ease, background .15s ease',
      minWidth: 110,
    }}
    onClick={() => ref.current?.showPicker?.()}
    onMouseEnter={e => { if (!focus) e.currentTarget.style.borderColor = 'var(--ink-line-strong)' }}
    onMouseLeave={e => { if (!focus) e.currentTarget.style.borderColor = 'var(--ink-line)' }}
    >
      <span style={{ fontSize: 11, opacity: 0.7 }}>📅</span>
      <span style={{
        fontSize: 11.5,
        color: value ? 'var(--ink-text)' : 'var(--ink-dim)',
        fontFamily: value ? 'JetBrains Mono, monospace' : 'inherit',
        letterSpacing: value ? 0.3 : 0,
        fontWeight: value ? 500 : 400,
      }}>
        {display || placeholder}
      </span>
      {value && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange('') }}
          style={{ padding: 0, background: 'transparent', border: 'none', color: 'var(--ink-dim)', fontSize: 11, cursor: 'pointer', marginLeft: 2 }}
          title="limpar"
        >✕</button>
      )}
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0, height: 0,
        }}
      />
    </label>
  )
}

function FilterRow({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        fontSize: 10, color: 'var(--ink-dim)',
        fontWeight: 400, width: 58, flexShrink: 0,
      }}>{label}</div>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {options.map(o => {
          const active = value === o.id
          return (
            <button key={o.id} onClick={() => onChange(o.id)}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: 'none',
                background: active ? 'rgba(24,209,138,0.12)' : 'transparent',
                color: active ? 'var(--ink-green)' : 'var(--ink-muted)',
                fontSize: 11,
                fontFamily: "'Inter', sans-serif",
                fontWeight: active ? 500 : 400,
                cursor: 'pointer',
                transition: 'background .1s ease, color .1s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--ink-text)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--ink-muted)' }}>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, accent = TEXT, sparkData, sparkColor }) {
  return (
    <div className="ink-card ink-fade-up" style={{ padding: 18, minHeight: 120, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="ink-label">{label}</div>
      <div className="ink-num ink-fade-up" style={{ fontSize: 26, fontWeight: 500, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', gap: 8 }}>
        <div style={{ fontSize: 11, color: MUTED, fontFamily: 'JetBrains Mono, monospace' }}>{sub || ''}</div>
        {sparkData && sparkData.length > 1 && (
          <Sparkline data={sparkData} width={96} height={28} color={sparkColor || accent} />
        )}
      </div>
    </div>
  )
}

function Sparkline({ data, width = 80, height = 24, color = GREEN, fill = true }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 3 - ((v - min) / range) * (height - 6),
  ])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const areaD = d + ` L ${pts[pts.length - 1][0]} ${height} L ${pts[0][0]} ${height} Z`
  const gradId = `spark-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={areaD} fill={`url(#${gradId})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WinRateCard({ winRate, wins, losses, total }) {
  const pct = Math.round(winRate)
  const circ = 2 * Math.PI * 24
  const off = circ - (pct / 100) * circ
  const color = pct >= 60 ? GREEN : pct >= 50 ? GOLD : RED
  return (
    <div className="ink-card ink-fade-up" style={{ padding: 18, minHeight: 120, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="ink-label">WIN RATE</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div className="ink-num" style={{ fontSize: 26, fontWeight: 500, color, lineHeight: 1 }}>
            {winRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10.5, color: DIM, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            taxa de acerto
          </div>
        </div>
        <svg width={56} height={56}>
          <circle cx={28} cy={28} r={24} stroke="rgba(255,255,255,0.08)" strokeWidth={4} fill="none" />
          <circle cx={28} cy={28} r={24} stroke={color} strokeWidth={4} fill="none"
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset 600ms ease' }} />
        </svg>
      </div>
      <div style={{ marginTop: 'auto', fontSize: 10.5, color: MUTED, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.03em' }}>
        <span style={{ color: GREEN }}>{wins}</span>
        <span style={{ margin: '0 7px', opacity: 0.4 }}>·</span>
        <span style={{ color: RED }}>{losses}</span>
        <span style={{ margin: '0 7px', opacity: 0.4 }}>·</span>
        <span>{total}</span>
      </div>
    </div>
  )
}

function DaysCard({ days, streak }) {
  return (
    <div className="ink-card ink-fade-up" style={{ padding: 18, minHeight: 120, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="ink-label">DIAS OPERADOS</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div className="ink-num" style={{ fontSize: 26, fontWeight: 500, color: CYAN, lineHeight: 1 }}>
          {days}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 7px)', gap: 3 }}>
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: i < days ? `${CYAN}` : 'rgba(255,255,255,0.08)',
              opacity: i < days ? 0.3 + (i / days) * 0.7 : 1,
            }} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 'auto', fontSize: 10.5, color: MUTED, fontFamily: 'JetBrains Mono, monospace' }}>
        {streak > 0 ? (
          <span><span style={{ color: GREEN }}>🔥 {streak}</span> dia{streak > 1 ? 's' : ''} no verde</span>
        ) : 'sem streak'}
      </div>
    </div>
  )
}

function niceTicks(min, max, target = 5) {
  const range = max - min
  if (range === 0) return [min]
  const rough = range / target
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const normalized = rough / mag
  const step = (normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10) * mag
  const start = Math.floor(min / step) * step
  const ticks = []
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(v)
  return ticks
}

function fmtAxis(v) {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}R$${Math.round(abs / 1000)}k`
  return `${sign}R$${Math.round(abs)}`
}

function EquityCard({ data }) {
  const [hover, setHover] = useState(null)
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 480, h: 260 })

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: 260 })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const pad = { l: 50, r: 12, t: 20, b: 30 }
  if (data.length < 2) {
    return (
      <div className="ink-card" style={{ padding: 20, minHeight: 280 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 16 }}>Curva de Capital</div>
        <div style={{ fontSize: 12, color: DIM, textAlign: 'center', padding: 40 }}>sem dados suficientes</div>
      </div>
    )
  }

  const ys = data.map(d => d.value)
  const minRaw = Math.min(0, ...ys), maxRaw = Math.max(0, ...ys)
  const ticks = niceTicks(minRaw, maxRaw, 5)
  const minY = Math.min(...ticks), maxY = Math.max(...ticks)
  const w = size.w - pad.l - pad.r, h = size.h - pad.t - pad.b
  const yScale = v => pad.t + h - ((v - minY) / (maxY - minY || 1)) * h
  const pts = data.map((d, i) => [
    pad.l + (i / (data.length - 1)) * w,
    yScale(d.value),
  ])

  // segmenta a linha: verde quando >=0, vermelho quando <0
  // gera segmentos cruzando zero com interpolação
  const baseY = yScale(0)
  const segments = []
  let current = { pts: [pts[0]], positive: data[0].value >= 0 }
  for (let i = 1; i < data.length; i++) {
    const prevVal = data[i-1].value, curVal = data[i].value
    const prevPos = prevVal >= 0, curPos = curVal >= 0
    if (prevPos === curPos) {
      current.pts.push(pts[i])
    } else {
      // cross — interpola ponto em y=0
      const t = prevVal / (prevVal - curVal)
      const crossX = pts[i-1][0] + (pts[i][0] - pts[i-1][0]) * t
      const crossPt = [crossX, baseY]
      current.pts.push(crossPt)
      segments.push(current)
      current = { pts: [crossPt, pts[i]], positive: curPos }
    }
  }
  segments.push(current)

  const pathD = (segPts) => segPts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const areaD = (segPts) => pathD(segPts) + ` L ${segPts[segPts.length - 1][0]} ${baseY} L ${segPts[0][0]} ${baseY} Z`

  // drawdown max
  let peak = data[0].value, lowIdx = 0, maxDD = 0
  data.forEach((d, i) => {
    if (d.value > peak) peak = d.value
    const dd = peak - d.value
    if (dd > maxDD) { maxDD = dd; lowIdx = i }
  })
  const lowPt = pts[lowIdx]
  const lastPt = pts[pts.length - 1]
  const lastPositive = data[data.length - 1].value >= 0
  const endColor = lastPositive ? GREEN : RED

  function onMove(e) {
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    // frac = posição contínua ao longo dos data points (0..N-1)
    const frac = Math.max(0, Math.min(data.length - 1, ((x - pad.l) / w) * (data.length - 1)))
    const i0 = Math.floor(frac), i1 = Math.min(data.length - 1, i0 + 1)
    const t = frac - i0
    // valor interpolado
    const v = data[i0].value + (data[i1].value - data[i0].value) * t
    const dayPnl = data[i0].dayPnl + (data[i1].dayPnl - data[i0].dayPnl) * t
    const iSnap = t < 0.5 ? i0 : i1 // pra data/label
    const xx = pts[i0][0] + (pts[i1][0] - pts[i0][0]) * t
    const yy = yScale(v)
    setHover({ i: iSnap, x: xx, y: yy, value: v, dayPnl })
  }

  return (
    <div className="ink-card ink-fade-up" style={{ padding: 18, position: 'relative' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 12 }}>Curva de Capital</div>
      <svg ref={ref} width="100%" height={size.h} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: 'block', cursor: 'crosshair' }}>
        <defs>
          <linearGradient id="eq-fill-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.28" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="eq-fill-r" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={RED} stopOpacity="0.28" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* linhas de referência + labels */}
        {ticks.map((t, i) => {
          const y = yScale(t)
          const isZero = t === 0
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + w} y2={y}
                stroke={isZero ? 'rgba(255,255,255,0.18)' : LINE}
                strokeDasharray={isZero ? '3 4' : '1 5'} />
              <text x={pad.l - 8} y={y + 3.5} textAnchor="end"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: isZero ? MUTED : DIM }}>
                {fmtAxis(t)}
              </text>
            </g>
          )
        })}

        {/* áreas + linhas segmentadas */}
        {segments.map((seg, i) => (
          <g key={i} style={{ filter: `drop-shadow(0 0 6px ${seg.positive ? GREEN : RED}99) drop-shadow(0 0 14px ${seg.positive ? GREEN : RED}40)` }}>
            <path className="ink-area-fade" d={areaD(seg.pts)} fill={seg.positive ? 'url(#eq-fill-g)' : 'url(#eq-fill-r)'} />
            <path className="ink-line-draw" pathLength="1" d={pathD(seg.pts)} fill="none"
              stroke={seg.positive ? GREEN : RED}
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}

        {/* drawdown marker */}
        {maxDD > 0 && (
          <g transform={`translate(${lowPt[0]}, ${lowPt[1]})`}>
            <circle r="3.5" fill={RED} />
            <circle r="10" fill={RED} opacity="0.3" className="ink-dot-pulse" />
          </g>
        )}

        {/* end glow */}
        <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill={endColor} />
        <circle cx={lastPt[0]} cy={lastPt[1]} r="12" fill={endColor} opacity="0.3" className="ink-dot-pulse" />

        {/* datas eixo X */}
        {(() => {
          const labels = []
          const step = Math.max(1, Math.floor(data.length / 6))
          for (let i = 0; i < data.length; i += step) {
            const [x] = pts[i]
            const d = new Date(data[i].date + 'T12:00')
            labels.push(
              <text key={i} x={x} y={pad.t + h + 18} textAnchor="middle"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fill: DIM, letterSpacing: 0.4 }}>
                {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de ', ' ').replace('.', '')}
              </text>
            )
          }
          return labels
        })()}

        {/* hover — crosshair + dot + tooltip com transição suave */}
        <g style={{
          opacity: hover ? 1 : 0,
          transition: 'opacity .12s ease',
          pointerEvents: 'none',
        }}>
          {hover && (
            <>
              <line
                x1={hover.x} y1={pad.t} x2={hover.x} y2={pad.t + h}
                stroke="rgba(255,255,255,0.14)"
                style={{ transition: 'x1 .08s linear, x2 .08s linear' }}
              />
              <circle
                cx={hover.x} cy={hover.y} r="5"
                fill="#07080A" stroke={hover.value >= 0 ? GREEN : RED} strokeWidth="1.4"
                style={{ transition: 'cx .08s linear, cy .12s ease-out' }}
              />
              <g transform={`translate(${Math.min(hover.x + 12, size.w - 172)}, ${Math.max(hover.y - 58, pad.t + 4)})`}
                style={{ transition: 'transform .1s ease-out' }}>
                <rect width="160" height="50" rx="6" fill="rgba(14,16,19,0.96)" stroke="rgba(255,255,255,0.1)" />
                <text x="10" y="15" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fill: DIM, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {new Date(data[hover.i].date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </text>
                <text x="10" y="30" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fill: hover.value >= 0 ? GREEN : RED, fontWeight: 500 }}>
                  {hover.value >= 0 ? '+' : '−'}R$ {Math.abs(hover.value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
                <text x="10" y="43" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: hover.dayPnl >= 0 ? GREEN : RED }}>
                  dia: {hover.dayPnl >= 0 ? '+' : '−'}R$ {Math.abs(hover.dayPnl).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
              </g>
            </>
          )}
        </g>
      </svg>
    </div>
  )
}

function DailyCard({ data }) {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 480, h: 260 })

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: 260 })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  if (data.length === 0) {
    return (
      <div className="ink-card" style={{ padding: 20, minHeight: 280 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 16 }}>Resultado Diário</div>
        <div style={{ fontSize: 12, color: DIM, textAlign: 'center', padding: 40 }}>sem dados</div>
      </div>
    )
  }

  const pad = { l: 50, r: 12, t: 20, b: 30 }
  const vals = data.map(d => d.value)
  const minRaw = Math.min(0, ...vals), maxRaw = Math.max(0, ...vals)
  const ticks = niceTicks(minRaw, maxRaw, 5)
  const minY = Math.min(...ticks), maxY = Math.max(...ticks)
  const w = size.w - pad.l - pad.r, h = size.h - pad.t - pad.b
  const yScale = v => pad.t + h - ((v - minY) / (maxY - minY || 1)) * h
  const baseY = yScale(0)
  const slot = w / data.length
  const barW = Math.max(3, slot * 0.7)

  return (
    <div className="ink-card ink-fade-up" style={{ padding: 18, position: 'relative' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 12 }}>Resultado Diário</div>
      <svg ref={ref} width="100%" height={size.h} style={{ display: 'block' }}>
        {/* ticks */}
        {ticks.map((t, i) => {
          const y = yScale(t)
          const isZero = t === 0
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + w} y2={y}
                stroke={isZero ? 'rgba(255,255,255,0.18)' : LINE}
                strokeDasharray={isZero ? '3 4' : '1 5'} />
              <text x={pad.l - 8} y={y + 3.5} textAnchor="end"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: isZero ? MUTED : DIM }}>
                {fmtAxis(t)}
              </text>
            </g>
          )
        })}

        {/* bars */}
        {data.map((d, i) => {
          const up = d.value >= 0
          const cx = pad.l + slot * (i + 0.5)
          const yVal = yScale(d.value)
          const y = Math.min(yVal, baseY)
          const barH = Math.abs(yVal - baseY)
          return (
            <g key={d.date}
              className="ink-bar-grow"
              style={{
                filter: `drop-shadow(0 0 4px ${up ? GREEN : RED}66) drop-shadow(0 0 10px ${up ? GREEN : RED}30)`,
                transformOrigin: `${cx}px ${baseY}px`,
                animationDelay: `${Math.min(i * 30, 900)}ms`,
              }}>
              <rect x={cx - barW / 2} y={y} width={barW} height={Math.max(barH, 1)}
                fill={up ? GREEN : RED} rx="2" opacity="0.9">
                <title>{`${d.date}: ${up ? '+' : '−'}R$ ${Math.abs(d.value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}</title>
              </rect>
            </g>
          )
        })}

        {/* x-axis labels */}
        {(() => {
          const labels = []
          const step = Math.max(1, Math.floor(data.length / 6))
          for (let i = 0; i < data.length; i += step) {
            const cx = pad.l + slot * (i + 0.5)
            const d = new Date(data[i].date + 'T12:00')
            labels.push(
              <text key={i} x={cx} y={pad.t + h + 18} textAnchor="middle"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fill: DIM, letterSpacing: 0.4 }}>
                {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de ', ' ').replace('.', '')}
              </text>
            )
          }
          return labels
        })()}
      </svg>
    </div>
  )
}

function fmtPts(n) {
  const abs = Math.abs(n)
  const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return (n < 0 ? '−' : n > 0 ? '+' : '') + s
}

function StrategyCard({ stats, active, onClick }) {
  const { code, ops, points, brl, hitRate } = stats
  const pnlColor = points > 0 ? GREEN : points < 0 ? RED : MUTED
  const brlColor = brl > 0 ? GREEN : brl < 0 ? RED : MUTED
  const codeColor = code === 'TA' ? GREEN : code === 'TC' ? CYAN : code === 'TRM' ? VIOLET : GOLD
  const codeWithDot = code === 'TA' ? 'T.A' : code === 'TC' ? 'T.C' : code === 'TRM' ? 'T.M' : 'F.Q'
  const nameMap = {
    TA: 'Trade de Abertura',
    TC: 'Trade de Continuação',
    TRM: 'Retorno às Médias',
    FQ: 'Falha e Quebra',
  }
  const perOp = ops > 0 ? points / ops : 0
  const perOpStr = (perOp >= 0 ? '+' : '−') + Math.round(Math.abs(perOp)).toLocaleString('pt-BR')

  return (
    <button
      onClick={onClick}
      className="ink-card ink-card-interactive ink-fade-up"
      style={{
        padding: 16, textAlign: 'left', color: TEXT,
        display: 'flex', flexDirection: 'column', gap: 10,
        borderColor: active ? 'rgba(111,230,240,0.4)' : undefined,
        background: active ? 'rgba(111,230,240,0.05)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          border: `1px solid ${codeColor}55`,
          background: `${codeColor}15`,
          color: codeColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
        }}>{codeWithDot}</div>
        <span style={{ fontSize: 12.5, color: TEXT, fontWeight: 500 }}>{nameMap[code]}</span>
      </div>
      <div className="ink-num" style={{ fontSize: 20, color: pnlColor, fontWeight: 500, letterSpacing: '-0.02em' }}>
        {fmtPts(points)} <span style={{ fontSize: 10, opacity: 0.55, fontWeight: 400 }}>pts</span>
      </div>
      <div className="ink-num" style={{ fontSize: 13, color: brlColor, opacity: 0.85 }}>
        {fmtBRL(brl, { sign: true })}
      </div>
      <div style={{ fontSize: 10.5, color: MUTED, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div>
          Assertividade <span style={{ color: hitRate >= 60 ? GREEN : hitRate >= 50 ? GOLD : RED, fontWeight: 600 }}>{hitRate}%</span>
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          {ops} op{ops !== 1 ? 's' : ''}
        </div>
        <div style={{ color: perOp >= 0 ? GREEN : RED, opacity: 0.9 }}>
          {perOpStr} /op
        </div>
      </div>
    </button>
  )
}

function ComplementCard({ label, sub, value, color }) {
  return (
    <div className="ink-card ink-fade-up" style={{ padding: 16 }}>
      <div className="ink-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="ink-num" style={{ fontSize: 22, fontWeight: 500, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: DIM, marginTop: 4, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5 }}>
        {sub}
      </div>
    </div>
  )
}
