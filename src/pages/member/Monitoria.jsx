import React, { useEffect, useMemo, useState } from 'react'
import {
  listAvailableSlots, listMySessions, requestSlot, cancelSlot, fetchUsersForSlots,
  SESSION_CATEGORIES, SESSION_PRIORITIES,
} from '../../lib/slots'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import { ICalendar, IArrowRight, IX, IClock, ICheck, IUsers, IChevronRight } from '../../components/icons'

const STATUS_META = {
  disponivel:  { label: 'disponível',   color: 'var(--up)',    tone: 'pill-up' },
  solicitado:  { label: 'solicitado',   color: 'var(--cyan)',  tone: 'pill-cyan' },
  reservado:   { label: 'reservado',    color: 'var(--purple)', tone: 'pill-purple' },
  concluido:   { label: 'concluído',    color: 'var(--text-muted)', tone: 'pill-gray' },
  cancelado:   { label: 'cancelado',    color: 'var(--down)',  tone: 'pill-down' },
  bloqueado:   { label: 'bloqueado',    color: 'var(--text-muted)', tone: 'pill-gray' },
  no_show:     { label: 'não compareceu', color: 'var(--red)', tone: 'pill-down' },
}

export default function Monitoria() {
  const [tab, setTab] = useState('agendar')
  return (
    <div style={{ maxWidth: 1000 }}>
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

// ============================================================
// AGENDAR — calendário + popup com slots + modal de solicitação
// ============================================================
function AgendarTab() {
  const [slots, setSlots] = useState([])
  const [users, setUsers] = useState({})
  const [monitorFilter, setMonitorFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDay, setSelectedDay] = useState(null)
  const [requestingSlot, setRequestingSlot] = useState(null) // { slot, monitor }

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

  const monitorList = useMemo(() => {
    const ids = new Set(slots.map(s => s.monitor_id))
    return [...ids].map(id => users[id]).filter(Boolean)
  }, [slots, users])

  const filteredSlots = useMemo(
    () => monitorFilter === 'all' ? slots : slots.filter(s => s.monitor_id === monitorFilter),
    [slots, monitorFilter]
  )

  const slotsByDay = useMemo(() => {
    const map = {}
    filteredSlots.forEach(s => {
      const k = isoDay(s.starts_at)
      ;(map[k] = map[k] || []).push(s)
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)))
    return map
  }, [filteredSlots])

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>

  return (
    <>
      {/* Filtro monitor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <MonitorFilterSelect value={monitorFilter} onChange={setMonitorFilter} monitors={monitorList} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 18 }} className="monitoria-grid">
        {/* Calendário */}
        <CalendarBlock
          cursor={cursor} onCursor={setCursor}
          slotsByDay={slotsByDay}
          selectedDay={selectedDay} onSelect={setSelectedDay}
        />

        {/* Painel lateral */}
        <DaySlots
          day={selectedDay}
          slots={selectedDay ? (slotsByDay[isoDay(selectedDay)] || []) : []}
          users={users}
          onPick={(slot, monitor) => setRequestingSlot({ slot, monitor })}
        />
      </div>

      {requestingSlot && (
        <RequestSlotModal
          slot={requestingSlot.slot}
          monitor={requestingSlot.monitor}
          onClose={() => setRequestingSlot(null)}
          onDone={async () => { setRequestingSlot(null); await load() }}
        />
      )}

      <style>{`
        @media (max-width: 820px) { .monitoria-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  )
}

function MonitorFilterSelect({ value, onChange, monitors }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 9,
      background: 'var(--surface-1)', border: '1px solid var(--border)',
    }}>
      <IUsers size={12} stroke={1.8} style={{ color: 'var(--text-muted)' }} />
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          background: 'transparent', border: 'none', color: 'var(--text-primary)',
          fontSize: 12.5, fontFamily: 'inherit', outline: 'none', appearance: 'none',
          paddingRight: 18, cursor: 'pointer',
        }}
      >
        <option value="all">Todos os monitores</option>
        {monitors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>▾</span>
    </div>
  )
}

function CalendarBlock({ cursor, onCursor, slotsByDay, selectedDay, onSelect }) {
  const year = cursor.getFullYear(), month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startOffset = first.getDay() // 0=dom
  const daysInMonth = last.getDate()
  const monthLabel = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const cells = []
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, i - startOffset + 1)
    cells.push({ date: d, outside: true })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(year, month, i), outside: false })
  }
  while (cells.length % 7 !== 0) {
    const d = new Date(cells[cells.length - 1].date)
    d.setDate(d.getDate() + 1)
    cells.push({ date: d, outside: true })
  }

  const todayKey = isoDay(new Date())
  const selKey = selectedDay ? isoDay(selectedDay) : null

  return (
    <div style={{
      padding: 18, borderRadius: 14,
      background: 'linear-gradient(180deg, rgba(18,22,32,0.72), rgba(14,16,22,0.78))',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => onCursor(new Date(year, month - 1, 1))} style={navBtn}>
          <IChevronRight size={14} stroke={1.8} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
          {monthLabel}
        </div>
        <button onClick={() => onCursor(new Date(year, month + 1, 1))} style={navBtn}>
          <IChevronRight size={14} stroke={1.8} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map(d => (
          <div key={d} style={{ fontSize: 9.5, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((c, i) => {
          const key = isoDay(c.date)
          const hasSlots = !c.outside && (slotsByDay[key] || []).length > 0
          const isSelected = key === selKey
          const isToday = key === todayKey
          const isPast = c.date < new Date(Date.now() - 86400000)
          return (
            <button
              key={i}
              onClick={() => hasSlots && !c.outside && onSelect(c.date)}
              disabled={c.outside || isPast || !hasSlots}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontFamily: 'var(--font-mono)',
                background: isSelected ? 'rgba(0,217,255,0.18)'
                  : hasSlots ? 'rgba(168,85,247,0.1)'
                  : 'transparent',
                border: `1px solid ${isSelected ? 'rgba(0,217,255,0.5)' : hasSlots ? 'rgba(168,85,247,0.22)' : 'transparent'}`,
                color: c.outside ? 'var(--text-faint)'
                  : isPast ? 'var(--text-faint)'
                  : isToday ? 'var(--cyan)'
                  : hasSlots ? 'var(--text-primary)'
                  : 'var(--text-muted)',
                fontWeight: isToday ? 700 : 500,
                cursor: hasSlots && !c.outside && !isPast ? 'pointer' : 'default',
                opacity: c.outside ? 0.3 : isPast ? 0.4 : 1,
                transition: 'all 120ms ease',
              }}
            >
              {c.date.getDate()}
              {hasSlots && (
                <span style={{
                  position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: 2,
                }}>
                  {[...Array(Math.min(3, slotsByDay[key].length))].map((_, j) => (
                    <span key={j} style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: isSelected ? 'var(--cyan)' : 'var(--purple)',
                    }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const navBtn = {
  width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

function DaySlots({ day, slots, users, onPick }) {
  if (!day) {
    return (
      <div style={{
        padding: 20, borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(18,22,32,0.6), rgba(14,16,22,0.65))',
        border: '1px solid rgba(255,255,255,0.05)',
        color: 'var(--text-muted)', fontSize: 12, textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 200, lineHeight: 1.5,
      }}>
        <ICalendar size={22} stroke={1.2} style={{ marginBottom: 8, opacity: 0.4 }} />
        Selecione um dia no calendário<br/>pra ver os horários disponíveis.
      </div>
    )
  }
  return (
    <div style={{
      padding: 20, borderRadius: 14,
      background: 'linear-gradient(180deg, rgba(18,22,32,0.72), rgba(14,16,22,0.78))',
      border: '1px solid rgba(0,217,255,0.18)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ICalendar size={14} stroke={1.8} style={{ color: 'var(--cyan)' }} />
        <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>
          {day.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
        Selecione um horário para agendar
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slots.map(s => {
          const monitor = users[s.monitor_id]
          return (
            <div key={s.id} style={{
              padding: 12, borderRadius: 10,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'rgba(0,217,255,0.08)',
                border: '1px solid rgba(0,217,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <IClock size={14} stroke={1.6} style={{ color: 'var(--cyan)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {fmtTime(s.starts_at)} – {fmtTime(new Date(new Date(s.starts_at).getTime() + (s.duration_min || 60) * 60000))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <IUsers size={10} stroke={1.6} /> {monitor?.name || 'monitor'}
                </div>
              </div>
              <button
                onClick={() => onPick(s, monitor)}
                className="btn btn-primary"
                style={{ fontSize: 11, padding: '7px 14px' }}
              >
                Solicitar
              </button>
            </div>
          )
        })}
      </div>
      <div style={{
        marginTop: 12, padding: '8px 10px', borderRadius: 6, fontSize: 10.5,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        color: 'var(--text-muted)', lineHeight: 1.5,
      }}>
        Após solicitar, aguarde a aprovação do monitor. Você receberá uma notificação quando for confirmado.
      </div>
    </div>
  )
}

// ============================================================
// REQUEST MODAL — motivo + categoria + prioridade
// ============================================================
function RequestSlotModal({ slot, monitor, onClose, onDone }) {
  const [motivo, setMotivo] = useState('')
  const [categoria, setCategoria] = useState('tecnico')
  const [prioridade, setPrioridade] = useState('rotina')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  async function submit() {
    setErr(null)
    if (motivo.trim().length < 5) { setErr('Descreva em pelo menos 5 caracteres o que quer tratar.'); return }
    setSubmitting(true)
    try {
      await requestSlot(slot.id, { motivo: motivo.trim(), categoria, prioridade })
      onDone()
    } catch (e) {
      setErr(e.message || 'falha ao solicitar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(6,7,12,0.72)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520,
        background: 'rgba(16,18,24,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: 24,
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Solicitar sessão</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4 }}>
            <IX size={14} stroke={1.8} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          {fmtLongDateTime(slot.starts_at)} · {slot.duration_min}min · com <b style={{ color: 'var(--text-secondary)' }}>{monitor?.name || 'monitor'}</b>
        </div>

        {/* Categoria */}
        <Field label="sobre o que você quer conversar?">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 4 }}>
            {SESSION_CATEGORIES.map(c => (
              <button key={c.code} onClick={() => setCategoria(c.code)}
                style={pillBtn(categoria === c.code, 'cyan')}>
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Motivo */}
        <Field label={`descreva (${motivo.length}/500)`}>
          <textarea
            value={motivo} onChange={e => setMotivo(e.target.value.slice(0, 500))}
            rows={3} placeholder="ex: tô travado depois de 3 stops seguidos, quero discutir o plano..."
            className="input"
            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 12.5 }}
          />
        </Field>

        {/* Prioridade */}
        <Field label="como você classifica a urgência?">
          <div style={{ display: 'flex', gap: 6 }}>
            {SESSION_PRIORITIES.map(p => (
              <button key={p.code} onClick={() => setPrioridade(p.code)}
                style={{
                  ...pillBtn(prioridade === p.code, 'purple'),
                  flex: 1, padding: '9px 10px',
                  ...(prioridade === p.code ? { borderColor: p.color, color: p.color } : {}),
                }}>
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6, lineHeight: 1.5 }}>
            <b>Rotina</b> respeita o limite de 1 sessão/semana. <b>Acompanhamento</b> e <b>tô precisando</b> podem pular a fila.
          </div>
        </Field>

        {err && (
          <div style={{
            padding: '8px 10px', borderRadius: 5, fontSize: 11.5,
            color: 'var(--red)', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)', marginBottom: 10,
          }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 11 }}>cancelar</button>
          <button onClick={submit} disabled={submitting} className="btn btn-primary" style={{ fontSize: 11 }}>
            <ICheck size={11} stroke={2.2} />
            {submitting ? 'enviando...' : 'solicitar sessão'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
      {children}
    </label>
  )
}

function pillBtn(active, color = 'cyan') {
  const bg = color === 'cyan'
    ? (active ? 'rgba(0,217,255,0.15)' : 'var(--surface-2)')
    : (active ? 'rgba(168,85,247,0.15)' : 'var(--surface-2)')
  const border = color === 'cyan'
    ? (active ? 'rgba(0,217,255,0.4)' : 'var(--border)')
    : (active ? 'rgba(168,85,247,0.4)' : 'var(--border)')
  return {
    padding: '7px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
    background: bg, border: `1px solid ${border}`,
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center',
    fontWeight: active ? 600 : 450,
  }
}

// ============================================================
// MINHAS SESSÕES
// ============================================================
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
  const past = sessions.filter(s => ['concluido', 'cancelado', 'no_show'].includes(s.status))

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
  const meta = STATUS_META[s.status] || STATUS_META.disponivel
  const catMeta = SESSION_CATEGORIES.find(c => c.code === s.request_categoria)
  return (
    <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'flex-start', gap: 14, opacity: past ? 0.7 : 1 }}>
      <ICalendar size={16} stroke={1.5} style={{ color: meta.color, marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
            {fmtLongDateTime(s.starts_at)} · {s.duration_min}min
          </span>
          <span className={`pill ${meta.tone}`} style={{ fontSize: 10 }}>{meta.label}</span>
          {s.request_prioridade === 'urgente' && !past && (
            <span className="pill" style={{ fontSize: 9, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
              🔴 urgente
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          com {monitor?.name || 'monitor'}
          {catMeta && <> · {catMeta.emoji} {catMeta.label}</>}
        </div>
        {s.request_motivo && (
          <div style={{
            fontSize: 11.5, color: 'var(--text-secondary)', fontStyle: 'italic',
            padding: '6px 10px', borderLeft: '2px solid var(--border)',
            marginTop: 4,
          }}>
            "{s.request_motivo}"
          </div>
        )}
      </div>
      {s.meeting_url && s.status === 'reservado' && (
        <a href={s.meeting_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ fontSize: 11, flexShrink: 0 }}>
          entrar <IArrowRight size={11} stroke={2} />
        </a>
      )}
      {!past && s.status !== 'concluido' && (
        <button onClick={() => onCancel(s.id)} className="btn btn-ghost" style={{ padding: 6, flexShrink: 0 }}>
          <IX size={12} stroke={1.8} />
        </button>
      )}
    </div>
  )
}

// ============================================================
// HELPERS
// ============================================================
function isoDay(d) {
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtLongDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
