import React, { useEffect, useState } from 'react'
import { getMyMentorshipSessions } from '../../lib/feedback'
import { listAvailableSlots, listMySessions, requestSlot, cancelSlot, fetchUsersForSlots } from '../../lib/slots'
import { PageTitle, Placeholder, Loading, ErrorBox } from './ui'

const TABS = [
  { id: 'agendar', label: '📅 agendar 1:1' },
  { id: 'minhas', label: '🎟 minhas reservas' },
  { id: 'historico', label: '📓 histórico' },
]

export default function Sessoes() {
  const [tab, setTab] = useState('agendar')
  return (
    <div style={{ maxWidth: 860 }}>
      <PageTitle eyebrow="MONITORIA" sub="agende uma sessão 1:1 com seu monitor ou revise os resumos das anteriores.">
        sessões
      </PageTitle>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? 'pill pill-active' : 'pill'}
            style={{ cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'agendar' && <AgendarTab />}
      {tab === 'minhas' && <MinhasReservasTab />}
      {tab === 'historico' && <HistoricoTab />}
    </div>
  )
}

function AgendarTab() {
  const [slots, setSlots] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [acting, setActing] = useState(null)

  async function reload() {
    setLoading(true); setErr(null)
    try {
      const s = await listAvailableSlots({ from: new Date().toISOString() })
      setSlots(s)
      setUsers(await fetchUsersForSlots(s))
    } catch (e) {
      if (/monitor_slots|does not exist/i.test(e.message)) setErr('rode supabase/migrations/0013_monitor_slots.sql primeiro.')
      else setErr(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [])

  async function onRequest(s) {
    const m = users[s.monitor_id]
    if (!confirm(`solicitar sessão com ${m?.name || 'monitor'} em ${fmtSlot(s.starts_at)}? o monitor precisa confirmar depois.`)) return
    setActing(s.id)
    try {
      await requestSlot(s.id)
      alert('✓ solicitado! você será avisado quando o monitor confirmar.')
      await reload()
    } catch (e) { alert(e.message) } finally { setActing(null) }
  }

  if (err) return <ErrorBox>{err}</ErrorBox>
  if (loading) return <Loading />
  if (slots.length === 0) {
    return <Placeholder title="sem horários abertos" subtitle="nenhum monitor disponibilizou slots. volta mais tarde." />
  }

  const byDay = {}
  slots.forEach(s => {
    const day = s.starts_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(s)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(byDay).map(([day, list]) => (
        <div key={day}>
          <div className="eyebrow" style={{ marginBottom: 10, color: 'var(--cyan)' }}>
            {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {list.map(s => {
              const m = users[s.monitor_id]
              return (
                <button
                  key={s.id}
                  onClick={() => onRequest(s)}
                  disabled={acting === s.id}
                  className="card card-hover"
                  style={{
                    padding: 14, textAlign: 'left', cursor: 'pointer',
                    background: 'var(--surface-1)', borderColor: 'var(--border)',
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                    {new Date(s.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    com <strong style={{ color: 'var(--text-secondary)' }}>{m?.name?.split(' ')[0] || 'monitor'}</strong> · {s.duration_min} min
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 600 }}>
                    {acting === s.id ? 'solicitando…' : '→ solicitar'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function MinhasReservasTab() {
  const [slots, setSlots] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)

  async function reload() {
    const s = await listMySessions().catch(() => [])
    setSlots(s)
    setUsers(await fetchUsersForSlots(s))
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  async function onCancel(id) {
    if (!confirm('cancelar a reserva?')) return
    try { await cancelSlot(id); await reload() } catch (e) { alert(e.message) }
  }

  if (loading) return <Loading />
  if (slots.length === 0) return <Placeholder title="sem reservas" subtitle="reserve um slot na aba 'agendar 1:1'." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {slots.map(s => {
        const m = users[s.monitor_id]
        const past = new Date(s.starts_at) < new Date()
        return (
          <div key={s.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 10, flexShrink: 0,
              background: s.status === 'cancelado' || past ? 'var(--surface-2)' : 'rgba(0,217,255,0.15)',
              color: s.status === 'cancelado' || past ? 'var(--text-muted)' : 'var(--cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>🎟</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {fmtSlot(s.starts_at)} · {s.duration_min}min
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                com {m?.name || 'monitor'}
              </div>
              {s.meeting_url && !past && s.status === 'confirmado' && (
                <a href={s.meeting_url} target="_blank" rel="noopener" style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 4, display: 'inline-block' }}>
                  → link da sala
                </a>
              )}
            </div>
            <span className="pill" style={{
              fontSize: 10,
              color: s.status === 'cancelado' ? 'var(--down)' : s.status === 'confirmado' ? 'var(--up)' : past ? 'var(--text-muted)' : 'var(--cyan)',
              borderColor: s.status === 'cancelado' ? 'var(--down)' : s.status === 'confirmado' ? 'var(--up)' : past ? 'var(--border)' : 'var(--cyan)',
            }}>
              {past && s.status !== 'cancelado' ? 'passada' : s.status}
            </span>
            {!past && s.status !== 'cancelado' && (
              <button onClick={() => onCancel(s.id)} className="btn btn-ghost" style={{ fontSize: 10 }}>cancelar</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HistoricoTab() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyMentorshipSessions().then(setList).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (list.length === 0) {
    return <Placeholder title="nenhuma sessão registrada" subtitle="depois de cada monitoria, o monitor registra um resumo que aparece aqui." />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {list.map(s => (
        <div key={s.id} className="card" style={{ padding: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 10, color: 'var(--purple)' }}>
            {new Date(s.session_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 14 }}>
            {s.summary}
          </div>
          <Field label="ajustes técnicos" value={s.technical_adjustments} />
          <Field label="observações emocionais" value={s.emotional_observations} />
          <Field label="estratégias sugeridas" value={s.suggested_strategies} />
          <Field label="próximo foco" value={s.next_focus} highlight />
        </div>
      ))}
    </div>
  )
}

function Field({ label, value, highlight }) {
  if (!value) return null
  return (
    <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${highlight ? 'var(--cyan)' : 'var(--border)'}` }}>
      <div style={{ fontSize: 9, color: highlight ? 'var(--cyan)' : 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 3, fontWeight: 500 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    </div>
  )
}

function fmtSlot(iso) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
