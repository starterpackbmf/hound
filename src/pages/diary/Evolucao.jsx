import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { getMyProfile } from '../../lib/profile'
import { supabase } from '../../lib/supabase'
import RankBadge from '../../components/RankBadge'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine,
} from 'recharts'

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

const GREEN = '#22c55e'
const RED = '#ef4444'
const PINK = '#ec4899'
const CYAN = '#00d9ff'

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

  // Métricas principais
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

    // Max Drawdown
    const byDate = {}
    filtered.forEach(t => {
      byDate[t.date] = (byDate[t.date] || 0) + (t.resultado_brl || 0)
    })
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

  // Curva de capital
  const capitalCurve = useMemo(() => {
    const byDate = {}
    filtered.forEach(t => {
      byDate[t.date] = (byDate[t.date] || 0) + (t.resultado_brl || 0)
    })
    const days = Object.keys(byDate).sort()
    let cum = 0
    return days.map(d => {
      cum += byDate[d]
      const [y, m, dd] = d.split('-')
      return { date: d, label: `${dd} ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][+m-1]}`, value: Math.round(cum) }
    })
  }, [filtered])

  // Resultado diário
  const dailyResults = useMemo(() => {
    const byDate = {}
    filtered.forEach(t => {
      byDate[t.date] = (byDate[t.date] || 0) + (t.resultado_brl || 0)
    })
    const days = Object.keys(byDate).sort().slice(-25) // últimos 25 dias
    return days.map(d => {
      const [y, m, dd] = d.split('-')
      return { date: d, label: `${dd} ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][+m-1]}`, value: Math.round(byDate[d]) }
    })
  }, [filtered])

  // Métricas por estratégia
  const bySetup = useMemo(() => {
    const m = {}
    ;['TA', 'TC', 'TRM', 'FQ'].forEach(k => {
      m[k] = { trades: [], points: 0, brl: 0 }
    })
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
      const avgPerOp = ops > 0 ? d.points / ops : 0
      return { code, ops, points: d.points, brl: d.brl, hitRate, avgPerOp }
    })
  }, [filtered])

  // Complementares
  const complements = useMemo(() => {
    const wins = filtered.filter(t => (t.resultado_brl || 0) > 0)
    const losses = filtered.filter(t => (t.resultado_brl || 0) < 0)
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.resultado_brl || 0), 0) / wins.length : 0
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.resultado_brl || 0), 0) / losses.length) : 0
    const rrRatio = avgLoss > 0 ? avgWin / avgLoss : 0
    return { avgWin, avgLoss, rrRatio }
  }, [filtered])

  const initial = (profile?.name?.[0] || 'M').toUpperCase()
  const rank = profile?.current_badge

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 1280, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #22c55e, #00d9ff)',
            color: '#0a0a0e', fontSize: 22, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>{!profile?.avatar_url && initial}</div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff' }}>
              {profile?.name || 'Mentorado'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
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

      {/* FILTERS BAR */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 2 }}>Evolução</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Performance do trader</div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterGroup options={PERIODS} value={period} onChange={setPeriod} />
          <FilterGroup options={SETUPS} value={setup} onChange={setSetup} activeColor={PINK} />
          <FilterGroup options={ASSETS} value={asset} onChange={setAsset} activeColor={CYAN} />
        </div>
      </div>

      {/* TOP METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <MetricCard
          icon="📈" label="RESULTADO TOTAL"
          value={`R$ ${metrics.totalBrl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
          valueColor={metrics.totalBrl >= 0 ? GREEN : RED}
        />
        <WinRateCard winRate={metrics.winRate} wins={metrics.winCount} losses={metrics.lossCount} total={metrics.total} />
        <DaysCard days={metrics.daysOperated} />
        <MetricCard
          icon="📉" label="MAX DRAWDOWN"
          value={`-R$ ${Math.abs(metrics.maxDD).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
          valueColor={metrics.maxDD < 0 ? RED : '#fff'}
          sub={`${metrics.maxDDPct.toFixed(1)}% do pico`}
        />
      </div>

      {/* CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14, marginBottom: 28 }}>
        <ChartCard title="Curva de Capital">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={capitalCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} formatter={v => [`R$ ${v.toLocaleString('pt-BR')}`, 'acumulado']} />
              <Line type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: GREEN }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Resultado Diário">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyResults} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} formatter={v => [`R$ ${v.toLocaleString('pt-BR')}`, 'dia']} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
              <Bar dataKey="value" shape={(props) => {
                const { x, y, width, height, payload } = props
                const fill = payload.value >= 0 ? GREEN : RED
                const trueY = payload.value >= 0 ? y : y
                return <rect x={x} y={trueY} width={width} height={Math.abs(height)} fill={fill} rx={2} />
              }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* STRATEGY METRICS */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>Métricas por Estratégia</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Clique para filtrar</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {bySetup.map(s => <StrategyCard key={s.code} stats={s} onClick={() => setSetup(setup === s.code ? 'all' : s.code)} active={setup === s.code} />)}
      </div>

      {/* COMPLEMENTARY */}
      <div style={{ marginBottom: 10, fontSize: 14, color: '#fff', fontWeight: 500 }}>Métricas Complementares</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <ComplementCard icon="📈" label="MÉDIA VENCEDORA" sub="por trade" value={`R$ ${complements.avgWin.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} color={GREEN} />
        <ComplementCard icon="📉" label="MÉDIA PERDEDORA" sub="por trade" value={`R$ ${complements.avgLoss.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} color={RED} />
        <ComplementCard icon="⚖" label="RISCO X RETORNO" sub="razão média" value={`${complements.rrRatio.toFixed(2)}:1`} color={CYAN} />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 40, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          carregando…
        </div>
      )}
    </div>
  )
}

