import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestZoomJoin, submitLiveFeedback } from '../lib/zoomJoin'
import { IPlay, IArrowRight, IX, ICheck } from './icons'

// Card de destaque "Entrar no ao vivo" + modais pros 5 tipos de erro do backend.
export default function LiveJoinCTA() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)       // { error, message, ...extra }
  const [countdown, setCountdown] = useState(0)

  async function onJoin() {
    setErr(null); setLoading(true)
    try {
      const r = await requestZoomJoin()
      if (r.ok) {
        // Navega pro /go → browser segue 302 pro Zoom.
        window.location.href = r.redirect_url
        return
      }
      setErr(r)
      if (r.error === 'RATE_LIMIT' && r.retry_in_s) {
        setCountdown(r.retry_in_s)
        const iv = setInterval(() => {
          setCountdown(c => {
            if (c <= 1) { clearInterval(iv); return 0 }
            return c - 1
          })
        }, 1000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        style={{
          position: 'relative',
          padding: 20,
          borderRadius: 14,
          background: `
            linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(168,85,247,0.1) 50%, rgba(0,217,255,0.08) 100%) padding-box,
            linear-gradient(135deg, rgba(236,72,153,0.45), rgba(168,85,247,0.35) 50%, rgba(0,217,255,0.3)) border-box
          `,
          border: '1px solid transparent',
          boxShadow: '0 0 32px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: 'rgba(236,72,153,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px rgba(236,72,153,0.3)',
          }}>
            <span className="dot dot-live" style={{ width: 12, height: 12 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="pill" style={{
                fontSize: 9, color: 'var(--pink)', borderColor: 'rgba(236,72,153,0.4)',
                background: 'rgba(236,72,153,0.1)', fontWeight: 700, letterSpacing: '0.12em',
              }}>
                SALA AO VIVO
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              Entrar no ao vivo da Matilha
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Sua presença é registrada automaticamente. O link do Zoom é pessoal — não compartilhe.
            </div>
          </div>
          <button
            onClick={onJoin}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: 12.5, padding: '10px 18px', opacity: loading ? 0.6 : 1 }}
          >
            <IPlay size={12} stroke={2.2} />
            {loading ? 'validando...' : 'entrar no ao vivo'}
            {!loading && <IArrowRight size={12} stroke={2} />}
          </button>
        </div>
      </div>

      {err && (
        <ErrorDialog err={err} countdown={countdown} onClose={() => setErr(null)} onRetry={onJoin} />
      )}
    </>
  )
}

function ErrorDialog({ err, countdown, onClose, onRetry }) {
  // Feedback pendente: modal com form — trava até responder
  if (err.error === 'FEEDBACK_REQUIRED') {
    return <FeedbackGateModal pending={err.pending} onDone={() => { onClose(); onRetry() }} onClose={onClose} />
  }

  // Nome faltando: mensagem + link pra /app/minha-ficha
  if (err.error === 'NAME_REQUIRED') {
    return (
      <Backdrop onClose={onClose}>
        <Card>
          <Header title="Complete seu nome" onClose={onClose} />
          <p style={p}>
            Pra entrar no ao vivo, seu perfil precisa ter <b>nome e sobrenome</b>.
            A presença é puxada automaticamente pelo seu nome no Zoom.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 11 }}>fechar</button>
            <Link to="/app/minha-ficha" className="btn btn-primary" style={{ fontSize: 11 }}>
              abrir minha ficha <IArrowRight size={11} stroke={2} />
            </Link>
          </div>
        </Card>
      </Backdrop>
    )
  }

  // Rate limit: countdown + retry
  if (err.error === 'RATE_LIMIT') {
    const m = Math.floor(countdown / 60), s = countdown % 60
    return (
      <Backdrop onClose={onClose}>
        <Card>
          <Header title="Aguarde um momento" onClose={onClose} />
          <p style={p}>
            Você tentou entrar há pouco. Pra evitar loops, esperamos alguns minutos entre tentativas.
          </p>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600,
            color: 'var(--amber)', textAlign: 'center', margin: '12px 0',
            letterSpacing: '0.05em',
          }}>
            {countdown > 0 ? `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : '00:00'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 11 }}>fechar</button>
            <button
              onClick={onRetry}
              disabled={countdown > 0}
              className="btn btn-primary"
              style={{ fontSize: 11, opacity: countdown > 0 ? 0.5 : 1 }}
            >
              tentar de novo
            </button>
          </div>
        </Card>
      </Backdrop>
    )
  }

  // Conflito de sessão: contacte suporte
  if (err.error === 'SESSION_CONFLICT') {
    return (
      <Backdrop onClose={onClose}>
        <Card>
          <Header title="Login suspeito detectado" onClose={onClose} />
          <p style={p}>
            Detectamos uma tentativa de entrar com esta conta de outro dispositivo nas últimas 2 horas.
            Se não foi você, troque sua senha e <b>avise o suporte</b>. Se foi você e o bloqueio é falso positivo,
            também fala com a gente.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 11 }}>entendi</button>
          </div>
        </Card>
      </Backdrop>
    )
  }

  // Sala não configurada
  if (err.error === 'NOT_CONFIGURED') {
    return (
      <Backdrop onClose={onClose}>
        <Card>
          <Header title="Sala ainda não configurada" onClose={onClose} />
          <p style={p}>A sala do ao vivo ainda não foi preenchida pelo admin. Volte em instantes ou avise a equipe.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 11 }}>fechar</button>
          </div>
        </Card>
      </Backdrop>
    )
  }

  // Fallback (UNAUTHENTICATED, NETWORK, etc.)
  return (
    <Backdrop onClose={onClose}>
      <Card>
        <Header title="Não foi possível entrar" onClose={onClose} />
        <p style={p}>{err.message || 'Erro desconhecido. Tente de novo daqui a pouco.'}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 11 }}>fechar</button>
        </div>
      </Card>
    </Backdrop>
  )
}

function FeedbackGateModal({ pending, onDone, onClose }) {
  const [mood, setMood] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function submit() {
    if (!mood) { setErr('selecione como foi seu dia'); return }
    setSaving(true); setErr(null)
    try {
      await submitLiveFeedback({ liveSessionId: pending.live_session_id, mood, note: note || null })
      onDone()
    } catch (e) {
      setErr(e.message || 'falha ao enviar')
    } finally {
      setSaving(false)
    }
  }

  const endedAt = pending?.session_ended_at ? new Date(pending.session_ended_at).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }) : null

  return (
    <Backdrop onClose={onClose}>
      <Card>
        <Header title="Responda antes de entrar" onClose={onClose} />
        <p style={p}>
          Você participou da aula <b>{pending?.session_title || 'anterior'}</b>
          {endedAt ? <> (terminou em <span style={{ fontFamily: 'var(--font-mono)' }}>{endedAt}</span>)</> : null}.
          Antes de entrar no próximo ao vivo, conta pra gente como foi seu dia de trade.
        </p>

        <div style={{ marginTop: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Como foi seu dia?</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {MOOD_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMood(opt.value)}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: 7,
                  fontSize: 18, cursor: 'pointer',
                  background: mood === opt.value ? 'rgba(168,85,247,0.15)' : 'var(--surface-2)',
                  border: `1px solid ${mood === opt.value ? 'rgba(168,85,247,0.45)' : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                  transition: 'all .15s ease',
                }}
                title={opt.label}
              >
                <div>{opt.emoji}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            Quer contar mais? <span style={{ color: 'var(--text-faint)' }}>(opcional)</span>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="O que rolou no mercado pra você hoje..."
            className="input"
            style={{ width: '100%', resize: 'vertical', fontSize: 12.5, fontFamily: 'inherit' }}
          />
        </div>

        {err && (
          <div style={{
            fontSize: 11, color: 'var(--red)', padding: '6px 10px', borderRadius: 5,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            marginBottom: 10,
          }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 11 }}>depois</button>
          <button
            onClick={submit}
            disabled={saving || !mood}
            className="btn btn-primary"
            style={{ fontSize: 11, opacity: (saving || !mood) ? 0.6 : 1 }}
          >
            <ICheck size={11} stroke={2.2} />
            {saving ? 'enviando...' : 'enviar e continuar'}
          </button>
        </div>
      </Card>
    </Backdrop>
  )
}

const MOOD_OPTS = [
  { value: 1, emoji: '😖', label: 'péssimo' },
  { value: 2, emoji: '😕', label: 'ruim' },
  { value: 3, emoji: '😐', label: 'neutro' },
  { value: 4, emoji: '🙂', label: 'bom' },
  { value: 5, emoji: '😄', label: 'ótimo' },
]

// ─── bits reutilizáveis ───
function Backdrop({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(6,7,12,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460 }}>
        {children}
      </div>
    </div>
  )
}
function Card({ children }) {
  return (
    <div style={{
      background: 'rgba(16,18,24,0.92)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: 22,
      boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
    }}>{children}</div>
  )
}
function Header({ title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
      <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4 }}>
        <IX size={14} stroke={1.8} />
      </button>
    </div>
  )
}
const p = { fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }
