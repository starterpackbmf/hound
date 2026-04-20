import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getMyProfile } from '../lib/profile'
import {
  listMessages, sendMessage, deleteMessage, pinMessage,
  subscribeMessages, subscribePresence, fetchAuthors, markJoined, userTag,
} from '../lib/chat'
import RankBadge from './RankBadge'

export default function ChatRoom({ roomId, title = 'chat da aula', height = 560 }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [authors, setAuthors] = useState({})
  const [online, setOnline] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [me, setMe] = useState(null)
  const [showPresence, setShowPresence] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!user || !roomId) return
    let unsubMsgs, unsubPresence
    ;(async () => {
      const [msgs, profile] = await Promise.all([
        listMessages(roomId),
        getMyProfile().catch(() => null),
      ])
      setMessages(msgs)
      setMe(profile)
      const ids = [...new Set(msgs.map(m => m.user_id))]
      const authorMap = await fetchAuthors(ids)
      setAuthors(authorMap)
      markJoined(roomId).catch(() => {})

      unsubMsgs = subscribeMessages(
        roomId,
        async (m) => {
          setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
          if (!authorMap[m.user_id]) {
            const more = await fetchAuthors([m.user_id])
            setAuthors(a => ({ ...a, ...more }))
          }
        },
        (m) => setMessages(prev => prev.map(x => x.id === m.id ? m : x).filter(x => !x.deleted_at)),
      )

      if (profile) {
        unsubPresence = subscribePresence(roomId, profile, setOnline)
      }
    })()

    return () => {
      unsubMsgs?.()
      unsubPresence?.()
    }
  }, [user, roomId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length])

  const pinned = useMemo(() => messages.filter(m => m.pinned), [messages])
  const isMonitor = (me?.roles || []).some(r => ['admin', 'monitor', 'imortal'].includes(r))

  async function submit(e) {
    e?.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(roomId, input.trim())
      setInput('')
    } catch (err) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface-2)',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {messages.length} mensagens
          </div>
        </div>
        <button
          onClick={() => setShowPresence(v => !v)}
          style={{
            padding: '6px 10px', borderRadius: 6,
            background: showPresence ? 'var(--cyan-dim)' : 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span className="dot dot-up" style={{ width: 6, height: 6 }} />
          {online.length} online
        </button>
      </div>

      {/* Presença */}
      {showPresence && (
        <div style={{
          padding: 10, borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
          maxHeight: 120, overflowY: 'auto',
        }}>
          {online.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ninguém online agora</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {online.map(u => {
                const tag = userTag(u)
                return (
                  <span key={u.id} className="pill" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span className="dot dot-up" style={{ width: 5, height: 5 }} />
                    {u.name?.split(' ')[0]?.toLowerCase() || '?'}
                    <span style={{ color: tag.color, fontSize: 8, fontWeight: 700, letterSpacing: '0.05em' }}>{tag.label}</span>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(245,158,11,0.08)',
        }}>
          <div style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6 }}>📌 FIXADO</div>
          {pinned.map(m => (
            <div key={m.id} style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <strong>{authors[m.user_id]?.name?.split(' ')[0] || '?'}:</strong> {m.body}
            </div>
          ))}
        </div>
      )}

      {/* Mensagens */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto',
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {messages.map(m => (
          <Message
            key={m.id}
            msg={m}
            author={authors[m.user_id]}
            isOwn={m.user_id === user?.id}
            isMonitor={isMonitor}
          />
        ))}
      </div>

      {/* Input */}
      <form onSubmit={submit} style={{
        padding: 10,
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 6,
        background: 'var(--surface-2)',
      }}>
        <input
          className="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="mande uma mensagem..."
          style={{ flex: 1, fontSize: 13 }}
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="btn btn-primary"
          style={{ fontSize: 12 }}
        >
          {sending ? '…' : 'enviar'}
        </button>
      </form>
    </div>
  )
}

function Message({ msg, author, isOwn, isMonitor }) {
  const tag = userTag(author)
  const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const initial = (author?.name?.[0] || '?').toUpperCase()

  async function doPin() {
    try { await pinMessage(msg.id, !msg.pinned) } catch (e) { alert(e.message) }
  }
  async function doDelete() {
    if (!confirm('apagar mensagem?')) return
    try { await deleteMessage(msg.id) } catch (e) { alert(e.message) }
  }

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      ...(msg.pinned ? { background: 'rgba(245,158,11,0.05)', padding: 4, borderRadius: 4 } : {}),
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
        color: '#0a0a0e', fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
            {author?.name?.split(' ').slice(0, 2).join(' ') || 'mentorado'}
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
            padding: '1px 5px', borderRadius: 3,
            background: `${tag.color}22`, color: tag.color,
          }}>{tag.label}</span>
          {author?.current_badge && <RankBadge rank={author.current_badge} size="xs" />}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{time}</span>
          {(isMonitor || isOwn) && (
            <div style={{ display: 'flex', gap: 4 }}>
              {isMonitor && (
                <button onClick={doPin} style={{ fontSize: 10, color: 'var(--text-muted)', padding: 2 }} title="fixar">
                  {msg.pinned ? '📌' : '📍'}
                </button>
              )}
              <button onClick={doDelete} style={{ fontSize: 10, color: 'var(--text-muted)', padding: 2 }} title="apagar">✕</button>
            </div>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {msg.body}
        </div>
      </div>
    </div>
  )
}
