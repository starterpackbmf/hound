import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listMyMonitorSlots, createSlot, confirmSlot, cancelSlot, fetchUsersForSlots, markNoShow,
  SESSION_CATEGORIES, SESSION_PRIORITIES,
} from '../../lib/slots'
import { createNote, NOTE_TAGS } from '../../lib/sessionNotes'
import { supabase } from '../../lib/supabase'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from '../member/ui'
import { ICalendar, IPlus, IX, ICheck, IArrowRight, IUsers } from '../../components/icons'

const STATUS_META = {
  disponivel:  { label: 'disponível',   tone: 'pill-up' },
  solicitado:  { label: 'solicitado',   tone: 'pill-cyan' },
  reservado:   { label: 'reservado',    tone: 'pill-purple' },
  concluido:   { label: 'concluído',    tone: 'pill-gray' },
  cancelado:   { label: 'cancelado',    tone: 'pill-down' },
  bloqueado:   { label: 'bloqueado',    tone: 'pill-gray' },
  no_show:     { label: 'não compareceu', tone: 'pill-down' },
}

const PRIORITY_ORDER = { urgente: 0, acompanhamento: 1, rotina: 2 }

export default function MinhaAgenda() {
  const [slots, setSlots] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newSlot, setNewSlot] = useState({ date: '', time: '09:00', duration_min: 60 })
  const [confirmingSlot, setConfirmingSlot] = useState(null)
  const [concludingSlot, setConcludingSlot] = useState(null)

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

  async function onCancel(slotId) {
    if (!confirm('cancelar slot?')) return
    try { await cancelSlot(slotId); await load() } catch (e) { alert(e.message) }
  }

  async function onNoShow(slotId) {
    if (!confirm('marcar como "não compareceu"? 2 no-shows em 30d trava o aluno.')) return
    try { await markNoShow(slotId); await load() } catch (e) { alert(e.message) }
  }

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>

  const requested = slots.filter(s => s.status === 'solicitado')
    .sort((a, b) => (PRIORITY_ORDER[a.request_prioridade] || 9) - (PRIORITY_ORDER[b.request_prioridade] || 9))
  const upcoming = slots.filter(s => s.status === 'reservado' && new Date(s.starts_at) > new Date())
  const awaitingWrapUp = slots.filter(s => s.status === 'reservado' && new Date(s.starts_at) <= new Date())
  const available = slots.filter(s => s.status === 'disponivel')
  const past = slots.filter(s => ['concluido', 'cancelado', 'no_show'].includes(s.status))

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
            {requested.map(s => (
              <RequestCard key={s.id} slot={s} student={users[s.student_id]}
                onApprove={() => setConfirmingSlot(s)}
                onCancel={() => onCancel(s.id)} />
            ))}
          </div>
        </Section>
      )}

      {awaitingWrapUp.length > 0 && (
        <Section title="📝 sessões pra registrar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {awaitingWrapUp.map(s => (
              <ReservedCard key={s.id} slot={s} student={users[s.student_id]}
                onConclude={() => setConcludingSlot(s)}
                onNoShow={() => onNoShow(s.id)}
                onCancel={() => onCancel(s.id)} />
            ))}
          </div>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="próximas sessões">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map(s => (
              <ReservedCard key={s.id} slot={s} student={users[s.student_id]}
                onCancel={() => onCancel(s.id)} />
            ))}
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

      {confirmingSlot && (
        <ApproveModal slot={confirmingSlot} student={users[confirmingSlot.student_id]}
          onClose={() => setConfirmingSlot(null)}
          onDone={async () => { setConfirmingSlot(null); await load() }} />
      )}
      {concludingSlot && (
        <ConcludeModal slot={concludingSlot} student={users[concludingSlot.student_id]}
          onClose={() => setConcludingSlot(null)}
          onDone={async () => { setConcludingSlot(null); await load() }} />
      )}
    </div>
  )
}

