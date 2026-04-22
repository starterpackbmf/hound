import React, { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getMyProfile } from '../../lib/profile'
import { IArrowRight, IUsers, IClock } from '../../components/icons'

// Só admin + suporte leem feedbacks (RLS também garante, mas gate no client
// evita flash de "nenhum resultado" e redireciona monitor comum.)
const STAFF_ROLES = ['admin', 'suporte']

const MOOD_META = {
  1: { emoji: '😖', label: 'péssimo', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.32)' },
  2: { emoji: '😕', label: 'ruim',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.32)' },
  3: { emoji: '😐', label: 'neutro',  color: '#9a9aa4', bg: 'rgba(154,154,164,0.1)', border: 'rgba(154,154,164,0.22)' },
  4: { emoji: '🙂', label: 'bom',     color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
  5: { emoji: '😄', label: 'ótimo',   color: '#10b981', bg: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.35)' },
}

export default function Feedbacks() {
  const [gate, setGate] = useState('checking')  // 'checking' | 'allowed' | 'denied'
  const [filter, setFilter] = useState('urgent')  // 'urgent' | 'all' | 'pending'
  const [feedbacks, setFeedbacks] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    getMyProfile()
      .then(p => {
        const roles = p?.roles || []
        setGate(roles.some(r => STAFF_ROLES.includes(r)) ? 'allowed' : 'denied')
      })
      .catch(() => setGate('denied'))
  }, [])

  useEffect(() => {
    if (gate === 'allowed') load()
  }, [gate])

  async function load() {
    setLoading(true); setErr(null)
    try {
      // Pega feedbacks últimos 30 dias + info do profile + aula
      const [{ data: fbs, error: e1 }, { data: pend, error: e2 }] = await Promise.all([
        supabase
          .from('live_feedback')
          .select('id, user_id, live_session_id, mood, note, created_at, profiles(id, name, email, avatar_url), live_sessions(title, starts_at)')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('live_feedback_pending')
          .select('user_id, live_session_id, created_at, profiles(id, name, email, avatar_url), live_sessions(title, starts_at)')
          .order('created_at', { ascending: false })
          .limit(100),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setFeedbacks(fbs || [])
      setPending(pend || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (gate === 'checking') {
    return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>verificando permissões...</div>
  }
  if (gate === 'denied') return <Navigate to="/mentor/visao-geral" replace />

  const urgent = feedbacks.filter(f => f.mood !== null && f.mood <= 2)
  const shown = filter === 'all' ? feedbacks
              : filter === 'pending' ? []
              : urgent

  return (
    <div style={{ maxWidth: 960 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
          Feedbacks dos alunos
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
          Como cada aluno disse que foi o dia após participar do ao vivo.
          Humor baixo ({MOOD_META[1].emoji}{MOOD_META[2].emoji}) aparece primeiro — esses merecem contato do CS.
        </p>
      </header>

      {/* Tabs de filtro */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        <FilterBtn active={filter === 'urgent'} onClick={() => setFilter('urgent')}
          label="urgente" count={urgent.length} color="#ef4444" />
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}
          label="todos" count={feedbacks.length} />
        <FilterBtn active={filter === 'pending'} onClick={() => setFilter('pending')}
          label="pendentes (não responderam)" count={pending.length} color="#f59e0b" />
      </div>

      {err && (
        <div style={{
          padding: '10px 12px', borderRadius: 6, fontSize: 11.5,
          color: 'var(--red)', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)', marginBottom: 12,
        }}>
          {err} — rode as migrations 0027→0030 se ainda não rodou.
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>carregando...</div>
      ) : filter === 'pending' ? (
        <PendingList pending={pending} />
      ) : shown.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {filter === 'urgent'
              ? '🎉 Nenhum aluno reportou humor baixo recentemente.'
              : 'Nenhum feedback nos últimos 30 dias.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(f => <FeedbackRow key={f.id} f={f} />)}
        </div>
      )}
    </div>
  )
}

function FilterBtn({ active, onClick, label, count, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 12px', borderRadius: 6, fontSize: 11.5, cursor: 'pointer',
        background: active ? (color ? `${color}22` : 'rgba(168,85,247,0.12)') : 'var(--surface-2)',
        border: `1px solid ${active ? (color || 'rgba(168,85,247,0.35)') : 'var(--border)'}`,
        color: active ? (color || 'var(--purple)') : 'var(--text-secondary)',
        fontWeight: active ? 600 : 450,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      {label}
      <span style={{
        fontSize: 10, fontFamily: 'var(--font-mono)',
        padding: '1px 6px', borderRadius: 3,
        background: 'var(--surface-1)', opacity: 0.8,
      }}>{count}</span>
    </button>
  )
}

function FeedbackRow({ f }) {
  const m = MOOD_META[f.mood] || MOOD_META[3]
  const p = f.profiles
  const s = f.live_sessions
  const initial = (p?.name?.[0] || '?').toUpperCase()
  const when = new Date(f.created_at)
  const whenStr = when.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const isUrgent = f.mood !== null && f.mood <= 2

  return (
    <div style={{
      padding: 14, display: 'flex', gap: 14, alignItems: 'flex-start',
      background: isUrgent ? 'rgba(239,68,68,0.04)' : 'var(--surface-1)',
      border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
      borderRadius: 10,
    }}>
      {/* Mood badge */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: m.bg, border: `1px solid ${m.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 18, lineHeight: 1 }}>{m.emoji}</div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: p?.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, #a855f7, #ec4899)',
            color: '#0a0a0e', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{!p?.avatar_url && initial}</div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {p?.name || p?.email || 'aluno'}
          </span>
          <span className="pill" style={{
            fontSize: 9, color: m.color, borderColor: m.border,
            background: m.bg, fontWeight: 600, textTransform: 'uppercase',
          }}>{m.label}</span>
          {isUrgent && (
            <span className="pill" style={{
              fontSize: 9, color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.1)', fontWeight: 700,
            }}>📞 contatar</span>
          )}
        </div>

        {s?.title && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
            <IClock size={10} stroke={1.6} />
            após <b style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{s.title}</b>
            <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>· {whenStr}</span>
          </div>
        )}

        {f.note ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
            "{f.note}"
          </p>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>(sem nota)</div>
        )}
      </div>

      {p?.id && (
        <Link to={`/mentor/alunos/${p.id}`} className="btn btn-ghost" style={{ fontSize: 11, flexShrink: 0 }}>
          ver ficha <IArrowRight size={11} stroke={1.8} />
        </Link>
      )}
    </div>
  )
}

function PendingList({ pending }) {
  if (pending.length === 0) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          🎉 Ninguém com feedback pendente agora.
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        padding: '10px 12px', borderRadius: 6, fontSize: 11.5,
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
        color: 'var(--text-muted)',
      }}>
        Estes alunos participaram de aulas que já terminaram mas ainda não responderam o feedback.
        Eles ficam bloqueados de entrar no próximo ao vivo até responder.
      </div>
      {pending.map(row => {
        const p = row.profiles
        const s = row.live_sessions
        const initial = (p?.name?.[0] || '?').toUpperCase()
        const when = new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        return (
          <div key={`${row.user_id}-${row.live_session_id}`} className="card" style={{
            padding: 12, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: p?.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: '#0a0a0e', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{!p?.avatar_url && initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p?.name || p?.email || 'aluno'}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                aula: <b style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{s?.title || '—'}</b>
                <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 6 }}>· pendente desde {when}</span>
              </div>
            </div>
            {p?.id && (
              <Link to={`/mentor/alunos/${p.id}`} className="btn btn-ghost" style={{ fontSize: 11 }}>
                ver ficha <IArrowRight size={11} stroke={1.8} />
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
