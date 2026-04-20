import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getMyProfile } from '../lib/profile'

// Embed Zoom num iframe isolado (public/zoom-room.html) com React 18 próprio.
// Resolve o conflito com React 19 do app pai.

export default function ZoomLive({ meetingNumber, passcode, onLeave, height = 640 }) {
  const { user } = useAuth()
  const [src, setSrc] = useState(null)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!meetingNumber || !user) return
    ;(async () => {
      const profile = await getMyProfile().catch(() => null)
      const userName = profile?.name || user.email?.split('@')[0] || 'mentorado'
      const params = new URLSearchParams({
        meeting: String(meetingNumber),
        pwd: passcode || '',
        name: userName,
        email: user.email || '',
      })
      setSrc(`/zoom-room.html?${params.toString()}`)
    })()
  }, [meetingNumber, passcode, user])

  useEffect(() => {
    function onMsg(e) {
      if (e.data?.type === 'zoom:joined') setJoined(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  if (!src) {
    return (
      <div style={{
        padding: 40, textAlign: 'center', minHeight: height,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-1)', borderRadius: 12, border: '1px solid var(--border)',
      }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>carregando…</span>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height,
      borderRadius: 12, overflow: 'hidden',
      border: '1px solid var(--border)',
      background: '#0a0a0e',
      position: 'relative',
    }}>
      <iframe
        src={src}
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Zoom meeting"
      />
    </div>
  )
}
