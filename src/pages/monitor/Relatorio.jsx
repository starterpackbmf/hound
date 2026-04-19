import React, { useEffect, useMemo, useState } from 'react'
import { matilha } from '../../lib/matilha'
import { PageTitle, ErrorBox, Loading } from '../member/ui'

const PERIODS = [
  { id: '7d',  label: '7 dias',   days: 7  },
  { id: '30d', label: '30 dias',  days: 30 },
  { id: '90d', label: '90 dias',  days: 90 },
  { id: 'all', label: 'histórico', days: null },
]

function range(id) {
  const p = PERIODS.find(x => x.id === id)
  if (!p.days) return {}
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - p.days)
  return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) }
}

async function fetchAll(students, { from, to, onProgress } = {}) {
  const out = []
  const batchSize = 15
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

export default function MonitorRelatorio() {
  const [period, setPeriod] = useState('30d')
  const [rows, setRows] = useState([])
  const [totalActive, setTotalActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [err, setErr] = useState(null)
  const [hideNames, setHideNames] = useState(false)

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
        const enriched = data.filter(d => d.summary && d.summary.total_trades > 0).map(d => ({
          id: d.student.id,
          name: d.student.name.trim(),
          rank: d.student.current_badge,
          total_trades: d.summary.total_trades,
          win_rate: d.summary.win_rate || 0,
          result: d.summary.total_result_brl || 0,
          plan: d.summary.followed_plan_rate || 0,
          rr: d.summary.risk_reward || 0,
        }))
        setRows(enriched)
      } catch (e) { if (!cancel) setErr(e.message) } finally { if (!cancel) setLoading(false) }
    })()
    return () => { cancel = true }
  }, [period])

  const agg = useMemo(() => {
    const operating = rows.length
    const positive = rows.filter(r => r.result > 0).length
    const negative = rows.filter(r => r.result < 0).length
    const totalResult = rows.reduce((a, r) => a + r.result, 0)
    const avgResult = operating ? totalResult / operating : 0
    const totalTrades = rows.reduce((a, r) => a + r.total_trades, 0)
    const avgWin = operating ? rows.reduce((a, r) => a + r.win_rate, 0) / operating : 0
    const avgPlan = operating ? rows.reduce((a, r) => a + r.plan, 0) / operating : 0
    const disciplined = rows.filter(r => r.plan > 80).length
    const pctPositive = operating ? Math.round((positive / operating) * 100) : 0
    return {
      operating, positive, negative, totalResult, avgResult, totalTrades,
      avgWin, avgPlan, disciplined, pctPositive,
    }
  }, [rows])

  const top5 = [...rows].sort((a, b) => b.result - a.result).slice(0, 5)
  const bottom5 = [...rows].sort((a, b) => a.result - b.result).slice(0, 5).reverse()

  const anon = name => hideNames ? '••••••' : name

  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="ÁREA DO MONITOR" sub="visão consolidada da turma — decisão do mentor.">
        relatório da turma
      </PageTitle>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={period === p.id ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer' }}>
            {p.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setHideNames(v => !v)} className="btn btn-ghost" style={{ fontSize: 11 }}>
          {hideNames ? 'mostrar nomes' : 'ocultar nomes'}
        </button>
        {loading && progress.total > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {progress.done}/{progress.total}
          </span>
        )}
      </div>

      {err && <ErrorBox>{err}</ErrorBox>}

      {!err && !loading && (
        <>
          {/* Resultado */}
          <section style={{ marginBottom: 28 }}>
            <div className="label-muted" style={{ marginBottom: 10 }}>resultado da turma</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              <Stat label="ATIVOS" value={totalActive} />
              <Stat label="OPERANDO" value={agg.operating} />
              <Stat label="% POSITIVOS" value={`${agg.pctPositive}%`} color={agg.pctPositive >= 50 ? 'var(--up)' : 'var(--down)'} />
              <Stat label="RESULTADO" value={`R$ ${agg.totalResult.toLocaleString('pt-BR')}`} color={agg.totalResult >= 0 ? 'var(--up)' : 'var(--down)'} />
              <Stat label="MÉDIA/ALUNO" value={`R$ ${Math.round(agg.avgResult).toLocaleString('pt-BR')}`} color={agg.avgResult >= 0 ? 'var(--up)' : 'var(--down)'} />
              <Stat label="TRADES" value={agg.totalTrades.toLocaleString('pt-BR')} />
              <Stat label="WIN MÉDIO" value={`${agg.avgWin.toFixed(1)}%`} />
              <Stat label="PLANO MÉDIO" value={`${agg.avgPlan.toFixed(1)}%`} />
            </div>
          </section>

          {/* Top 5 e bottom 5 */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 28 }}>
            <RankingCard title="🏆 top 5 melhores" data={top5} anon={anon} positive />
            <RankingCard title="⚠️ top 5 piores" data={bottom5} anon={anon} />
          </section>

          {/* Disciplina */}
          <section style={{ marginBottom: 28 }}>
            <div className="label-muted" style={{ marginBottom: 10 }}>disciplina</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <Stat label="SEGUIRAM O PLANO" value={`${agg.avgPlan.toFixed(0)}%`} sub="média da turma" />
              <Stat label="DISCIPLINADOS (>80%)" value={`${agg.disciplined}`} sub={`de ${agg.operating}`} />
              <Stat label="POSITIVOS" value={agg.positive} />
              <Stat label="NEGATIVOS" value={agg.negative} color="var(--down)" />
            </div>
          </section>
        </>
      )}

      {loading && <Loading label="consolidando relatório..." />}
    </div>
  )
}

function Stat({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div className="label-muted" style={{ fontSize: 9.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 500, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function RankingCard({ title, data, anon, positive }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12 }}>{title}</div>
      {data.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>sem dados no período</div>
      ) : data.map((r, i) => (
        <div key={r.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 0', fontSize: 12,
          borderTop: i === 0 ? 'none' : '1px solid var(--border)',
        }}>
          <span style={{ width: 22, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {i + 1}º
          </span>
          <span style={{ flex: 1, color: 'var(--text-primary)' }}>{anon(r.name)}</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 500,
            color: r.result >= 0 ? 'var(--up)' : 'var(--down)',
          }}>
            {r.result >= 0 ? '+' : ''}R$ {r.result.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}
