import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { supabase } from '../../lib/supabase'
import { GYinYang, ISend, IPlus, IStar } from '../../components/icons'
import ThinkingLoader from '../../components/oraculo/ThinkingLoader'
import OracleResponse from '../../components/oraculo/OracleResponse'

const SUGGESTIONS = [
  'Como monto meu G.R. com R$ 2.000?',
  'Quais as regras do TRM?',
  'Diferença entre TRM, FQ, TC e TA',
  'O que é Fibo Red?',
]

export default function Oraculo() {
  const [token, setToken] = useState(null)
  const [quota, setQuota] = useState(null) // { used, limit, remaining }
  const scrollRef = useRef(null)

  // Pega o token do supabase pra autorizar as chamadas
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token || null))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Lê quota inicial
  useEffect(() => {
    if (!token) return
    fetch('/api/oraculo/quota', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setQuota)
      .catch(() => {})
  }, [token])

  // Ref pro token — usado dentro do prepareSendMessagesRequest pra ler
  // sempre o valor atual (mesmo se o transport foi criado com token=null).
  const tokenRef = useRef(null)
  useEffect(() => { tokenRef.current = token }, [token])

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/oraculo/chat',
    prepareSendMessagesRequest: ({ messages, body, headers }) => {
      const t = tokenRef.current
      return {
        body: { ...body, messages, ...(t ? { token: t } : {}) },
        headers: { ...headers, ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      }
    },
  }), [])

  const { messages, sendMessage, status, error } = useChat({ transport })

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, status])

  // Atualiza quota quando uma resposta chega (metadata.quota)
  useEffect(() => {
    const last = messages[messages.length - 1]
    const meta = last?.metadata
    if (meta?.quota) setQuota(meta.quota)
  }, [messages])

  const isThinking = status === 'submitted' || status === 'streaming'
  const empty = messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', maxWidth: 920, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(0,217,255,0.16), rgba(168,85,247,0.12))',
            border: '1px solid rgba(0,217,255,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px rgba(0,217,255,0.18)',
          }}>
            <GYinYang size={20} stroke={1.6} style={{ color: 'var(--cyan)' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--cyan)', fontWeight: 700 }}>ORÁCULO</div>
            <h1 style={{
              fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: '-0.01em',
              fontFamily: 'var(--font-display, Instrument Serif, serif)',
            }}>
              Tira-dúvidas sobre o método
            </h1>
          </div>
        </div>
        {quota && <QuotaPill quota={quota} />}
      </header>

      {/* Messages area */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto',
        padding: '8px 4px 24px',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {empty ? (
          <EmptyState onPick={text => sendMessage({ text })} />
        ) : (
          messages.map((m, i) => (
            <Message
              key={m.id}
              message={m}
              isLast={i === messages.length - 1}
              isThinking={isThinking && i === messages.length - 1 && m.role === 'assistant'}
            />
          ))
        )}
        {/* Caso o assistente ainda não tenha começado a responder mas a pergunta já foi enviada */}
        {isThinking && messages[messages.length - 1]?.role === 'user' && (
          <div style={{ paddingLeft: 44 }}>
            <ThinkingLoader />
          </div>
        )}
        {error && (
          <ErrorBanner error={error} onQuotaUpdate={q => setQuota(q)} />
        )}
      </div>

      {/* Composer */}
      <Composer
        onSend={text => sendMessage({ text })}
        disabled={isThinking || (quota && quota.remaining === 0)}
        quota={quota}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────
function Message({ message, isLast, isThinking }) {
  const isUser = message.role === 'user'
  const text = extractText(message)
  const sources = message.metadata?.sources || []

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '78%', padding: '10px 14px', borderRadius: 12,
          background: 'rgba(0,217,255,0.08)',
          border: '1px solid rgba(0,217,255,0.2)',
          color: 'var(--text-primary)', fontSize: 13.5, lineHeight: 1.5,
        }}>
          {text}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(0,217,255,0.16), rgba(168,85,247,0.12))',
        border: '1px solid rgba(0,217,255,0.32)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <GYinYang size={14} stroke={1.6} style={{ color: 'var(--cyan)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isThinking && !text ? (
          <ThinkingLoader />
        ) : (
          <>
            <OracleResponse text={text} animate={!isLast || !isThinking} />
            {sources.length > 0 && !isThinking && <SourcesFooter sources={sources} />}
          </>
        )}
      </div>
    </div>
  )
}

function extractText(message) {
  if (!message) return ''
  // AI SDK v6: message.parts é array de { type, text? }
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(p => p.type === 'text')
      .map(p => p.text || '')
      .join('')
  }
  if (typeof message.content === 'string') return message.content
  return ''
}

