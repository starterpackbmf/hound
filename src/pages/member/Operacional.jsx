import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { OPERATIONAL_CONFIG } from '../../lib/tradeCalculations'
import { PageTitle, Placeholder, ErrorBox, Loading } from './ui'

const ASSET_FILTERS = ['all', 'WIN', 'WDO']

export default function Operacional() {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [assetFilter, setAssetFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    supabase.from('trades').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(1000)
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        else setTrades(data || [])
      })
      .then(() => setLoading(false))
  }, [user])

  const filtered = useMemo(() => {
    if (assetFilter === 'all') return trades
    return trades.filter(t => (t.ativo || '').toUpperCase() === assetFilter)
  }, [trades, assetFilter])

  const setupStats = useMemo(() => {
    return Object.keys(OPERATIONAL_CONFIG).map(code => {
      const list = filtered.filter(t => t.setup === code)
      if (list.length === 0) {
        return { code, name: OPERATIONAL_CONFIG[code].name, count: 0, status: 'SEM DADOS' }
      }
      const totalPts = list.reduce((s, t) => s + (t.total_points || 0), 0)
      const totalBrl = list.reduce((s, t) => s + (t.resultado_brl || 0), 0)
      const wins = list.filter(t => (t.total_points || 0) > 0)
      const losses = list.filter(t => (t.total_points || 0) < 0)
      const winRate = list.length > 0 ? (wins.length / list.length) * 100 : 0
      const avgGain = wins.length > 0 ? wins.reduce((s, t) => s + (t.total_points || 0), 0) / wins.length : 0
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.total_points || 0), 0) / losses.length) : 0
      const rr = avgLoss > 0 ? avgGain / avgLoss : 0
      const followed = list.filter(t => t.followed_plan === true).length
      const followedPct = list.length > 0 ? (followed / list.length) * 100 : 0
      const forced = list.filter(t => t.entry_quality === 1).length
      const forcedPct = list.length > 0 ? (forced / list.length) * 100 : 0

      // classification: PRIORIDADE / ATENÇÃO / EVITAR / SEM DADOS
      let status = 'ATENÇÃO'
      if (list.length < 5) status = 'SEM DADOS'
      else if (totalPts > 0 && winRate >= 50 && followedPct >= 70) status = 'PRIORIDADE'
      else if (totalPts < 0 && (forcedPct > 30 || followedPct < 50)) status = 'EVITAR'
      else if (totalPts > 0) status = 'ATENÇÃO'
      else status = 'EVITAR'

      return {
        code, name: OPERATIONAL_CONFIG[code].name,
        count: list.length, totalPts, totalBrl, winRate, rr, followedPct, forcedPct,
        status,
      }
    }).sort((a, b) => (b.totalPts || -Infinity) - (a.totalPts || -Infinity))
  }, [filtered])

  const overall = useMemo(() => {
    const totalPts = filtered.reduce((s, t) => s + (t.total_points || 0), 0)
    const totalBrl = filtered.reduce((s, t) => s + (t.resultado_brl || 0), 0)
    const wins = filtered.filter(t => (t.total_points || 0) > 0).length
    const winRate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0
    const followed = filtered.filter(t => t.followed_plan === true).length
    const followedPct = filtered.length > 0 ? (followed / filtered.length) * 100 : 0
    return { count: filtered.length, totalPts, totalBrl, winRate, followedPct }
  }, [filtered])

  if (loading) return <Loading />

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <PageTitle eyebrow="ANÁLISE" sub="raio-x por setup: qual está dando dinheiro, qual você tá forçando, qual evitar.">
        operacional
      </PageTitle>

      {err && <ErrorBox>{err}</ErrorBox>}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {ASSET_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setAssetFilter(f)}
            className={assetFilter === f ? 'pill pill-active' : 'pill'}
            style={{ cursor: 'pointer' }}
          >
            {f === 'all' ? 'todos' : f}
          </button>
        ))}
      </div>

      {trades.length === 0 ? (
        <Placeholder title="sem trades ainda" subtitle="registre seus primeiros trades pra ver o diagnóstico operacional." />
      ) : (
        <>
          {/* Resumo geral */}
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 24 }}>
            <Stat label="TRADES" value={overall.count} />
            <Stat label="PONTOS" value={`${overall.totalPts >= 0 ? '+' : ''}${overall.totalPts.toFixed(0)}`} color={overall.totalPts >= 0 ? 'var(--up)' : 'var(--down)'} />
            <Stat label="RESULTADO" value={`R$ ${overall.totalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={overall.totalBrl >= 0 ? 'var(--up)' : 'var(--down)'} />
            <Stat label="WIN RATE" value={`${overall.winRate.toFixed(1)}%`} color="var(--cyan)" />
            <Stat label="SEGUIU PLANO" value={`${overall.followedPct.toFixed(1)}%`} color="var(--purple)" />
          </div>

          {/* Breakdown por setup */}
          <div style={{ marginBottom: 14 }}><span className="label-muted">breakdown por setup</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {setupStats.map(s => <SetupCard key={s.code} stats={s} />)}
          </div>

          {/* Recomendação */}
          <div className="card" style={{
            padding: 20, marginTop: 24,
            background: 'rgba(168,85,247,0.06)', borderColor: 'rgba(168,85,247,0.25)',
          }}>
            <div className="label-muted" style={{ color: 'var(--purple)', marginBottom: 10 }}>💡 RECOMENDAÇÃO</div>
            <Recommendation setupStats={setupStats} />
          </div>
        </>
      )}
    </div>
  )
}

function SetupCard({ stats }) {
  const statusColor = {
    'PRIORIDADE': 'var(--up)',
    'ATENÇÃO': 'var(--amber)',
    'EVITAR': 'var(--down)',
    'SEM DADOS': 'var(--text-muted)',
  }[stats.status]

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {stats.code} · <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{stats.name}</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            {stats.count} trades
          </div>
        </div>
        <span className="pill" style={{
          fontSize: 10, color: statusColor, borderColor: statusColor,
          fontWeight: 600,
        }}>
          {stats.status}
        </span>
      </div>
      {stats.count > 0 && (
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
          <MiniStat label="pontos" value={`${stats.totalPts >= 0 ? '+' : ''}${stats.totalPts.toFixed(0)}`} color={stats.totalPts >= 0 ? 'var(--up)' : 'var(--down)'} />
          <MiniStat label="R$" value={`${stats.totalBrl >= 0 ? '+' : ''}${stats.totalBrl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} color={stats.totalBrl >= 0 ? 'var(--up)' : 'var(--down)'} />
          <MiniStat label="win rate" value={`${stats.winRate.toFixed(0)}%`} color="var(--cyan)" />
          <MiniStat label="R/R" value={stats.rr.toFixed(2)} />
          <MiniStat label="no plano" value={`${stats.followedPct.toFixed(0)}%`} color="var(--purple)" />
          <MiniStat label="forçadas" value={`${stats.forcedPct.toFixed(0)}%`} color={stats.forcedPct > 20 ? 'var(--down)' : 'var(--text-muted)'} />
        </div>
      )}
    </div>
  )
}

function Recommendation({ setupStats }) {
  const priority = setupStats.filter(s => s.status === 'PRIORIDADE')
  const avoid = setupStats.filter(s => s.status === 'EVITAR')

  if (priority.length === 0 && avoid.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>precisa de mais dados pra gerar recomendações sólidas. continua registrando trades com rigor.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
      {priority.length > 0 && (
        <div>
          <strong style={{ color: 'var(--up)' }}>intensificar:</strong> {priority.map(s => s.code).join(', ')} — setups que estão performando bem e dentro do plano.
        </div>
      )}
      {avoid.length > 0 && (
        <div>
          <strong style={{ color: 'var(--down)' }}>evitar/ajustar:</strong> {avoid.map(s => s.code).join(', ')} — resultado negativo e muitas entradas forçadas. revise o setup com o monitor.
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '11px 13px' }}>
      <div className="label-muted" style={{ fontSize: 9, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6 }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}