function FilterGroup({ options, value, onChange, activeColor = PINK }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(o => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              padding: '4px 10px', borderRadius: 6,
              background: active ? `${activeColor}22` : 'transparent',
              color: active ? activeColor : 'rgba(255,255,255,0.55)',
              fontSize: 11, fontWeight: active ? 600 : 500,
              border: 'none', cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function MetricCard({ icon, label, value, valueColor = '#fff', sub }) {
  return (
    <div style={{
      padding: 18,
      background: '#0e0e12',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, opacity: 0.7 }}>{icon}</span>
        <span style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: valueColor, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{sub}</div>}
    </div>
  )
}

function WinRateCard({ winRate, wins, losses, total }) {
  const pct = Math.round(winRate)
  const circ = 2 * Math.PI * 28
  const off = circ - (pct / 100) * circ
  const color = pct >= 60 ? GREEN : pct >= 50 ? '#eab308' : RED

  return (
    <div style={{
      padding: 18, background: '#0e0e12', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
      display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>🎯</span>
        <span style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>WIN RATE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
            {winRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            Taxa de acerto
          </div>
        </div>
        <svg width={64} height={64} style={{ marginTop: -4 }}>
          <circle cx={32} cy={32} r={28} stroke="rgba(255,255,255,0.08)" strokeWidth={5} fill="none" />
          <circle cx={32} cy={32} r={28} stroke={color} strokeWidth={5} fill="none"
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 400ms' }} />
        </svg>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
        <span style={{ color: GREEN }}>{wins}</span>
        <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
        <span style={{ color: RED }}>{losses}</span>
        <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
        <span>{total}</span>
      </div>
    </div>
  )
}

function DaysCard({ days }) {
  const grid = Array.from({ length: 25 }, (_, i) => i < days)
  return (
    <div style={{
      padding: 18, background: '#0e0e12', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>📅</span>
        <span style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>DIAS OPERADOS</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: CYAN, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
          {days}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 8px)', gap: 4 }}>
          {grid.map((on, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: on ? CYAN : 'rgba(255,255,255,0.08)',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      padding: 18,
      background: '#0e0e12',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
    }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

function StrategyCard({ stats, onClick, active }) {
  const { code, ops, points, brl, hitRate, avgPerOp } = stats
  const ptsColor = points > 0 ? GREEN : points < 0 ? RED : 'rgba(255,255,255,0.5)'
  const brlColor = brl > 0 ? GREEN : brl < 0 ? RED : 'rgba(255,255,255,0.5)'
  const codeWithDot = code === 'TA' ? 'T.A' : code === 'TC' ? 'T.C' : code === 'FQ' ? 'F.Q' : code

  return (
    <button
      onClick={onClick}
      style={{
        padding: 16,
        background: active ? '#15151b' : '#0e0e12',
        border: `1px solid ${active ? 'rgba(0,217,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 10,
        textAlign: 'left', cursor: 'pointer', color: '#fff',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          padding: '2px 6px', borderRadius: 4,
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace',
        }}>{codeWithDot}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
          {code === 'TA' ? 'Trade de Abertura' : code === 'TC' ? 'Trade de Continuação' : code === 'TRM' ? 'Retorno às Médias' : 'Falha e Quebra'}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: ptsColor, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
          {points > 0 ? '+' : ''}{points.toFixed(1)} <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>pts</span>
        </div>
        <div style={{ fontSize: 12, color: brlColor, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
          {brl > 0 ? '+' : ''}R$ {brl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
        Assertividade <span style={{ color: hitRate >= 60 ? GREEN : hitRate >= 50 ? '#eab308' : RED, fontWeight: 600 }}>{hitRate}%</span>
        <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>
        {ops} ops
        <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>
        <span style={{ color: avgPerOp >= 0 ? GREEN : RED }}>{avgPerOp >= 0 ? '+' : ''}{Math.round(avgPerOp)} /op</span>
      </div>
    </button>
  )
}

function ComplementCard({ icon, label, sub, value, color }) {
  // mini sparkline fake visual
  const bars = Array.from({ length: 10 }, () => 20 + Math.random() * 30)
  return (
    <div style={{
      padding: 16, background: '#0e0e12', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{sub}</div>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
          {value}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ width: 4, height: `${h}%`, background: color, opacity: 0.6, borderRadius: 1 }} />
        ))}
      </div>
    </div>
  )
}
