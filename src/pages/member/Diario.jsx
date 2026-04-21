import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  listAccounts, getDefaultAccount, listTrades, deleteTrade,
  getDaySummary, upsertDaySummary,
} from '../../lib/trades'
import { earnByRule } from '../../lib/free'
import { PageTitle, ErrorBox, Loading } from './ui'
import { IPlus, IPencil, IX, ICheck, ICalendar, IArrowLeft, IArrowRight } from '../../components/icons'
import TradeModal from '../../components/TradeModal'
import FinalizarDiaModal from '../../components/FinalizarDiaModal'

function todayIso() { return new Date().toISOString().slice(0, 10) }
function fmtBR(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function Diario() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const urlDate = params.get('date') || todayIso()

  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [trades, setTrades] = useState([])
  const [daySummary, setDaySummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [showFinalizarModal, setShowFinalizarModal] = useState(false)
  const [finalizarDidNotTrade, setFinalizarDidNotTrade] = useState(false)

  async function reload(accId = accountId, date = urlDate) {
    if (!accId) return
    const [ts, sum] = await Promise.all([
      listTrades({ accountId: accId, from: date, to: date }),
      getDaySummary(date, accId),
    ])
    setTrades(ts)
    setDaySummary(sum)
  }

  useEffect(() => {
    (async () => {
      try {
        const accs = await listAccounts()
        setAccounts(accs)
        const def = accs.find(a => a.is_default) || accs[0]
        if (def) {
          setAccountId(def.id)
          await reload(def.id, urlDate)
        }
      } catch (e) { setErr(e.message) } finally { setLoading(false) }
    })()
  }, [])

  useEffect(() => {
    if (accountId) reload(accountId, urlDate)
  }, [urlDate, accountId])

  function changeDate(iso) {
    setParams(prev => { const p = new URLSearchParams(prev); p.set('date', iso); return p })
  }

  function shiftDate(days) {
    const d = new Date(urlDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    changeDate(d.toISOString().slice(0, 10))
  }

  async function onDelete(id) {
    if (!confirm('apagar trade?')) return
    try { await deleteTrade(id); await reload() } catch (e) { alert(e.message) }
  }

  async function onFinalize(didNotTrade) {
    try {
      await upsertDaySummary({
        date: urlDate,
        account_id: accountId,
        did_not_trade: didNotTrade,
        is_finalized: true,
      })
      if (!daySummary?.is_finalized) {
        earnByRule('day_finalized', `finalizou dia ${urlDate}`).catch(() => {})
      }
      await reload()
    } catch (e) { alert(e.message) }
  }

  const total = useMemo(() => trades.reduce((a, t) => a + Number(t.resultado_brl || 0), 0), [trades])
  const wins = trades.filter(t => Number(t.resultado_brl) > 0).length

  if (loading) return <Loading />
  if (err) return <ErrorBox>erro: {err} — rode <code>0008_trades.sql</code> se ainda não rodou.</ErrorBox>

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageTitle eyebrow="OPERACIONAL">diário de trade</PageTitle>
        <button onClick={() => setShowTradeModal(true)} className="btn btn-primary">
          <IPlus size={12} stroke={2} /> registrar trade
        </button>
      </div>

      {/* Date + account controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {accounts.length > 1 && (
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            style={{ padding: '7px 10px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12 }}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <button onClick={() => shiftDate(-1)} className="btn btn-ghost" style={{ padding: 6 }}><IArrowLeft size={14} stroke={1.8} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ICalendar size={14} stroke={1.6} style={{ color: 'var(--amber)' }} />
          <input type="date" value={urlDate} onChange={e => changeDate(e.target.value)}
            style={{ padding: '6px 10px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtBR(urlDate)}</span>
        </div>
        <button onClick={() => shiftDate(1)} className="btn btn-ghost" style={{ padding: 6 }}><IArrowRight size={14} stroke={1.8} /></button>
        <div style={{ flex: 1 }} />
        {trades.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>{trades.length} trade{trades.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{wins}W / {trades.length - wins}L</span>
            <span>·</span>
            <span style={{ color: total >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 500 }}>
              {total >= 0 ? '+' : ''}R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Lista ou empty */}
      {trades.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', border: '1px dashed var(--border-strong)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
            Nenhum trade registrado em {fmtBR(urlDate)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
            registrar um trade vale <strong style={{ color: 'var(--amber)' }}>+3 SC</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {!daySummary?.did_not_trade && (
              <button onClick={() => { setFinalizarDidNotTrade(true); setShowFinalizarModal(true) }} className="btn">não cliquei hoje</button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {trades.map((t, i) => (
            <TradeRow key={t.id} trade={t} n={i + 1} onDelete={() => onDelete(t.id)} />
          ))}
        </div>
      )}

      {/* Finalizar dia (se tem trades e ainda não finalizou) */}
      {trades.length > 0 && !daySummary?.is_finalized && (
        <div style={{ marginTop: 20, padding: 16, background: 'var(--amber-dim)', border: '1px solid var(--amber-dim-25)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>finalize o dia</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              preencher o resumo diário vale <strong style={{ color: 'var(--amber)' }}>+5 SC</strong>
            </div>
          </div>
          <button onClick={() => setShowFinalizarModal(true)} className="btn btn-primary">
            <ICheck size={12} stroke={2} /> finalizar dia
          </button>
        </div>
      )}

      {daySummary?.is_finalized && (
        <div style={{ marginTop: 20, padding: 12, background: 'color-mix(in srgb, var(--up) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--up) 30%, transparent)', borderRadius: 6, fontSize: 12, color: 'var(--up)' }}>
          ✓ dia finalizado {daySummary.did_not_trade && '(não operou)'}
        </div>
      )}

      <TradeModal
        open={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        onSaved={async () => {
          setShowTradeModal(false)
          await reload()
        }}
        defaultDate={urlDate}
      />
      <FinalizarDiaModal
        open={showFinalizarModal}
        onClose={() => { setShowFinalizarModal(false); setFinalizarDidNotTrade(false) }}
        onSaved={async () => {
          setShowFinalizarModal(false)
          setFinalizarDidNotTrade(false)
          await reload()
        }}
        date={urlDate}
        initialDidNotTrade={finalizarDidNotTrade}
      />
    </div>
  )
}

function TradeRow({ trade: t, n, onDelete }) {
  const pos = Number(t.resultado_brl) > 0
  const neg = Number(t.resultado_brl) < 0
  return (
    <div className="card" style={{
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', width: 20 }}>#{n}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {t.horario_entrada} → {t.horario_saida}
        </span>
      </div>
      <span className="pill" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>{t.ativo}</span>
      <span className="pill pill-amber" style={{ fontSize: 10 }}>{t.setup}</span>
      <span className={t.direction === 'compra' ? 'pill pill-up' : 'pill pill-down'} style={{ fontSize: 10 }}>
        {t.direction === 'compra' ? '▲' : '▼'} {t.direction}
      </span>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {t.contratos_iniciais}c · {Number(t.media_ponderada || 0).toFixed(1)}pts
      </div>
      <div style={{ flex: 1 }} />
      <div style={{
        fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500, minWidth: 100, textAlign: 'right',
        color: pos ? 'var(--up)' : neg ? 'var(--down)' : 'var(--text-primary)',
      }}>
        {pos ? '+' : ''}R$ {Number(t.resultado_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <Link to={`/app/trade/${t.id}`} className="btn btn-ghost" style={{ padding: 6 }} title="editar">
        <IPencil size={12} stroke={1.8} />
      </Link>
      <button onClick={onDelete} className="btn btn-ghost" style={{ padding: 6, color: 'var(--text-muted)' }} title="apagar">
        <IX size={12} stroke={1.8} />
      </button>
    </div>
  )
}
