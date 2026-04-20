import React, { useMemo } from 'react'

// WeekdayHeatmap — performance por dia da semana
export function WeekdayHeatmap({ trades }) {
  const byDow = useMemo(() => {
    const m = [0,0,0,0,0,0,0].map(() => ({ count: 0, result: 0, wins: 0 }))
    trades.forEach(t => {
      if (!t.date) return
      const d = new Date(t.date + 'T12:00:00').getDay()
      m[d].count++
      m[d].result += t.resultado_brl || 0
      if ((t.total_points || 0) > 0) m[d].wins++
    })
    return m
  }, [trades])

  const labels = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
  const maxAbs = Math.max(...byDow.map(d => Math.abs(d.result)), 1)

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
        performance por dia da semana
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {byDow.map((d, i) => {
          const intensity = Math.abs(d.result) / maxAbs
          const up = d.result >= 0
          const bg = d.count === 0
            ? 'var(--surface-2)'
            : up
              ? `rgba(34,197,94,${0.12 + intensity * 0.35})`
              : `rgba(239,68,68,${0.12 + intensity * 0.35})`
          return (
            <div key={i} style={{
              padding: '10px 6px', borderRadius: 6,
              background: bg,
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{labels[i]}</div>
              {d.count > 0 ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: up ? 'var(--up)' : 'var(--down)', fontFamily: 'var(--font-mono)' }}>
                    {up ? '+' : ''}{Math.round(d.result)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{d.count}</div>
                </>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>—</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// MapaOperacional — concentração de risco/resultado por setup
export function MapaOperacional({ trades }) {
  const bySetup = useMemo(() => {
    const m = {}
    trades.forEach(t => {
      const k = t.setup || '—'
      if (!m[k]) m[k] = { count: 0, result: 0, wins: 0, losses: 0 }
      m[k].count++
      m[k].result += t.resultado_brl || 0
      if ((t.total_points || 0) > 0) m[k].wins++
      else if ((t.total_points || 0) < 0) m[k].losses++
    })
    return Object.entries(m).map(([k, v]) => ({ setup: k, ...v }))
      .sort((a, b) => b.result - a.result)
  }, [trades])

  const total = trades.length
  if (total === 0) return null

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
        mapa operacional — concentração por setup
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bySetup.map(s => {
          const pct = (s.count / total) * 100
          const up = s.result >= 0
          return (
            <div key={s.setup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{s.setup}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: up ? 'var(--up)' : 'var(--down)', fontWeight: 500 }}>
                  {up ? '+' : ''}R$ {Math.round(s.result).toLocaleString('pt-BR')}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                <div style={{
                  width: `${pct}%`,
                  background: up ? 'var(--up)' : 'var(--down)',
                  opacity: 0.5 + (Math.abs(s.result) / Math.max(...bySetup.map(x => Math.abs(x.result)), 1)) * 0.5,
                }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                {s.count} trades · {pct.toFixed(1)}% · {s.wins}W/{s.losses}L
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// DiagnosticoPeriodo — % violações de plano, concentração de loss, eficiência
export function DiagnosticoPeriodo({ trades }) {
  const diag = useMemo(() => {
    const total = trades.length
    if (total === 0) return null
    const violations = trades.filter(t => t.followed_plan === false).length
    const forced = trades.filter(t => t.entry_quality === 1).length
    const losses = trades.filter(t => (t.resultado_brl || 0) < 0)
    const lossesSum = Math.abs(losses.reduce((s, t) => s + (t.resultado_brl || 0), 0))
    const wins = trades.filter(t => (t.resultado_brl || 0) > 0)
    const winsSum = wins.reduce((s, t) => s + (t.resultado_brl || 0), 0)
    // top 20% das losses
    const sortedLosses = [...losses].sort((a, b) => (a.resultado_brl || 0) - (b.resultado_brl || 0))
    const top20 = sortedLosses.slice(0, Math.max(1, Math.floor(losses.length * 0.2)))
    const top20Sum = Math.abs(top20.reduce((s, t) => s + (t.resultado_brl || 0), 0))
    const top20Pct = lossesSum > 0 ? (top20Sum / lossesSum) * 100 : 0
    return {
      total,
      violationsPct: (violations / total) * 100,
      forcedPct: (forced / total) * 100,
      lossConcentration: top20Pct,
      efficiency: winsSum + lossesSum > 0 ? (winsSum / (winsSum + lossesSum)) * 100 : 0,
    }
  }, [trades])

  if (!diag) return null

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
        diagnóstico do período
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <DiagRow label="violação do plano" value={`${diag.violationsPct.toFixed(1)}%`} warn={diag.violationsPct > 20} />
        <DiagRow label="entradas forçadas" value={`${diag.forcedPct.toFixed(1)}%`} warn={diag.forcedPct > 20} />
        <DiagRow label="concentração de loss (top 20%)" value={`${diag.lossConcentration.toFixed(1)}%`} warn={diag.lossConcentration > 50} />
        <DiagRow label="eficiência (ganho / (ganho+perda))" value={`${diag.efficiency.toFixed(1)}%`} warn={diag.efficiency < 55} good={diag.efficiency >= 60} />
      </div>
    </div>
  )
}

function DiagRow({ label, value, warn, good }) {
  const color = warn ? 'var(--down)' : good ? 'var(--up)' : 'var(--text-primary)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

// FocoDoPeriodo — baseado em OPERATIONAL_CONFIG, recomenda ajustar/intensificar
export function FocoDoPeriodo({ trades }) {
  const recos = useMemo(() => {
    const bySetup = {}
    trades.forEach(t => {
      const k = t.setup || '—'
      if (!bySetup[k]) bySetup[k] = { trades: [], result: 0 }
      bySetup[k].trades.push(t)
      bySetup[k].result += t.resultado_brl || 0
    })
    const list = Object.entries(bySetup).map(([code, data]) => {
      const count = data.trades.length
      const followed = data.trades.filter(t => t.followed_plan === true).length
      const followedPct = count > 0 ? (followed / count) * 100 : 0
      return { code, count, result: data.result, followedPct }
    })
    const ajustar = list.filter(s => s.count >= 3 && (s.result < 0 || s.followedPct < 60)).slice(0, 3)
    const intensificar = list.filter(s => s.count >= 5 && s.result > 0 && s.followedPct >= 70).slice(0, 3)
    return { ajustar, intensificar }
  }, [trades])

  if (recos.ajustar.length === 0 && recos.intensificar.length === 0) return null

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
        foco do período
      </div>
      {recos.intensificar.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--up)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.1em' }}>▲ INTENSIFICAR</div>
          {recos.intensificar.map(s => (
            <div key={s.code} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{s.code}</strong> — {s.count} trades · plano {s.followedPct.toFixed(0)}% · +R$ {Math.round(s.result)}
            </div>
          ))}
        </div>
      )}
      {recos.ajustar.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--down)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.1em' }}>⚠ AJUSTAR</div>
          {recos.ajustar.map(s => (
            <div key={s.code} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{s.code}</strong> — {s.count} trades · plano {s.followedPct.toFixed(0)}% · R$ {Math.round(s.result)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
