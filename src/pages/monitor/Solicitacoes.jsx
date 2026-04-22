import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ICheck, IX, IUsers } from '../../components/icons'

const STATUS_META = {
  pendente:   { label: 'PENDENTES',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  ativo:      { label: 'APROVADOS',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.3)' },
  cancelado:  { label: 'RECUSADOS',   color: '#71717a', bg: 'rgba(113,113,122,0.1)',  border: 'rgba(113,113,122,0.3)' },
  bloqueado:  { label: 'BLOQUEADOS',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)' },
}

export default function Solicitacoes() {
  const [tab, setTab] = useState('pendente')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true); setErr(null)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, whatsapp, status, roles, created_at, avatar_url')
        .eq('status', tab)
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id, status) {
    try {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
      if (error) throw error
      await load()
    } catch (e) {
      alert('Falha: ' + e.message)
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4 }}>
          GESTÃO DE ACESSO
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
          Solicitações
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
          Novos alunos ficam em <b>pendente</b> até serem aprovados. Só depois viram <b>ativo</b> e ganham acesso à área do mentorado.
        </p>
      </header>

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
            {tab === key && <span style={{ marginLeft: 6, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{rows.length}</span>}
          </button>
        ))}
      </div>

      {err && (
        <div style={{
          padding: '10px 12px', borderRadius: 6, fontSize: 11.5, marginBottom: 12,
          color: 'var(--red)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        }}>{err}</div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 20 }}>carregando...</div>
      ) : rows.length === 0 ? (
        <EmptyState status={tab} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(p => <PersonRow key={p.id} profile={p} onAction={updateStatus} currentStatus={tab} />)}
        </div>
      )}
    </div>
  )
}

function PersonRow({ profile: p, onAction, currentStatus }) {
  const initial = (p?.name?.[0] || '?').toUpperCase()
  const createdAt = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  const isPending = currentStatus === 'pendente'
  const isApproved = currentStatus === 'ativo'

  return (
    <div style={{
      padding: 14, display: 'flex', gap: 12, alignItems: 'center',
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: p?.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, #a855f7, #ec4899)',
        color: '#0a0a0e', fontSize: 14, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{!p?.avatar_url && initial}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
          {p.name || '(sem nome)'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{p.email}</span>
          {p.whatsapp && (
            <a
              href={`https://wa.me/${String(p.whatsapp).replace(/\D/g, '')}`}
              target="_blank" rel="noreferrer"
              style={{ color: 'var(--green)', textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}
            >
              📱 {p.whatsapp}
            </a>
          )}
          <span style={{ color: 'var(--text-faint)' }}>· cadastro {createdAt}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {isPending && (
          <>
            <button
              onClick={() => onAction(p.id, 'ativo')}
              style={{
                fontSize: 11, padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
                background: 'linear-gradient(135deg, #22c55e, #10b981)',
                color: '#fff', border: 'none', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              <ICheck size={11} stroke={2.2} /> aprovar
            </button>
            <button
              onClick={() => onAction(p.id, 'cancelado')}
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '7px 12px' }}
            >
              <IX size={11} stroke={2} /> recusar
            </button>
          </>
        )}
        {isApproved && (
          <button
            onClick={() => {
              if (confirm(`Bloquear ${p.name || p.email}?`)) onAction(p.id, 'bloqueado')
            }}
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '7px 12px', color: 'var(--red)' }}
          >
            bloquear
          </button>
        )}
        {currentStatus === 'bloqueado' && (
          <button
            onClick={() => onAction(p.id, 'ativo')}
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '7px 12px', color: 'var(--green)' }}
          >
            reativar
          </button>
        )}
        {currentStatus === 'cancelado' && (
          <button
            onClick={() => onAction(p.id, 'pendente')}
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '7px 12px' }}
          >
            voltar p/ pendente
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ status }) {
  const msg = {
    pendente:  { icon: '🎉', text: 'Nenhuma solicitação pendente no momento.' },
    ativo:     { icon: '👥', text: 'Nenhum aluno aprovado ainda.' },
    cancelado: { icon: '—', text: 'Nenhuma solicitação recusada.' },
    bloqueado: { icon: '🔒', text: 'Nenhum aluno bloqueado.' },
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
