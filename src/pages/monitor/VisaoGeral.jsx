import React, { useEffect, useMemo, useState } from 'react'
import { matilha } from '../../lib/matilha'
import RankBadge, { computeRank } from '../../components/RankBadge'
import { PageTitle, ErrorBox, Loading } from '../member/ui'
import { IUsers, ITarget, ITrendingUp, ITrendingDown } from '../../components/icons'

const PERIODS = [
  { id: '7d',  label: '7d',  days: 7  },
  { id: '14d', label: '14d', days: 14 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
]

function range(id) {
  const p = PERIODS.find(x => x.id === id)
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

// Classifica aluno em "crítico / atenção / estável / consistente / inativo"
function classify(r) {
  if (!r.summary || r.summary.total_trades === 0) return 'inativo'
  const result = r.summary.total_result_brl || 0
  const plan = r.summary.followed_plan_rate || 0
  if (result < -500 || plan < 50) return 'critico'
  if (plan < 75) return 'atencao'
  if (result > 0 && plan >= 85) return 'consistente'
  return 'estavel'
}

const STATUS_META = {
  critico:     { label: 'CRÍTICO',     color: '#ef4444' },
  atencao:     { label: 'ATENÇÃO',     color: '#ec4899' },
  estavel:     { label: 'ESTÁVEL',     color: '#00d9ff' },
  consistente: { label: 'CONSISTENTE', color: '#22c55e' },
  inativo:     { label: 'INATIVO',     color: '#71717a' },
}

export default function VisaoGeral() {
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [err, setErr] = useState(null)
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true); setErr(null)
      try {
        const r = await matilha.students()
        if (cancel) return
        const active = (r.students || []).filter(s => s.status === 'ativo')
        const { from, to } = range(period)
        const data = await fetchAll(active, { from, to, onProgress: (d, t) => !cancel && setProgress({ done: d, total: t }) })
        if (cancel) return
        const enriched = data.map(d => ({
          id: d.student.id,
          name: d.student.name.trim(),
          rank: d.student.current_badge || 'primeiro_instinto',
          summary: d.summary,
          status: classify(d),
          total_trades: d.summary?.total_trades || 0,
          result: d.summary?.total_result_brl || 0,
          plan_rate: d.summary?.followed_plan_rate || 0,
          win_rate: d.summary?.win_rate || 0,
          days: d.summary?.days_operated || 0,
        }))
        setRows(enriched)
      } catch (e) { if (!cancel) setErr(e.message) } finally { if (!cancel) setLoading(false) }
    })()
    return () => { cancel = true }
  }, [period])

  const agg = useMemo(() => ({
    criticos:     rows.filter(r => r.status === 'critico').length,
    atencao:      rows.filter(r => r.status === 'atencao').length,
    estaveis:     rows.filter(r => r.status === 'estavel').length,
    consistentes: rows.filter(r => r.status === 'consistente').length,
    inativos:     rows.filter(r => r.status === 'inativo').length,
    total:        rows.length,
  }), [rows])

  const priority = useMemo(() =>
    [...rows]
      .filter(r => r.status === 'critico' || r.status === 'atencao')
      .sort((a, b) => {
        // pior primeiro
        if (a.status !== b.status) return a.status === 'critico' ? -1 : 1
        return a.result - b.result
      })
      .slice(0, 10)
  , [rows])

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageTitle eyebrow="ÁREA DO MONITOR" sub="decisão rápida — priorize quem precisa de intervenção hoje.">
        painel de comando
      </PageTitle>

      {/* Filtro de período */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={period === p.id ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer' }}>
            {p.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {loading && progress.total > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {progress.done}/{progress.total}
          </span>
        )}
      </div>

      {err && <ErrorBox>{err}</ErrorBox>}

      {!err && !loading && (
        <>
          {/* Agregado da turma */}
          <section style={{ marginBottom: 28 }}>
            <div className="label-muted" style={{ marginBottom: 10 }}>visão da turma</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {Object.entries(STATUS_META).map(([key, m]) => (
                <MiniCard key={key} label={m.label} value={agg[
                  key === 'critico' ? 'criticos' :
                  key === 'atencao' ? 'atencao' :
                  key === 'estavel' ? 'estaveis' :
                  key === 'consistente' ? 'consistentes' : 'inativos'
                ]} color={m.color} />
              ))}
            </div>
          </section>

          {/* Prioridade de intervenção */}
          <section style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="label-muted">🚨 prioridade de intervenção</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {priority.length} aluno{priority.length !== 1 ? 's' : ''} críticos/atenção
              </span>
            </div>
            {priority.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>
                ✅ ninguém em alerta no período
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {priority.map(r => <PriorityRow key={r.id} row={r} />)}
              </div>
            )}
          </section>

          {/* Lista completa */}
          <section>
            <div className="label-muted" style={{ marginBottom: 10 }}>todos os alunos ({rows.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {rows
                .sort((a, b) => b.result - a.result)
                .map(r => <StudentRow key={r.id} row={r} />)}
            </div>
          </section>
        </>
      )}

      {loading && <Loading label="calculando métricas..." />}
    </div>
  )
}

function MiniCard({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '10px 12px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.12em', color, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}

function PriorityRow({ row: r }) {
  const meta = STATUS_META[r.status]
  return (
    <div className="card" style={{
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderLeft: `3px solid ${meta.color}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</span>
          <RankBadge rank={r.rank} size="xs" />
          <span style={{ fontSize: 9, color: meta.color, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em' }}>
            {meta.label}
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {r.total_trades} trades · disciplina {r.plan_rate.toFixed(0)}% · {r.days} dias
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500,
          color: r.result >= 0 ? 'var(--up)' : 'var(--down)',
        }}>
          {r.result >= 0 ? '+' : ''}R$ {r.result.toLocaleString('pt-BR')}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {r.win_rate.toFixed(0)}% WR
        </div>
      </div>
    </div>
  )
}

function StudentRow({ row: r }) {
  const meta = STATUS_META[r.status]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 10px',
      background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 5,
      fontSize: 12,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: meta.color, flexShrink: 0 }} />
      <span style={{ flex: 1, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {r.name}
      </span>
      <RankBadge rank={r.rank} size="xs" />
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>
        {r.total_trades}T
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 50, textAlign: 'right' }}>
        {r.plan_rate.toFixed(0)}%
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)', minWidth: 100, textAlign: 'right',
        color: r.result > 0 ? 'var(--up)' : r.result < 0 ? 'var(--down)' : 'var(--text-muted)',
      }}>
        {r.result > 0 ? '+' : ''}R$ {r.result.toLocaleString('pt-BR')}
      </span>
    </div>
  )
}
