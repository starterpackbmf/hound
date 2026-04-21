import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAccounts, listTrades, getDefaultAccount } from '../../lib/trades'
import { PageTitle, ErrorBox, Loading } from './ui'
import { IArrowLeft, IArrowRight, ICalendar } from '../../components/icons'
import { WeekdayHeatmap, MapaOperacional, DiagnosticoPeriodo, FocoDoPeriodo } from '../../components/HistoryInsights'

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

export default function Historico() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [filter, setFilter] = useState('todos')
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    listAccounts().then(accs => {
      setAccounts(accs)
      const def = accs.find(a => a.is_default) || accs[0]
      if (def) setAccountId(def.id)
    }).catch(e => setErr(e.message))
  }, [])

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    const from = monthDate.toISOString().slice(0, 10)
    const toDate = new Date(monthDate)
    toDate.setMonth(toDate.getMonth() + 1)
    toDate.setDate(0)
    const to = toDate.toISOString().slice(0, 10)
    listTrades({ accountId, from, to })
      .then(setTrades)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [accountId, monthDate])

  // Filter by asset
  const filteredTrades = useMemo(() => {
    if (filter === 'todos') return trades
    return trades.filter(t => (t.ativo || '').toUpperCase().startsWith(filter))
  }, [trades, filter])

  // Group by date
  const byDate = useMemo(() => {
    const m = {}
    filteredTrades.forEach(t => {
      m[t.date] = m[t.date] || []
      m[t.date].push(t)
    })
    return m
  }, [filteredTrades])

  // Month aggregate
  const agg = useMemo(() => {
    const total = filteredTrades.length
    const wins = filteredTrades.filter(t => Number(t.resultado_brl) > 0).length
    const losses = filteredTrades.filter(t => Number(t.resultado_brl) < 0).length
    const pts = filteredTrades.reduce((a, t) => a + Number(t.media_ponderada || 0) * Number(t.contratos_iniciais || 0), 0)
    const days = Object.keys(byDate).length
    return { total, wins, losses, pts, days }
  }, [filteredTrades, byDate])

  // Build calendar grid for the month
  const grid = useMemo(() => {
    const first = new Date(monthDate)
    const firstDow = first.getDay() // 0=dom
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = new Date(first.getFullYear(), first.getMonth(), d).toISOString().slice(0, 10)
      cells.push({ day: d, iso })
    }
    return cells
  }, [monthDate])

  function shiftMonth(n) {
    const d = new Date(monthDate)
    d.setMonth(d.getMonth() + n)
    setMonthDate(d)
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <PageTitle eyebrow="OPERACIONAL" sub="calendário mensal dos seus trades.">histórico</PageTitle>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {accounts.length > 1 && (
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            style={{ padding: '7px 10px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12 }}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          {['todos', 'WIN', 'WDO'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={filter === f ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer' }}>
              {f.toLowerCase()}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => shiftMonth(-1)} className="btn btn-ghost" style={{ padding: 6 }}><IArrowLeft size={14} stroke={1.8} /></button>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', minWidth: 140, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          {MESES[monthDate.getMonth()]} {monthDate.getFullYear()}
        </div>
        <button onClick={() => shiftMonth(1)} className="btn btn-ghost" style={{ padding: 6 }}><IArrowRight size={14} stroke={1.8} /></button>
      </div>

      {/* Aggregate */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 20 }}>
        <AggStat label="TRADES" value={agg.total} />
        <AggStat label="W / L" value={`${agg.wins}W / ${agg.losses}L`} />
        <AggStat label="PTS" value={agg.pts.toFixed(1)} color={agg.pts >= 0 ? 'var(--up)' : 'var(--down)'} />
        <AggStat label="DIAS OPERADOS" value={agg.days} />
      </div>

      {err ? <ErrorBox>{err}</ErrorBox>
       : loading ? <Loading />
       : (
        <div className="card" style={{ padding: 16 }}>
          {/* weekday header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {DIAS.map(d => (
              <div key={d} style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: 4 }}>
                {d}
              </div>
            ))}
          </div>
          {/* grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {grid.map((cell, i) => {
              if (!cell) return <div key={i} />
              const dayTrades = byDate[cell.iso] || []
              const dayResult = dayTrades.reduce((a, t) => a + Number(t.resultado_brl || 0), 0)
              const hasAny = dayTrades.length > 0
              return (
                <Link
                  key={i}
                  to={`/app/diario?date=${cell.iso}`}
                  style={{
                    aspectRatio: '1',
                    padding: 6,
                    background: hasAny ? (dayResult >= 0 ? 'color-mix(in srgb, var(--up) 10%, transparent)' : 'color-mix(in srgb, var(--down) 10%, transparent)') : 'var(--surface-2)',
                    border: '1px solid ' + (hasAny ? (dayResult >= 0 ? 'color-mix(in srgb, var(--up) 35%, transparent)' : 'color-mix(in srgb, var(--down) 35%, transparent)') : 'var(--border)'),
                    borderRadius: 6,
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    color: 'var(--text-primary)', fontSize: 11,
                    transition: 'all 150ms',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {cell.day}
                  </div>
                  {hasAny && (
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {dayTrades.length}T
                      </div>
                      <div style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 500,
                        color: dayResult >= 0 ? 'var(--up)' : 'var(--down)',
                      }}>
                        {dayResult >= 0 ? '+' : ''}{Math.round(dayResult)}
                      </div>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Insights do período */}
      {!loading && filteredTrades.length > 0 && (
        <div style={{ marginTop: 24, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <WeekdayHeatmap trades={filteredTrades} />
          <DiagnosticoPeriodo trades={filteredTrades} />
          <MapaOperacional trades={filteredTrades} />
          <FocoDoPeriodo trades={filteredTrades} />
        </div>
      )}
    </div>
  )
}

function AggStat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '10px 12px' }}>
      <div className="label-muted" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}