// ============================================================
// REQUEST CARD — solicitação pendente com contexto
// ============================================================
function RequestCard({ slot: s, student, onApprove, onCancel }) {
  const catMeta = SESSION_CATEGORIES.find(c => c.code === s.request_categoria)
  const prioMeta = SESSION_PRIORITIES.find(p => p.code === s.request_prioridade)
  const isUrgent = s.request_prioridade === 'urgente'

  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: isUrgent ? 'rgba(239,68,68,0.04)' : 'var(--surface-1)',
      border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <ICalendar size={12} stroke={1.6} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>
              {fmtDateTime(s.starts_at)} · {s.duration_min}min
            </span>
            {prioMeta && (
              <span className="pill" style={{
                fontSize: 9, fontWeight: 700, borderColor: `${prioMeta.color}55`,
                color: prioMeta.color, background: `${prioMeta.color}10`,
              }}>
                {prioMeta.emoji} {prioMeta.label}
              </span>
            )}
            {catMeta && (
              <span className="pill" style={{ fontSize: 9 }}>
                {catMeta.emoji} {catMeta.label}
              </span>
            )}
          </div>
          {student && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <IUsers size={10} stroke={1.6} />
              <Link to={`/mentor/alunos/${student.id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
                {student.name || 'aluno'}
              </Link>
              {student.whatsapp && (
                <a href={`https://wa.me/${String(student.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--green)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                  · 📱
                </a>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onApprove} className="btn btn-primary" style={{ fontSize: 11 }}>
            <ICheck size={11} stroke={2.2} /> aprovar
          </button>
          <button onClick={onCancel} className="btn btn-ghost" style={{ fontSize: 11 }}>
            <IX size={11} stroke={1.8} />
          </button>
        </div>
      </div>
      {s.request_motivo && (
        <div style={{
          fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5,
          padding: '8px 12px', borderLeft: '2px solid rgba(168,85,247,0.4)',
          background: 'rgba(168,85,247,0.04)', borderRadius: '0 6px 6px 0',
          fontStyle: 'italic',
        }}>
          "{s.request_motivo}"
        </div>
      )}
    </div>
  )
}

