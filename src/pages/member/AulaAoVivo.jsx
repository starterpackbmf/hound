import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getLiveSession } from '../../lib/liveSessions'
import { getOrCreateRoomForLiveSession } from '../../lib/chat'
import ZoomLive from '../../components/ZoomLive'
import ChatRoom from '../../components/ChatRoom'
import { PageTitle, ErrorBox, Loading } from './ui'
import { IArrowLeft } from '../../components/icons'

export default function AulaAoVivo() {
  const { id } = useParams()
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const s = await getLiveSession(id)
        if (!s) { setErr('aula não encontrada'); return }
        setSession(s)
        const room = await getOrCreateRoomForLiveSession(s.id, s.title)
        setRoomId(room.id)
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <Loading />
  if (err) return (
    <div>
      <ErrorBox>{err}</ErrorBox>
      <Link to="/app/aulas" className="btn btn-ghost" style={{ marginTop: 12 }}>← voltar</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ marginBottom: 14 }}>
        <Link to="/app/aulas" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          <IArrowLeft size={12} stroke={1.6} /> voltar pras aulas
        </Link>
      </div>

      <PageTitle
        eyebrow="AO VIVO"
        sub={session.host_name ? `com ${session.host_name}` : null}
      >
        {session.title}
      </PageTitle>

      <div style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'minmax(0, 1fr) 340px',
      }}>
        <div>
          <ZoomLive
            meetingNumber={session.zoom_meeting_id}
            passcode={session.zoom_passcode}
            onLeave={() => nav('/app/aulas')}
          />
        </div>
        {roomId && <ChatRoom roomId={roomId} title="chat da aula" height={640} />}
      </div>

      {session.description && (
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <div className="label-muted" style={{ fontSize: 10, marginBottom: 8 }}>SOBRE ESSA AULA</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {session.description}
          </div>
        </div>
      )}
    </div>
  )
}
