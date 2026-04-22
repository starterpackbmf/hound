import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { IStar, ICheck, IX, IArrowRight } from '../../components/icons'

const STATUS_META = {
  pendente:  { label: 'PENDENTE', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  entregue:  { label: 'ENTREGUE', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)' },
  cancelado: { label: 'CANCELADO', color: '#71717a', bg: 'rgba(113,113,122,0.1)', border: 'rgba(113,113,122,0.3)' },
}

export default function Resgates() {
  const [tab, setTab] = useState('pendente')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true); setErr(null)
    try {
      const { data, error } = await supabase
        .from('redemption_requests')
        .select('id, user_id, item_id, cost_coins, status, shipping_info, delivered_at, notes, created_at, profiles(id, name, email, avatar_url), packstore_items(id, name, emoji, image_url)')
        .eq('status', tab)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id, status, notes = null) {
    try {
      const patch = { status, updated_at: new Date().toISOString() }
      if (status === 'entregue') {
        const { data: { user } } = await supabase.auth.getUser()
        patch.delivered_at = new Date().toISOString()
        patch.delivered_by = user?.id
      }
      if (notes != null) patch.notes = notes
      const { error } = await supabase.from('redemption_requests').update(patch).eq('id', id)
      if (error) throw error
      await load()
    } catch (e) {
      alert('Falha: ' + e.message)
    }
  }

  const counts = rows.length

  return (
    <div style={{ maxWidth: 960 }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', color: 'var(--amber)', fontWeight: 600, marginBottom: 4 }}>
          PACK STORE
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
          Resgates
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
          Pedidos de resgate da Pack Store. Aprove entregas físicas e marque como entregue quando o item for enviado.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_META).map(([key, m]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 11.5, cursor: 'pointer',
              background: tab === key ? m.bg : 'var(--surface-2)',
              border: `1px solid ${tab === key ? m.border : 'var(--border)'}`,
              color: tab === key ? m.color : 'var(--text-secondary)',
              fontWeight: tab === key ? 600 : 450,
              letterSpacing: '0.06em',
            }}
          >
            {m.label}
            {tab === key && <span style={{ marginLeft: 6, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{counts}</span>}
          </button>
        ))}
      </div>

      {err && <Alert tone="red">{err}</Alert>}
      {loading ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <EmptyState status={tab} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(r => <ResgateRow key={r.id} row={r} onAction={updateStatus} currentStatus={tab} />)}
        </div>
      )}
    </div>
  )
}

function ResgateRow({ row, onAction, currentStatus }) {
  const p = row.profiles
  const item = row.packstore_items
  const createdAt = new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const deliveredAt = row.delivered_at ? new Date(row.delivered_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short' }) : null
  const initial = (p?.name?.[0] || '?').toUpperCase()

  return (
    <div style={{
      padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start',
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 10,
    }}>
      {/* Item icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 10, flexShrink: 0,
        background: item?.image_url ? `url(${item.image_url}) center/cover` : 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>
        {!item?.image_url && (item?.emoji || '🎁')}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
            {item?.name || '(item removido)'}
          </div>
          <span className="pill" style={{
            fontSize: 9, color: 'var(--amber)', borderColor: 'rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.08)', fontWeight: 700,
          }}>
            <IStar size={9} stroke={2} /> {row.cost_coins} SC
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: p?.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, #a855f7, #ec4899)',
            color: '#0a0a0e', fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{!p?.avatar_url && initial}</div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{p?.name || p?.email || 'aluno'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>· pedido em {createdAt}</span>
        </div>
        {row.shipping_info && typeof row.shipping_info === 'object' && Object.keys(row.shipping_info).length > 0 && (
          <div style={{
            fontSize: 11, padding: '8px 10px', borderRadius: 6,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', marginBottom: 6,
            fontFamily: 'var(--font-mono)',
          }}>
            {Object.entries(row.shipping_info).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: 'var(--text-muted)' }}>{k}:</span> {String(v)}
              </div>
            ))}
          </div>
        )}
        {row.notes && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{row.notes}"</div>
        )}
        {deliveredAt && (
          <div style={{ fontSize: 10.5, color: 'var(--green)', marginTop: 4 }}>
            ✓ entregue em {deliveredAt}
          </div>
        )}
      </div>

      {currentStatus === 'pendente' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onAction(row.id, 'entregue')}
            className="btn btn-primary"
            style={{ fontSize: 11, padding: '6px 12px' }}
          >
            <ICheck size={11} stroke={2.2} /> marcar entregue
          </button>
          <button
            onClick={() => {
              const n = prompt('Motivo do cancelamento (opcional):')
              if (n !== null) onAction(row.id, 'cancelado', n)
            }}
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '6px 12px' }}
          >
            <IX size={11} stroke={2} /> cancelar
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ status }) {
  const msg = {
    pendente: { icon: '📦', text: 'Nenhum pedido pendente. Quando um aluno trocar moedas por um item, aparece aqui.' },
    entregue: { icon: '✅', text: 'Nenhum resgate entregue ainda.' },
    cancelado: { icon: '🚫', text: 'Nenhum resgate cancelado.' },
  }[status] || { icon: '—', text: 'Nada por aqui.' }
  return (
    <div className="card" style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{msg.icon}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 360, margin: '0 auto' }}>
        {msg.text}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          height: 92, borderRadius: 10,
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          opacity: 0.5,
        }} />
      ))}
    </div>
  )
}

function Alert({ children, tone }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 6, fontSize: 11.5, marginBottom: 12,
      color: tone === 'red' ? 'var(--red)' : 'var(--amber)',
      background: tone === 'red' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
      border: `1px solid ${tone === 'red' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
    }}>{children}</div>
  )
}
