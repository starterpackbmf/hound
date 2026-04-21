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
    if (period !== 'all') {
      const daysBack = PERIODS.find(p => p.id === period)?.days
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - daysBack)
      const iso = cutoff.toISOString().slice(0, 10)
      list = list.filter(t => t.date >= iso)
    }
    if (setup !== 'all') list = list.filter(t => t.setup === setup)
    if (asset !== 'all') list = list.filter(t => (t.ativo || '').toUpperCase() === asset)
    return list
  }, [trades, period, setup, asset])

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
    const maxDDPct = peak > 0 ? Math.abs(maxDD / peak) * 100 : 0
    return { totalBrl, winRate, winCount: wins, lossCount: losses, total: filtered.length, daysOperated, maxDD, maxDDPct }
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
  const bySetup = useMemo(() => {
    const m = {}
    ;['TA', 'TC', 'TRM', 'FQ'].forEach(k => { m[k] = { trades: [], points: 0, brl: 0 } })
    filtered.forEach(t => {
      if (!m[t.setup]) return
      m[t.setup].trades.push(t)
      m[t.setup].points += t.total_points || 0
      m[t.setup].brl += t.resultado_brl || 0
    })
    return Object.entries(m).map(([code, d]) => {
      const ops = d.trades.length
      const wins = d.trades.filter(t => (t.total_points || 0) > 0).length
      const hitRate = ops > 0 ? Math.round((wins / ops) * 100) : 0
      const losses = d.trades.filter(t => (t.total_points || 0) < 0).length
      const avgWin = wins > 0 ? d.trades.filter(t => (t.total_points || 0) > 0).reduce((s, t) => s + t.total_points, 0) / wins : 0
      const avgLoss = losses > 0 ? Math.abs(d.trades.filter(t => (t.total_points || 0) < 0).reduce((s, t) => s + t.total_points, 0) / losses) : 0
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
    <div style={{ padding: '32px 40px 64px', maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
      <div className="ink-fade-up" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: TEXT, marginBottom: 3 }}>Evolução</div>
          <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.04em' }}>Performance do trader</div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterGroup options={PERIODS} value={period} onChange={setPeriod} />
          <FilterGroup options={SETUPS} value={setup} onChange={setSetup} />
          <FilterGroup options={ASSETS} value={asset} onChange={setAsset} />
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
          sub={`${metrics.maxDDPct.toFixed(1)}% do pico`}
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

function FilterGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {options.map(o => {
        const active = value === o.id
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            className={'ink-chip' + (active ? ' active' : '')}>
            {o.label}
          </button>
        )
      })}
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

  const pad = { l: 8, r: 8, t: 30, b: 30 }
  if (data.length < 2) {
    return (
      <div className="ink-card" style={{ padding: 20, minHeight: 280 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 16 }}>Curva de Capital</div>
        <div style={{ fontSize: 12, color: DIM, textAlign: 'center', padding: 40 }}>sem dados suficientes</div>
      </div>
    )
  }

  const ys = data.map(d => d.value)
  const minY = Math.min(0, ...ys), maxY = Math.max(...ys)
  const w = size.w - pad.l - pad.r, h = size.h - pad.t - pad.b
  const pts = data.map((d, i) => [
    pad.l + (i / (data.length - 1)) * w,
    pad.t + h - ((d.value - minY) / (maxY - minY || 1)) * h,
  ])
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const areaD = path + ` L ${pts[pts.length - 1][0]} ${pad.t + h} L ${pts[0][0]} ${pad.t + h} Z`

  // drawdown max
  let peak = data[0].value, lowIdx = 0, maxDD = 0
  data.forEach((d, i) => {
    if (d.value > peak) peak = d.value
    const dd = peak - d.value
    if (dd > maxDD) { maxDD = dd; lowIdx = i }
  })
  const lowPt = pts[lowIdx]
  const lastPt = pts[pts.length - 1]

  const baseY = pad.t + h - ((0 - minY) / (maxY - minY || 1)) * h

  function onMove(e) {
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const i = Math.max(0, Math.min(data.length - 1, Math.round(((x - pad.l) / w) * (data.length - 1))))
    setHover({ i, x: pts[i][0], y: pts[i][1] })
  }

  return (
    <div className="ink-card ink-fade-up" style={{ padding: 18, position: 'relative' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 12 }}>Curva de Capital</div>
      <svg ref={ref} width="100%" height={size.h} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: 'block', cursor: 'crosshair' }}>
        <defs>
          <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.28" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line key={i} x1={pad.l} y1={pad.t + h * f} x2={pad.l + w} y2={pad.t + h * f} stroke={LINE} strokeDasharray="1 5" />
        ))}
        {/* baseline 0 */}
        <line x1={pad.l} y1={baseY} x2={pad.l + w} y2={baseY} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 4" />
        <text x={pad.l + 4} y={baseY - 5} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fill: DIM, letterSpacing: 0.5 }}>
          INÍCIO
        </text>

        <path d={areaD} fill="url(#eq-fill)" />
        <path d={path} fill="none" stroke={GREEN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

        {/* drawdown marker */}
        {maxDD > 0 && (
          <g transform={`translate(${lowPt[0]}, ${lowPt[1]})`}>
            <circle r="3.5" fill={RED} />
            <circle r="10" fill={RED} opacity="0.3" className="ink-dot-pulse" />
          </g>
        )}

        {/* end glow */}
        <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill={GREEN} />
        <circle cx={lastPt[0]} cy={lastPt[1]} r="12" fill={GREEN} opacity="0.3" className="ink-dot-pulse" />

        {/* hover */}
        {hover && (
          <g>
            <line x1={hover.x} y1={pad.t} x2={hover.x} y2={pad.t + h} stroke="rgba(255,255,255,0.16)" />
            <circle cx={hover.x} cy={hover.y} r="4" fill="#07080A" stroke={GREEN} strokeWidth="1.4" />
            <g transform={`translate(${Math.min(hover.x + 10, size.w - 170)}, ${Math.max(hover.y - 56, pad.t + 4)})`}>
              <rect width="160" height="50" rx="6" fill="rgba(14,16,19,0.94)" stroke="rgba(255,255,255,0.1)" />
              <text x="10" y="15" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fill: DIM, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                {new Date(data[hover.i].date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </text>
              <text x="10" y="30" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fill: TEXT, fontWeight: 500 }}>
                R$ {data[hover.i].value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </text>
              <text x="10" y="43" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: data[hover.i].dayPnl >= 0 ? GREEN : RED }}>
                {data[hover.i].dayPnl >= 0 ? '+' : '−'}R$ {Math.abs(data[hover.i].dayPnl).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}

function DailyCard({ data }) {
  if (data.length === 0) {
    return (
      <div className="ink-card" style={{ padding: 20, minHeight: 280 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 16 }}>Resultado Diário</div>
        <div style={{ fontSize: 12, color: DIM, textAlign: 'center', padding: 40 }}>sem dados</div>
      </div>
    )
  }
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 1)
  return (
    <div className="ink-card ink-fade-up" style={{ padding: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 12 }}>Resultado Diário</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 232, justifyContent: 'flex-end' }}>
        {data.map(d => {
          const heightPct = Math.abs(d.value) / maxAbs
          const up = d.value >= 0
          return (
            <div key={d.date} style={{
              flex: 1,
              height: `${Math.max(heightPct * 90, 2)}%`,
              background: up ? GREEN : RED,
              borderRadius: 2,
              minWidth: 4,
              opacity: 0.85,
              transition: 'opacity .15s ease',
            }}
            title={`${d.date}: ${d.value >= 0 ? '+' : '−'}R$ ${Math.abs(d.value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9, color: DIM, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5 }}>
        <span>{new Date(data[0].date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
        <span>HOJE</span>
      </div>
    </div>
  )
}

function StrategyCard({ stats, active, onClick }) {
  const { code, ops, points, brl, hitRate, payoff } = stats
  const pnlColor = brl > 0 ? GREEN : brl < 0 ? RED : MUTED
  const codeColor = code === 'TA' ? GREEN : code === 'TC' ? CYAN : code === 'TRM' ? VIOLET : GOLD
  const codeWithDot = code === 'TA' ? 'T.A' : code === 'TC' ? 'T.C' : code === 'TRM' ? 'T.M' : 'F.Q'
  const nameMap = {
    TA: 'Trade de Abertura',
    TC: 'Trade de Continuação',
    TRM: 'Retorno às Médias',
    FQ: 'Falha e Quebra',
  }

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
        {points >= 0 ? '+' : '−'}{Math.abs(points).toFixed(0)} <span style={{ fontSize: 10, opacity: 0.55, fontWeight: 400 }}>pts</span>
      </div>
      <div className="ink-num" style={{ fontSize: 13, color: pnlColor, opacity: 0.85 }}>
        {fmtBRL(brl, { sign: true })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: MUTED, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>
        <span>{ops} ops</span>
        <span>WR <span style={{ color: hitRate >= 60 ? GREEN : hitRate >= 50 ? GOLD : RED, fontWeight: 600 }}>{hitRate}%</span></span>
        <span>P <span style={{ color: TEXT }}>{payoff.toFixed(2)}</span></span>
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
