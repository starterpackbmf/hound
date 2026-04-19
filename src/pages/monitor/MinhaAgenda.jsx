import React, { useEffect, useState } from 'react'
import {
  listMyMonitorSlots, createSlot, confirmSlot, cancelSlot, fetchUsersForSlots,
} from '../../lib/slots'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from '../member/ui'
import { ICalendar, IPlus, IX, ICheck, IArrowRight } from '../../components/icons'

const STATUS_META = {
  disponivel:  { label: 'disponível',   tone: 'pill-up' },
  solicitado:  { label: 'solicitado',   tone: 'pill-cyan' },
  reservado:   { label: 'reservado',    tone: 'pill-purple' },
  concluido:   { label: 'concluído',    tone: 'pill-gray' },
  cancelado:   { label: 'cancelado',    tone: 'pill-down' },
  bloqueado:   { label: 'bloqueado',    tone: 'pill-gray' },
}

export default function MinhaAgenda() {
  const [slots, setSlots] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newSlot, setNewSlot] = useState({ date: '', time: '09:00', duration_min: 60 })

  async function load() {
    try {
      const from = new Date()
      from.setDate(from.getDate() - 7)
      const data = await listMyMonitorSlots({ from: from.toISOString() })
      setSlots(data)
      setUsers(await fetchUsersForSlots(data))
    } catch (e) {
      if (/monitor_slots|does not exist/i.test(e.message)) setErr('rode 0010_monitor_features.sql.')
      else setErr(e.message)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function onCreate() {
    if (!newSlot.date || !newSlot.time) return
    try {
      const starts_at = `${newSlot.date}T${newSlot.time}:00`
      await createSlot({ starts_at, duration_min: Number(newSlot.duration_min) })
      setCreating(false)
      setNewSlot({ date: '', time: '09:00', duration_min: 60 })
      await load()
    } catch (e) { alert(e.message) }
  }

  async function onConfirm(slotId) {
    const meetingUrl = prompt('link da sala (Zoom/Meet/Jitsi):', '')
    if (meetingUrl === null) return
    try {
      await confirmSlot(slotId, meetingUrl || null)
      await load()
    } catch (e) { alert(e.message) }
  }

  async function onCancel(slotId) {
    if (!confirm('cancelar slot?')) return
    try { await cancelSlot(slotId); await load() } catch (e) { alert(e.message) }
  }

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>

  const requested = slots.filter(s => s.status === 'solicitado')
  const upcoming = slots.filter(s => s.status === 'reservado' && new Date(s.starts_at) > new Date())
  const available = slots.filter(s => s.status === 'disponivel')
  const past = slots.filter(s => ['concluido', 'cancelado'].includes(s.status))

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageTitle eyebrow="ÁREA DO MONITOR">minha agenda</PageTitle>
        <button onClick={() => setCreating(v => !v)} className={creating ? 'btn' : 'btn btn-outline-cyan'}>
          {creating ? <><IX size={12} stroke={2} /> cancelar</> : <><IPlus size={12} stroke={2} /> abrir horário</>}
        </button>
      </div>

      {creating && (
        <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Field label="data">
            <input className="input" type="date" value={newSlot.date} onChange={e => setNewSlot({ ...newSlot, date: e.target.value })} />
          </Field>
          <Field label="horário">
            <input className="input" type="time" value={newSlot.time} onChange={e => setNewSlot({ ...newSlot, time: e.target.value })} />
          </Field>
          <Field label="duração (min)">
            <input className="input" type="number" min="15" step="15" value={newSlot.duration_min} onChange={e => setNewSlot({ ...newSlot, duration_min: e.target.value })} />
          </Field>
          <button onClick={onCreate} className="btn btn-primary">criar</button>
        </div>
      )}

      {requested.length > 0 && (
        <Section title={`🔔 solicitações pendentes · ${requested.length}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requested.map(s => <SlotCard key={s.id} slot={s} students={users} onConfirm={() => onConfirm(s.id)} onCancel={() => onCancel(s.id)} action="confirm" />)}
          </div>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="próximas sessões">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map(s => <SlotCard key={s.id} slot={s} students={users} onCancel={() => onCancel(s.id)} />)}
          </div>
        </Section>
      )}

      {available.length > 0 && (
        <Section title="disponíveis (sem solicitação ainda)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {available.map(s => <SlotCard key={s.id} slot={s} students={users} onCancel={() => onCancel(s.id)} compact />)}
          </div>
        </Section>
      )}

      {slots.length === 0 && (
        <Placeholder title="nenhum horário aberto" subtitle="abre um slot pra alunos solicitarem." />
      )}

      {past.length > 0 && (
        <Section title="histórico">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {past.slice(0, 20).map(s => <SlotCard key={s.id} slot={s} students={users} past />)}
          </div>
        </Section>
      )}
    </div>
  )
}

function SlotCard({ slot: s, students, onConfirm, onCancel, action, compact, past }) {
  const meta = STATUS_META[s.status]
  const student = s.student_id ? students[s.student_id] : null
  return (
    <div className="card" style={{
      padding: compact ? 10 : 14,
      display: 'flex', alignItems: 'center', gap: 12,
      opacity: past ? 0.6 : 1,
    }}>
      <ICalendar size={14} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
          {fmtDateTime(s.starts_at)} · {s.duration_min}min
        </div>
        {student && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>aluno: {student.name || '—'}</div>
        )}
      </div>
      <span className={`pill ${meta.tone}`} style={{ fontSize: 10 }}>{meta.label}</span>
      {action === 'confirm' && onConfirm && (
        <button onClick={onConfirm} className="btn btn-primary" style={{ fontSize: 11 }}>
          <ICheck size={11} stroke={2} /> confirmar
        </button>
      )}
      {!past && onCancel && (
        <button onClick={onCancel} className="btn btn-ghost" style={{ padding: 6 }}>
          <IX size={12} stroke={1.8} />
        </button>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="label-muted">{label}</span>
      {children}
    </div>
  )
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
