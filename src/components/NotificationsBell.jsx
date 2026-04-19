import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listNotifications, countUnread, markAsRead, markAllRead,
  subscribeToMine, NOTIF_KIND_META,
} from '../lib/notifications'

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  async function refresh() {
    try {
      const [n, c] = await Promise.all([listNotifications({ limit: 15 }), countUnread()])
      setList(n); setUnread(c)
    } catch {}
  }

  useEffect(() => {
    refresh()
    const unsub = subscribeToMine(n => {
      setList(prev => [n, ...prev].slice(0, 15))
      setUnread(u => u + 1)
    })
    return () => { try { unsub?.() } catch {} }
  }, [])

  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function onClickItem(n) {
    if (!n.read_at) {
      await markAsRead(n.id).catch(() => {})
      setUnread(u => Math.max(0, u - 1))
      setList(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
    }
    setOpen(false)
  }

  async function onClearAll() {
    setLoading(true)
    try {
      await markAllRead()
      setUnread(0)
      setList(prev => prev.map(x => ({ ...x, read_at: x.read_at || new Date().toISOString() })))
    } finally { setLoading(false) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="notificações"
        style={{
          position: 'relative',
          width: 32, height: 32, borderRadius: 6,
          background: unread > 0 ? 'var(--cyan-dim)' : 'var(--surface-1)',
          border: '1px solid ' + (unread > 0 ? 'var(--cyan-dim-20)' : 'var(--border)'),
          color: unread > 0 ? 'var(--cyan)' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, cursor: 'pointer',
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 99,
            background: 'var(--pink)', color: '#0a0a0e',
            fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 8px var(--pink)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 360, maxHeight: 460, overflow: 'auto',
          background: 'var(--surface-1)', border: '1px solid var(--border-strong)',
          borderRadius: 8, boxShadow: '0 10px 40px #00000088, 0 0 0 1px var(--cyan-dim-20)',
          zIndex: 100,
        }}>
          <div style={{
            position: 'sticky', top: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--surface-1)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.14em', fontWeight: 600 }}>
              NOTIFICAÇÕES {unread > 0 && `· ${unread} não lidas`}
            </span>
            {unread > 0 && (
              <button onClick={onClearAll} disabled={loading}
                style={{ fontSize: 10, color: 'var(--text-muted)', padding: 2 }}>
                marcar todas
              </button>
            )}
          </div>

          {list.length === 0 ? (
            <div style={{ padding: '28px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              sem notificações
            </div>
          ) : (
            <div>
              {list.map(n => {
                const meta = NOTIF_KIND_META[n.kind] || NOTIF_KIND_META.generic
                const unread = !n.read_at
                return (
                  <NotifRow key={n.id} n={n} meta={meta} unread={unread} onClick={() => onClickItem(n)} />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotifRow({ n, meta, unread, onClick }) {
  const content = (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px',
      background: unread ? 'var(--cyan-dim)' : 'transparent',
      borderBottom: '1px solid var(--border)',
      cursor: n.link ? 'pointer' : 'default',
      color: 'var(--text-primary)', textDecoration: 'none',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, color: meta.color }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: unread ? 500 : 400, marginBottom: 2 }}>{n.title}</div>
        {n.body && <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {n.body.length > 120 ? n.body.slice(0, 120) + '…' : n.body}
        </div>}
        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          {fmtRel(n.created_at)}
        </div>
      </div>
      {unread && <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--cyan)', flexShrink: 0, marginTop: 6 }} />}
    </div>
  )
  if (n.link) return <Link to={n.link} onClick={onClick} style={{ textDecoration: 'none' }}>{content}</Link>
  return <div onClick={onClick}>{content}</div>
}

function fmtRel(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
