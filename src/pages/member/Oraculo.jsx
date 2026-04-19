import React, { useEffect, useRef, useState } from 'react'
import { ErrorBox } from './ui'
import {
  listConversations, createConversation, getMessages, saveMessage,
  askOraculo, deleteConversation, renameConversation,
} from '../../lib/oraculo'
import { IPlus, ISend, IAttach, IX, GYinYang, ISettings } from '../../components/icons'
import { useIsMobile } from '../../lib/useMedia'

export default function Oraculo() {
  const isMobile = useIsMobile(900)
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState(null)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [sideOpen, setSideOpen] = useState(!isMobile)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .catch(e => {
        if (/oraculo_conversations|does not exist/i.test(e.message)) setSchemaMissing(true)
        else setErr(e.message)
      })
  }, [])

  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    getMessages(activeId).then(setMessages).catch(e => setErr(e.message))
  }, [activeId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending])

  async function startNew() {
    setActiveId(null)
    setMessages([])
    inputRef.current?.focus()
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return

    let convId = activeId
    if (!convId) {
      try {
        const c = await createConversation(text.slice(0, 60))
        setConversations(cs => [c, ...cs])
        convId = c.id
        setActiveId(c.id)
      } catch (e) { setErr(e.message); return }
    }

    const userMsg = { role: 'user', content: text }
    setMessages(m => [...m, userMsg])
    setInput('')
    setSending(true)

    try {
      await saveMessage(convId, userMsg)
      const reply = await askOraculo(convId, [...messages, userMsg])
      const assistantMsg = { role: 'assistant', content: reply.content, sources: reply.sources }
      setMessages(m => [...m, assistantMsg])
      await saveMessage(convId, assistantMsg)
    } catch (e) {
      setErr(e.message)
      setMessages(m => [...m, { role: 'assistant', content: `⚠ erro: ${e.message}` }])
    } finally {
      setSending(false)
    }
  }

  async function onDelete(id) {
    if (!confirm('apagar essa conversa?')) return
    try {
      await deleteConversation(id)
      setConversations(cs => cs.filter(c => c.id !== id))
      if (activeId === id) { setActiveId(null); setMessages([]) }
    } catch (e) { setErr(e.message) }
  }

  if (schemaMissing) {
    return (
      <div style={{ padding: 20, background: 'var(--pink-dim)', border: '1px solid var(--pink-dim-20)', borderRadius: 8 }}>
        <div style={{ color: 'var(--pink)', fontSize: 13, marginBottom: 8 }}>⚠ schema do oráculo ainda não aplicado</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>
          Rode <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 3 }}>supabase/migrations/0004_oraculo.sql</code> no Supabase.
          <br />Habilite a extensão <strong>vector</strong> em Database → Extensions antes.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      height: isMobile ? 'calc(100vh - 96px)' : 'calc(100vh - 64px)',
      margin: isMobile ? '0' : '-32px -40px',
      minHeight: 0,
    }}>
      {/* Sidebar conversas */}
      {(!isMobile || sideOpen) && (
        <aside style={{
          width: isMobile ? '100%' : 240, minWidth: isMobile ? 'auto' : 240,
          background: '#0d0d0f',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          padding: 14,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <button
            onClick={startNew}
            className="btn btn-outline-amber"
            style={{ justifyContent: 'center', padding: '8px 10px' }}
          >
            <IPlus size={13} stroke={2} /> nova conversa
          </button>

          <div className="label-muted" style={{ padding: '14px 8px 6px', fontSize: 9.5 }}>últimas conversas</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            {conversations.length === 0 ? (
              <div style={{ padding: 10, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                sem conversas ainda
              </div>
            ) : conversations.map(c => {
              const isActive = activeId === c.id
              return (
                <div key={c.id} style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 10px',
                  borderRadius: 5,
                  background: isActive ? 'var(--amber-dim-15)' : 'transparent',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {isActive && <span style={{ position: 'absolute', left: 0, top: 7, bottom: 7, width: 2, background: 'var(--amber)', borderRadius: '0 2px 2px 0' }} />}
                  <button
                    onClick={() => { setActiveId(c.id); if (isMobile) setSideOpen(false) }}
                    style={{
                      flex: 1, textAlign: 'left',
                      fontSize: 12,
                      color: isActive ? 'var(--amber)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {c.title || 'sem título'}
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    style={{ color: 'var(--text-muted)', padding: 2, fontSize: 12, display: 'flex' }}
                    title="apagar"
                  >
                    <IX size={11} stroke={1.8} />
                  </button>
                </div>
              )
            })}
          </div>
        </aside>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--body)' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'var(--amber-dim-15)', color: 'var(--amber)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GYinYang size={16} stroke={1.6} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: 'var(--text-primary)' }}>
                ORÁCULO
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                treinado em todo o conteúdo da mentoria
              </div>
            </div>
          </div>
        </div>

        {/* Messages / Empty */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 16px', minHeight: 0 }}>
          {!activeId && messages.length === 0 ? (
            <EmptyState onPick={q => { setInput(q); inputRef.current?.focus() }} />
          ) : (
            <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {messages.map((m, i) => <Bubble key={i} msg={m} />)}
              {sending && <Typing />}
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <form
              onSubmit={e => { e.preventDefault(); send() }}
              style={{
                display: 'flex', alignItems: 'flex-end', gap: 8,
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 12px',
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                }}
                placeholder="pergunte sobre o Tradesystem..."
                rows={1}
                disabled={sending}
                style={{
                  flex: 1, resize: 'none',
                  fontSize: 13, lineHeight: 1.5,
                  color: 'var(--text-primary)',
                  background: 'transparent', border: 'none', outline: 'none',
                  minHeight: 18, maxHeight: 120,
                }}
              />
              <button type="submit" disabled={sending || !input.trim()} className="btn btn-primary" style={{ padding: '6px 10px' }}>
                <ISend size={13} stroke={1.8} />
              </button>
            </form>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>
              <span>respostas baseadas só no conteúdo da mentoria</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                <span className="kbd">⏎</span> enviar · <span className="kbd">shift</span>+<span className="kbd">⏎</span> nova linha
              </span>
            </div>
          </div>
        </div>

        {err && (
          <div style={{ position: 'fixed', bottom: 20, right: 20, padding: 12, background: '#ef444422', border: '1px solid #ef444466', borderRadius: 6, color: 'var(--down)', fontSize: 12, maxWidth: 300, zIndex: 30 }}>
            {err} <button onClick={() => setErr(null)} style={{ color: 'inherit', marginLeft: 8 }}>×</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '80%',
          padding: '9px 13px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '10px 10px 2px 10px',
          fontSize: 13, lineHeight: 1.55,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
        }}>{msg.content}</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: 'var(--amber-dim-15)', color: 'var(--amber)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <GYinYang size={14} stroke={1.6} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, lineHeight: 1.65,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
        }} dangerouslySetInnerHTML={{ __html: markdownBasic(msg.content) }} />
        {msg.sources?.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {msg.sources.map((s, i) => (
              <span key={i} className="pill pill-amber" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                {s.source_ref || s.source_title || 'fonte'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6,
        background: 'var(--amber-dim-15)', color: 'var(--amber)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <GYinYang size={14} stroke={1.6} />
      </div>
      <span>consultando a matilha</span>
      <span style={{ color: 'var(--amber)' }}>▍</span>
    </div>
  )
}

function EmptyState({ onPick }) {
  const prompts = [
    '› me explica o que é o FQ',
    '› como funciona o gerenciamento starter?',
    '› quando usar VWAP em trade de abertura?',
    '› qual a diferença entre TRM e TC?',
  ]
  return (
    <div style={{ maxWidth: 560, margin: '40px auto 0', textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, margin: '0 auto 16px', borderRadius: 12,
        background: 'var(--amber-dim-15)', color: 'var(--amber)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <GYinYang size={32} stroke={1.4} />
      </div>
      <h2 className="display" style={{ fontSize: 22, fontWeight: 500, letterSpacing: '0.15em', color: 'var(--text-primary)', margin: '0 0 8px', textTransform: 'uppercase' }}>
        ORÁCULO
      </h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
        pergunte qualquer coisa sobre setups, estratégias, gerenciamento ou leitura de mercado.<br />
        respostas baseadas no acervo completo da mentoria.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
        {prompts.map(p => (
          <button key={p} onClick={() => onPick(p.replace(/^›\s*/, ''))} className="card card-hover" style={{
            padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)',
            textAlign: 'left', cursor: 'pointer',
          }}>{p}</button>
        ))}
      </div>
    </div>
  )
}

// Minimal markdown: **bold**, line breaks
function markdownBasic(text) {
  if (!text) return ''
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--surface-2);padding:2px 4px;border-radius:3px;font-family:var(--font-mono);font-size:0.9em">$1</code>')
}
