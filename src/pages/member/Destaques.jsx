import React, { useEffect, useState } from 'react'
import { matilha } from '../../lib/matilha'
import { PageTitle, ErrorBox } from './ui'
import { RANKS } from '../../components/RankBadge'

const PERIODS = [
  { id: '7d',  label: '7 dias',     days: 7 },
  { id: '30d', label: '30 dias',    days: 30 },
  { id: 'all', label: 'histórico',  days: null },
]

function range(id) {
  const p = PERIODS.find(x => x.id === id)
  if (!p?.days) return {}
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - p.days)
  const iso = d => d.toISOString().slice(0, 10)
  return { from: iso(from), to: iso(to) }
}

async function fetchAll(students, { from, to, batchSize = 15, onProgress } = {}) {
  const out = []
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize)
    const res = await Promise.all(batch.map(s =>
      matilha.summary(s.id, from, to).catch(() => null).then(sum => ({ student: s, summary: sum }))
    ))
    out.push(...res)
    onProgress?.(out.length, students.length)
  }
  return out
}

export default function Destaques() {
  const [period, setPeriod] = useState('30d')
  const [rows, setRows] = useState([])
  const [totalActive, setTotalActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true); setErr(null)
      try {
        const r = await matilha.students()
        if (cancel) return
        const active = (r.students || []).filter(s => s.status === 'ativo')
        setTotalActive(active.length)
        const { from, to } = range(period)
        const data = await fetchAll(active, { from, to, onProgress: (d, t) => !cancel && setProgress({ done: d, total: t }) })
        if (cancel) return
        const ok = data.filter(d => d.summary && d.summary.total_trades > 0).map(d => ({
          id: d.student.id,
          name: d.student.name.trim(),
          rank: d.student.current_badge || 'primeiro',
          total_trades: d.summary.total_trades,
          win_rate: d.summary.win_rate || 0,
          result: d.summary.total_result_brl || 0,
          followed_plan: d.summary.followed_plan_rate || 0,
          days: d.summary.days_operated || 0,
        }))
        setRows(ok)
      } catch (e) { if (!cancel) setErr(e.message) } finally { if (!cancel) setLoading(false) }
    })()
    return () => { cancel = true }
  }, [period])

  const agg = {
    operating: rows.length,
    trades: rows.reduce((a, r) => a + r.total_trades, 0),
    result: rows.reduce((a, r) => a + r.result, 0),
    avg_win: rows.length ? rows.reduce((a, r) => a + r.win_rate, 0) / rows.length : 0,
    avg_plan: rows.length ? rows.reduce((a, r) => a + r.followed_plan, 0) / rows.length : 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1040 }}>
      <PageTitle eyebrow="A MATILHA" sub="ranking dos mentorados que postaram resultados no diário. atualizado em tempo real.">
        destaques
      </PageTitle>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={period === p.id ? 'pill pill-active' : 'pill'}
            style={{ cursor: 'pointer', fontSize: 11 }}
          >
            {p.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {loading && progress.total > 0 && (
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            calculando… {progress.done}/{progress.total}
          </span>
        )}
      </div>

      {err && <ErrorBox>{err}</ErrorBox>}

      {/* Agregado */}
      <section>
        <div style={{ marginBottom: 10 }}>
          <span className="label-muted">agregado da matilha</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          <MiniStat label="ATIVOS" value={totalActive} />
          <MiniStat label="OPERANDO" value={agg.operating} />
          <MiniStat label="TRADES" value={agg.trades.toLocaleString('pt-BR')} />
          <MiniStat label="RESULTADO" value={`R$ ${agg.result.toLocaleString('pt-BR')}`} color={agg.result >= 0 ? 'var(--up)' : 'var(--down)'} />
          <MiniStat label="WIN MÉDIO" value={`${agg.avg_win.toFixed(1)}%`} />
          <MiniStat label="PLANO MÉDIO" value={`${agg.avg_plan.toFixed(1)}%`} />
        </div>
      </section>

      {/* Rankings */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        <Ranking
          icon="▲" color="var(--up)" title="maior resultado"
          data={[...rows].sort((a, b) => b.result - a.result).slice(0, 10).map(r => ({ ...r, value: `R$ ${r.result.toLocaleString('pt-BR')}` }))}
        />
        <Ranking
          icon="◎" color="var(--amber)" title="maior win rate"
          data={[...rows].filter(r => r.total_trades >= 5).sort((a, b) => b.win_rate - a.win_rate).slice(0, 10).map(r => ({ ...r, value: `${r.win_rate.toFixed(1)}%` }))}
        />
        <Ranking
          icon="✦" color="#a855f7" title="mais consistente"
          data={[...rows].sort((a, b) => b.days - a.days).slice(0, 10).map(r => ({ ...r, value: `${r.days} dias` }))}
        />
        <Ranking
          icon="◆" color="var(--info)" title="mais seguiu o plano"
          data={[...rows].filter(r => r.total_trades >= 5).sort((a, b) => b.followed_plan - a.followed_plan).slice(0, 10).map(r => ({ ...r, value: `${r.followed_plan.toFixed(1)}%` }))}
        />
      </section>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '11px 13px' }}>
      <div className="label-muted" style={{ fontSize: 9, marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: 15, fontWeight: 500,
        color: color || 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '-0.01em',
      }}>{value}</div>
    </div>
  )
}

function Ranking({ icon, color, title, data }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 5,
          background: `${color}18`, color,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600,
        }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>top 10</span>
      </div>
      {data.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 0' }}>sem dados pra esse período</div>
      ) : data.map((row, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
        const rankColor = (RANKS[row.rank] || RANKS.primeiro).color
        return (
          <div key={row.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 2px',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          }}>
            <span style={{
              width: 22, display: 'inline-flex', justifyContent: 'center',
              fontSize: medal ? 13 : 10,
              color: 'var(--text-muted)',
              fontFamily: medal ? 'inherit' : 'var(--font-mono)',
            }}>
              {medal || `${i + 1}º`}
            </span>
            <span style={{ fontSize: 12, flex: 1, color: 'var(--text-primary)' }}>
              {row.name}
            </span>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: rankColor, flexShrink: 0 }} />
            <span style={{
              fontSize: 12, fontFamily: 'var(--font-mono)',
              color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: i === 0 ? 500 : 400,
              minWidth: 90, textAlign: 'right',
            }}>
              {row.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