function SourcesFooter({ sources }) {
  return (
    <div style={{
      marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
    }}>
      <span style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>
        📎 TEMAS
      </span>
      {sources.slice(0, 6).map((s, i) => (
        <span key={i} style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 4,
          background: 'rgba(168,85,247,0.08)',
          border: '1px solid rgba(168,85,247,0.22)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {s.label}
        </span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composer + suggestions + quota pill + error banner
// ─────────────────────────────────────────────────────────────
function Composer({ onSend, disabled, quota }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  function submit(e) {
    e?.preventDefault()
    const t = text.trim()
    if (!t || disabled) return
    setText('')
    onSend(t)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const noQuota = quota && quota.remaining === 0

  return (
    <form onSubmit={submit} style={{
      display: 'flex', gap: 8, padding: '14px 14px 0',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      marginTop: 8,
    }}>
      <textarea
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={noQuota ? 'Você bateu o limite de hoje. Volta amanhã.' : 'Pergunte ao Oráculo...'}
        disabled={disabled}
        style={{
          flex: 1, resize: 'none',
          padding: '12px 14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--text-primary)', fontSize: 13.5,
          fontFamily: 'inherit',
          outline: 'none',
          minHeight: 44, maxHeight: 200,
          lineHeight: 1.5,
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(0,217,255,0.35)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        style={{
          padding: '0 18px', borderRadius: 10, cursor: 'pointer',
          background: text.trim() && !disabled
            ? 'linear-gradient(135deg, var(--cyan), var(--purple))'
            : 'rgba(255,255,255,0.05)',
          color: text.trim() && !disabled ? '#fff' : 'var(--text-faint)',
          border: 'none',
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
          minHeight: 44,
          boxShadow: text.trim() && !disabled ? '0 4px 16px rgba(0,217,255,0.25)' : 'none',
          transition: 'all .15s ease',
        }}
      >
        <ISend size={13} stroke={2} />
      </button>
    </form>
  )
}

function EmptyState({ onPick }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '40px 20px', gap: 24,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(0,217,255,0.16), rgba(168,85,247,0.14))',
        border: '1px solid rgba(0,217,255,0.32)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 32px rgba(0,217,255,0.22)',
      }}>
        <GYinYang size={32} stroke={1.6} style={{ color: 'var(--cyan)' }} />
      </div>
      <div>
        <h2 style={{
          fontSize: 24, fontWeight: 500, margin: 0, marginBottom: 8,
          fontFamily: 'var(--font-display, Instrument Serif, serif)', letterSpacing: '-0.01em',
        }}>
          Pergunte sobre o método
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.6 }}>
          O Oráculo conhece todo o conteúdo do <strong style={{ color: 'var(--text-primary)' }}>Trade Systems Start</strong> —
          regras, estratégias, gerenciamento, leitura técnica. Pergunta o que quiser.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 540 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 600 }}>
          OU EXPERIMENTE
        </div>
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s)}
            style={{
              padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--text-primary)',
              textAlign: 'left', fontSize: 13,
              transition: 'all .15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,217,255,0.32)'
              e.currentTarget.style.background = 'rgba(0,217,255,0.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function QuotaPill({ quota }) {
  const isLow = quota.remaining <= 3
  const isOut = quota.remaining === 0
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 8,
      background: isOut ? 'rgba(239,68,68,0.08)' : isLow ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isOut ? 'rgba(239,68,68,0.28)' : isLow ? 'rgba(245,158,11,0.28)' : 'rgba(255,255,255,0.08)'}`,
      fontSize: 11, color: isOut ? 'var(--red)' : isLow ? 'var(--amber)' : 'var(--text-muted)',
      fontFamily: 'var(--font-mono)', fontWeight: 500,
    }}>
      <IStar size={10} stroke={2} />
      {quota.remaining}/{quota.limit} hoje
    </div>
  )
}

function ErrorBanner({ error, onQuotaUpdate }) {
  // Tenta extrair JSON estruturado do erro do AI SDK
  let parsed = null
  try {
    const msg = error?.message || ''
    const m = msg.match(/\{[\s\S]+\}/)
    if (m) parsed = JSON.parse(m[0])
  } catch {}

  const code = parsed?.error
  const friendly = parsed?.message ||
    (code === 'UNAUTHENTICATED' ? 'Faça login de novo.' :
      code === 'PREMIUM_ONLY' ? 'O Oráculo é exclusivo pra mentorados.' :
        'Falha no Oráculo. Tenta de novo.')

  // Atualiza quota se veio no erro (QUOTA_EXCEEDED)
  useEffect(() => {
    if (parsed?.used != null && parsed?.limit != null) {
      onQuotaUpdate({ used: parsed.used, limit: parsed.limit, remaining: parsed.remaining ?? 0 })
    }
  }, [parsed?.used])

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: 'rgba(239,68,68,0.06)',
      border: '1px solid rgba(239,68,68,0.22)',
      color: 'var(--text-primary)', fontSize: 12.5,
    }}>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--red)', fontWeight: 700, marginBottom: 4 }}>
        {code === 'QUOTA_EXCEEDED' ? '🚫 LIMITE ATINGIDO' : '⚠️ ERRO'}
      </div>
      {friendly}
    </div>
  )
}
