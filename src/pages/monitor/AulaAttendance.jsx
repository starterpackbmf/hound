import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getLiveSession } from '../../lib/liveSessions'
import { PageTitle, Loading, ErrorBox, Placeholder } from '../member/ui'
import { IArrowLeft } from '../../components/icons'

export default function AulaAttendance() {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const s = await getLiveSession(id)
        if (!s) { setErr('aula não encontrada'); return }
        setSession(s)

        const { data: room } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('live_session_id', id)
          .maybeSingle()

        if (!room) { setLoading(false); return }

        const [attRes, msgRes] = await Promise.all([
          supabase.from('chat_attendance').select('user_id, joined_at').eq('room_id', room.id),
          supabase.from('chat_messages').select('user_id, body, created_at').eq('room_id', room.id).order('created_at'),
        ])
        const uniqueAttendees = new Map()
        ;(attRes.data || []).forEach(a => {
          const prev = uniqueAttendees.get(a.user_id)
          if (!prev || new Date(a.joined_at) < new Date(prev.joined_at)) {
            uniqueAttendees.set(a.user_id, a)
          }
        })
        setAttendees([...uniqueAttendees.values()])
        setMessages(msgRes.data || [])

        // Enrich with profile names
        const userIds = [...new Set([
          ...uniqueAttendees.keys(),
          ...(msgRes.data || []).map(m => m.user_id),
        ])]
        if (userIds.length > 0) {
          const { data: profs } = await supabase.from('profiles').select('id, name, roles').in('id', userIds)
          const map = {}
          ;(profs || []).forEach(p => { map[p.id] = p })
          setAttendees(list => list.map(a => ({ ...a, profile: map[a.user_id] })))
          setMessages(list => list.map(m => ({ ...m, profile: map[m.user_id] })))
        }
      } catch (e) {
        setErr(e.message)
      } finally { setLoading(false) }
    })()
  }, [id])

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>
  if (!session) return <Placeholder title="aula não encontrada" />

  const msgCount = messages.length
  const participantSet = new Set([
    ...attendees.map(a => a.user_id),
    ...messages.map(m => m.user_id),
  ])

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 14 }}>
        <Link to="/mentor/visao-geral" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <IArrowLeft size={12} stroke={1.6} /> voltar
        </Link>
      </div>

      <PageTitle
        eyebrow="AULA · RELATÓRIO"
        sub={new Date(session.starts_at).toLocaleString('pt-BR')}
      >
        {session.title}
      </PageTitle>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 24 }}>
        <Stat label="PARTICIPARAM" value={participantSet.size} />
        <Stat label="ENTRARAM NO CHAT" value={attendees.length} />
        <Stat label="MENSAGENS" value={msgCount} />
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section>
          <div style={{ marginBottom: 12 }}><span className="label-muted">participantes ({attendees.length})</span></div>
          <div className="card" style={{ padding: 10 }}>
            {attendees.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 10 }}>ninguém entrou no chat</div>
            ) : (
              attendees.map(a => (
                <div key={a.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: 12 }}>
                  <span style={{ flex: 1, color: 'var(--text-primary)' }}>{a.profile?.name || '?'}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    entrou às {new Date(a.joined_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div style={{ marginBottom: 12 }}><span className="label-muted">timeline do chat ({msgCount})</span></div>
          <div className="card" style={{ padding: 10, maxHeight: 500, overflowY: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 10 }}>sem mensagens</div>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{ padding: '6px 8px', fontSize: 12, lineHeight: 1.5, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginRight: 6 }}>
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{m.profile?.name?.split(' ')[0] || '?'}:</strong>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{m.body}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card" style={{ padding: '11px 13px' }}>
      <div className="label-muted" style={{ fontSize: 9, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}
