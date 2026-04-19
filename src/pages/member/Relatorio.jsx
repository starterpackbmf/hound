import React, { useEffect, useState } from 'react'
import { matilha } from '../../lib/matilha'
import { PageTitle, ErrorBox, Loading } from './ui'
import { RANKS } from '../../components/RankBadge'

const PERIODS = [
  { id: '7d',  label: '7 dias',   days: 7 },
  { id: '30d', label: '30 dias',  days: 30 },
  { id: '90d', label: '90 dias',  days: 90 },
]

function range(id) {
  const p = PERIODS.find(x => x.id === id)
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

export default function Relatorio() {
  const [period, setPeriod] = useState('30d')
  const [summary, setSummary] = useState(null)
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
        const { from, to } = range(period)
        const rows = await fetchAll(active, { from, to, onProgress: (d, t) => !cancel && setProgress({ done: d, total: t }) })
        if (cancel) return
        const ok = rows.filter(r => r.summary && r.summary.total_trades > 0)
        setSummary({
          total_active: active.length,
          operating: ok.length,
          trades: ok.reduce((a, r) => a + r.summary.total_trades, 0),
          result: ok.reduce((a, r) => a + (r.summary.total_result_brl || 0), 0),
          avg_win_rate: ok.length ? ok.reduce((a, r) => a + (r.summary.win_rate || 0), 0) / ok.length : 0,
          avg_plan: ok.length ? ok.reduce((a, r) => a + (r.summary.followed_plan_rate || 0), 0) / ok.length : 0,
          profitable: ok.filter(r => r.summary.total_result_brl > 0).length,
          top_results: [...ok].sort((a, b) => b.summary.total_result_brl - a.summary.total_result_brl).slice(0, 5)
            .map(r => ({ badge: r.student.current_badge || 'primeiro', result: r.summary.total_result_brl })),
        })
      } catch (e) { if (!cancel) setErr(e.message) } finally { if (!cancel) setLoading(false) }
    })()
    return () => { cancel = true }
  }, [period])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1040 }}>
      <PageTitle eyebrow="COMUNIDADE" sub="veja como a matilha está operando. dados agregados e anônimos.">
        relatório da comunidade
      </PageTitle>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} className={period === p.id ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer' }}>
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

      {err ? <ErrorBox>{err}</ErrorBox>
       : !summary ? <Loading />
       : (
        <>
          <section>
            <div style={{ marginBottom: 10 }}>
              <span className="label-muted">visão geral</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              <MiniStat label="ATIVOS" value={summary.total_active} />
              <MiniStat label="OPERANDO" value={summary.operating} />
              <MiniStat label="TRADES" value={summary.trades.toLocaleString('pt-BR')} />
              <MiniStat label="RESULTADO" value={`R$ ${summary.result.toLocaleString('pt-BR')}`} color={summary.result >= 0 ? 'var(--up)' : 'var(--down)'} />
              <MiniStat label="% LUCRO" value={`${summary.operating ? Math.round((summary.profitable / summary.operating) * 100) : 0}%`} />
              <MiniStat label="WIN MÉDIO" value={`${summary.avg_win_rate.toFixed(1)}%`} />
              <MiniStat label="PLANO MÉDIO" value={`${summary.avg_plan.toFixed(1)}%`} />
            </div>
          </section>

          <section>
            <div style={{ marginBottom: 10 }}>
              <span className="label-muted">top 5 resultados (anônimo)</span>
            </div>
            <div className="card" style={{ padding: 4 }}>
              {summary.top_results.map((r, i) => {
                const medal = ['🥇','🥈','🥉'][i]
                const rankColor = (RANKS[r.badge] || RANKS.primeiro).color
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  }}>
                    <span style={{
                      width: 22, display: 'inline-flex', justifyContent: 'center',
                      fontSize: medal ? 14 : 10,
                      color: 'var(--text-muted)',
                      fontFamily: medal ? 'inherit' : 'var(--font-mono)',
                    }}>
                      {medal || `${i + 1}º`}
                    </span>
                    <span style={{ fontSize: 12, flex: 1, color: 'var(--text-secondary)' }}>mentorado</span>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: rankColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--up)', fontFamily: 'var(--font-mono)', minWidth: 100, textAlign: 'right' }}>
                      R$ {r.result.toLocaleString('pt-BR')}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--amber-dim)' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: 'var(--amber-dim-25)', color: 'var(--amber)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>💡</div>
            <div style={{ flex: 1, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--amber)' }}>quer entrar no ranking?</strong> mentorados registram trades no diário diariamente. vira mentorado pra ter acesso ao sistema completo.
            </div>
          </div>
        </>
      )}
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
