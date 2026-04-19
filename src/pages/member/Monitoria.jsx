import React, { useEffect, useState } from 'react'
import {
  listAvailableSlots, listMySessions, requestSlot, cancelSlot, fetchUsersForSlots,
} from '../../lib/slots'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import { ICalendar, IArrowRight, IX } from '../../components/icons'

const STATUS_META = {
  disponivel:  { label: 'disponível',   color: 'var(--up)',    tone: 'pill-up' },
  solicitado:  { label: 'solicitado',   color: 'var(--cyan)',  tone: 'pill-cyan' },
  reservado:   { label: 'reservado',    color: 'var(--purple)', tone: 'pill-purple' },
  concluido:   { label: 'concluído',    color: 'var(--text-muted)', tone: 'pill-gray' },
  cancelado:   { label: 'cancelado',    color: 'var(--down)',  tone: 'pill-down' },
  bloqueado:   { label: 'bloqueado',    color: 'var(--text-muted)', tone: 'pill-gray' },
}

export default function Monitoria() {
  const [tab, setTab] = useState('agendar')
  return (
    <div style={{ maxWidth: 900 }}>
      <PageTitle eyebrow="MONITORIA" sub="sessões individuais com monitores da matilha.">
        acompanhamento
      </PageTitle>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        <button onClick={() => setTab('agendar')} className={tab === 'agendar' ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer' }}>
          agendar horário
        </button>
        <button onClick={() => setTab('minhas')} className={tab === 'minhas' ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer' }}>
          minhas sessões
        </button>
      </div>

      {tab === 'agendar' ? <AgendarTab /> : <MinhasSessoesTab />}
    </div>
  )
}

function AgendarTab() {
  const [slots, setSlots] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [requesting, setRequesting] = useState(null)

  async function load() {
    try {
      const from = new Date().toISOString()
      const data = await listAvailableSlots({ from })
      setSlots(data)
      setUsers(await fetchUsersForSlots(data))
    } catch (e) {
      if (/monitor_slots|does not exist/i.test(e.message)) setErr('rode 0010_monitor_features.sql.')
      else setErr(e.message)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function onRequest(slotId) {
    setRequesting(slotId)
    try {
      await requestSlot(slotId)
      await load()
    } catch (e) { alert(e.message) } finally { setRequesting(null) }
  }

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>

  // group by date
  const byDate = {}
  slots.forEach(s => {
    const d = new Date(s.starts_at).toISOString().slice(0, 10)
    byDate[d] = byDate[d] || []
    byDate[d].push(s)
  })
  const dates = Object.keys(byDate).sort()

  if (dates.length === 0) {
    return <Placeholder title="nenhum horário disponível" subtitle="os monitores não abriram horários ainda. volta mais tarde." />
  }

  return (
    <Section title={`horários disponíveis · ${slots.length}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {dates.map(d => (
          <div key={d}>
            <div className="label-muted" style={{ marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
              {fmtDate(d)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
              {byDate[d].map(s => {
                const monitor = users[s.monitor_id]
                return (
                  <div key={s.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                        {fmtTime(s.starts_at)} · {s.duration_min}min
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {monitor?.name || 'monitor'}
                      </div>
                    </div>
                    <button
                      onClick={() => onRequest(s.id)}
                      disabled={requesting === s.id}
                      className="btn btn-outline-cyan"
                      style={{ fontSize: 11 }}
                    >
                      {requesting === s.id ? '...' : 'solicitar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function MinhasSessoesTab() {
  const [sessions, setSessions] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  async function load() {
    try {
      const data = await listMySessions()
      setSessions(data)
      setUsers(await fetchUsersForSlots(data))
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function onCancel(id) {
    if (!confirm('cancelar sessão?')) return
    try { await cancelSlot(id); await load() } catch (e) { alert(e.message) }
  }

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>

  if (sessions.length === 0) {
    return <Placeholder title="nenhuma sessão" subtitle="solicite um horário na aba anterior pra começar." />
  }

  const upcoming = sessions.filter(s => ['solicitado', 'reservado'].includes(s.status))
  const past = sessions.filter(s => ['concluido', 'cancelado'].includes(s.status))

  return (
    <>
      {upcoming.length > 0 && (
        <Section title="próximas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map(s => <SessionCard key={s.id} session={s} monitor={users[s.monitor_id]} onCancel={onCancel} />)}
          </div>
        </Section>
      )}

      {past.length > 0 && (
        <Section title="histórico">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {past.map(s => <SessionCard key={s.id} session={s} monitor={users[s.monitor_id]} onCancel={onCancel} past />)}
          </div>
        </Section>
      )}
    </>
  )
}

function SessionCard({ session: s, monitor, onCancel, past }) {
  const meta = STATUS_META[s.status]
  return (
    <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14, opacity: past ? 0.7 : 1 }}>
      <ICalendar size={16} stroke={1.5} style={{ color: meta.color }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
          {fmtDateTime(s.starts_at)} · {s.duration_min}min
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          com {monitor?.name || 'monitor'}
        </div>
      </div>
      <span className={`pill ${meta.tone}`} style={{ fontSize: 10 }}>{meta.label}</span>
      {s.meeting_url && s.status === 'reservado' && (
        <a href={s.meeting_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ fontSize: 11 }}>
          entrar <IArrowRight size={11} stroke={2} />
        </a>
      )}
      {!past && s.status !== 'concluido' && (
        <button onClick={() => onCancel(s.id)} className="btn btn-ghost" style={{ padding: 6 }}>
          <IX size={12} stroke={1.8} />
        </button>
      )}
    </div>
  )
}

function fmtDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