// ============================================================
// RESERVED CARD — sessão confirmada, com opção de concluir
// ============================================================
function ReservedCard({ slot: s, student, onConclude, onNoShow, onCancel }) {
  const catMeta = SESSION_CATEGORIES.find(c => c.code === s.request_categoria)
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <ICalendar size={14} stroke={1.6} style={{ color: 'var(--purple)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
            {fmtDateTime(s.starts_at)} · {s.duration_min}min
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
            {student && (
              <Link to={`/mentor/alunos/${student.id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
                {student.name || 'aluno'}
              </Link>
            )}
            {catMeta && <>· {catMeta.emoji} {catMeta.label}</>}
          </div>
        </div>
        {s.meeting_url && (
          <a href={s.meeting_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 11 }}>
            link da call <IArrowRight size={11} stroke={1.8} />
          </a>
        )}
        {onConclude && (
          <button onClick={onConclude} className="btn btn-primary" style={{ fontSize: 11 }}>
            <ICheck size={11} stroke={2.2} /> concluir
          </button>
        )}
        {onNoShow && (
          <button onClick={onNoShow} className="btn btn-ghost" style={{ fontSize: 11, color: 'var(--red)' }}>
            no-show
          </button>
        )}
        {onCancel && (
          <button onClick={onCancel} className="btn btn-ghost" style={{ padding: 6 }}>
            <IX size={12} stroke={1.8} />
          </button>
        )}
      </div>
      {s.request_motivo && (
        <div style={{
          fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5,
          marginTop: 8, padding: '6px 10px', borderLeft: '2px solid var(--border)',
          fontStyle: 'italic',
        }}>
          "{s.request_motivo}"
        </div>
      )}
    </div>
  )
}

// ============================================================
// APPROVE MODAL — colar meet link
// ============================================================
function ApproveModal({ slot, student, onClose, onDone }) {
  const [meetingUrl, setMeetingUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  async function submit() {
    setSubmitting(true); setErr(null)
    try {
      await confirmSlot(slot.id, meetingUrl.trim() || null)
      onDone()
    } catch (e) { setErr(e.message) } finally { setSubmitting(false) }
  }

  return (
    <Backdrop onClose={onClose}>
      <Card>
        <Header title="Aprovar sessão" onClose={onClose} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          {fmtDateTime(slot.starts_at)} · com <b style={{ color: 'var(--text-secondary)' }}>{student?.name || 'aluno'}</b>
        </div>
        {slot.request_motivo && (
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontStyle: 'italic',
            padding: '8px 12px', borderLeft: '2px solid rgba(168,85,247,0.4)',
            background: 'rgba(168,85,247,0.04)', marginBottom: 14, borderRadius: '0 6px 6px 0' }}>
            "{slot.request_motivo}"
          </div>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
            link da call (Google Meet / Zoom / Jitsi)
          </span>
          <input className="input" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/..." style={{ fontSize: 12 }} autoFocus />
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
            Pode deixar em branco e preencher depois.
          </span>
        </label>
        {err && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 11 }}>cancelar</button>
          <button onClick={submit} disabled={submitting} className="btn btn-primary" style={{ fontSize: 11 }}>
            <ICheck size={11} stroke={2.2} /> {submitting ? 'aprovando...' : 'aprovar'}
          </button>
        </div>
      </Card>
    </Backdrop>
  )
}

// ============================================================
// CONCLUDE MODAL — registra nota da sessão + marca concluído
// ============================================================
function ConcludeModal({ slot, student, onClose, onDone }) {
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState([])
  const [nextSteps, setNextSteps] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  function toggleTag(t) {
    setTags(curr => curr.includes(t) ? curr.filter(x => x !== t) : [...curr, t])
  }

  async function submit() {
    if (summary.trim().length < 10) { setErr('Resume em pelo menos 10 caracteres o que foi trabalhado.'); return }
    setSubmitting(true); setErr(null)
    try {
      await createNote({
        session_id: slot.id,
        student_id: slot.student_id,
        summary_md: summary,
        tags,
        next_steps_md: nextSteps || null,
      })
      await supabase.from('monitor_slots')
        .update({ status: 'concluido', completed_at: new Date().toISOString() })
        .eq('id', slot.id)
      onDone()
    } catch (e) { setErr(e.message) } finally { setSubmitting(false) }
  }

  return (
    <Backdrop onClose={onClose}>
      <Card wider>
        <Header title="Concluir sessão" onClose={onClose} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          {fmtDateTime(slot.starts_at)} · com <b style={{ color: 'var(--text-secondary)' }}>{student?.name || 'aluno'}</b>
        </div>

        <Field label={`o que foi trabalhado? (${summary.length}/800)`}>
          <textarea value={summary} onChange={e => setSummary(e.target.value.slice(0, 800))}
            rows={4} placeholder="Trabalhamos a regra dos 3 stops diários, revisamos 5 trades da semana..."
            className="input" style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 12.5 }} />
        </Field>

        <Field label="tags">
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {NOTE_TAGS.map(t => (
              <button key={t} onClick={() => toggleTag(t)} style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 10.5, cursor: 'pointer',
                background: tags.includes(t) ? 'rgba(168,85,247,0.15)' : 'var(--surface-2)',
                border: `1px solid ${tags.includes(t) ? 'rgba(168,85,247,0.4)' : 'var(--border)'}`,
                color: tags.includes(t) ? 'var(--purple)' : 'var(--text-muted)',
                fontWeight: tags.includes(t) ? 600 : 450,
              }}>{t}</button>
            ))}
          </div>
        </Field>

        <Field label="próximos passos (opcional)">
          <textarea value={nextSteps} onChange={e => setNextSteps(e.target.value.slice(0, 400))}
            rows={2} placeholder="revisar trades até sexta, testar stop mental..."
            className="input" style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 12.5 }} />
        </Field>

        <div style={{
          padding: '8px 10px', borderRadius: 6, fontSize: 10.5,
          background: 'rgba(0,217,255,0.05)', border: '1px solid rgba(0,217,255,0.18)',
          color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12,
        }}>
          💡 Esta nota fica visível pra todos os monitores — se outro monitor pegar esse aluno, consegue consultar o histórico.
          Pra criar um plano de execução, vá na ficha do aluno.
        </div>

        {err && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          {student && (
            <Link to={`/mentor/alunos/${student.id}`} style={{ fontSize: 11, color: 'var(--cyan)', textDecoration: 'none' }}>
              ver ficha do aluno →
            </Link>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 11 }}>cancelar</button>
            <button onClick={submit} disabled={submitting} className="btn btn-primary" style={{ fontSize: 11 }}>
              <ICheck size={11} stroke={2.2} /> {submitting ? 'salvando...' : 'concluir e salvar nota'}
            </button>
          </div>
        </div>
      </Card>
    </Backdrop>
  )
}

// ============================================================
// bits
// ============================================================
function Backdrop({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(6,7,12,0.72)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520 }}>
        {children}
      </div>
    </div>
  )
}
function Card({ children, wider }) {
  return (
    <div style={{
      background: 'rgba(16,18,24,0.95)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: 24,
      boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      maxWidth: wider ? 600 : undefined, margin: '0 auto',
    }}>{children}</div>
  )
}
function Header({ title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
      <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4 }}>
        <IX size={14} stroke={1.8} />
      </button>
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
