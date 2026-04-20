import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getMyProfile } from '../lib/profile'

export default function ZoomLive({ meetingNumber, passcode, onLeave }) {
  const { user } = useAuth()
  const containerRef = useRef(null)
  const clientRef = useRef(null)
  const [status, setStatus] = useState('loading') // loading | ready | joining | joined | error
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!meetingNumber || !user) return
    let cancelled = false

    ;(async () => {
      try {
        setStatus('loading')
        // Dynamic import — mantém o SDK fora do bundle principal
        const ZoomMtgEmbedded = (await import('@zoom/meetingsdk/embedded')).default
        if (cancelled) return

        // Preload resources do SDK
        const client = ZoomMtgEmbedded.createClient()
        clientRef.current = client

        await client.init({
          zoomAppRoot: containerRef.current,
          language: 'pt-BR',
          patchJsMedia: true,
          leaveOnPageUnload: true,
          customize: {
            video: {
              isResizable: true,
              viewSizes: { default: { width: 920, height: 560 } },
            },
            toolbar: { buttons: [] },
          },
        })

        setStatus('ready')

        // Pega profile pra usar nome real
        const profile = await getMyProfile().catch(() => null)
        const userName = profile?.name || user.email?.split('@')[0] || 'mentorado'

        // Gera signature no backend
        setStatus('joining')
        const sigRes = await fetch('/api/zoom-signature', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ meetingNumber, role: 0 }),
        })
        if (!sigRes.ok) throw new Error(`signature ${sigRes.status}`)
        const { signature, sdkKey } = await sigRes.json()

        if (cancelled) return

        await client.join({
          signature,
          sdkKey,
          meetingNumber: String(meetingNumber),
          password: passcode || '',
          userName,
          userEmail: user.email || '',
        })

        setStatus('joined')
      } catch (e) {
        console.error('Zoom error:', e)
        if (!cancelled) {
          setError(e.reason || e.message || 'falha ao entrar na aula')
          setStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
      try { clientRef.current?.leaveMeeting() } catch {}
    }
  }, [meetingNumber, passcode, user])

  return (
    <div style={{ width: '100%' }}>
      {status !== 'joined' && (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--surface-1)', borderRadius: 12,
          border: '1px solid var(--border)',
          marginBottom: 14,
        }}>
          {status === 'loading' && <span style={{ color: 'var(--text-muted)' }}>carregando Zoom SDK…</span>}
          {status === 'ready' && <span style={{ color: 'var(--text-muted)' }}>pronto, entrando…</span>}
          {status === 'joining' && <span style={{ color: 'var(--cyan)' }}>conectando na sala…</span>}
          {status === 'error' && (
            <div>
              <div style={{ color: 'var(--down)', fontSize: 14, marginBottom: 8 }}>⚠ {error}</div>
              {onLeave && <button onClick={onLeave} className="btn btn-ghost">voltar</button>}
            </div>
          )}
        </div>
      )}
      <div ref={containerRef} style={{ minHeight: status === 'joined' ? 560 : 0 }} />
    </div>
  )
}
