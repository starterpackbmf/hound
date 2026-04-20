import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { upsertLiveSession } from '../../lib/liveSessions'
import { IArrowLeft } from '../../components/icons'

function nowLocalIso() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function NovaAula() {
  const nav = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    host_name: '',
    zoom_meeting_id: '',
    zoom_passcode: '',
    starts_at: nowLocalIso(),
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true); setErr(null)
    try {
      const payload = {
        ...form,
        zoom_meeting_id: form.zoom_meeting_id.replace(/\s/g, ''),
        starts_at: new Date(form.starts_at).toISOString(),
      }
      if (!payload.title || !payload.zoom_meeting_id) {
        throw new Error('título e meeting ID são obrigatórios')
      }
      const saved = await upsertLiveSession(payload)
      nav(`/app/aulas/ao-vivo/${saved.id}`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/app/aulas" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <IArrowLeft size={12} stroke={1.6} /> voltar
        </Link>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>MONITORIA</div>
        <h1 className="display" style={{ fontSize: 24, fontWeight: 500, margin: 0 }}>agendar aula ao vivo</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          crie a reunião no zoom.us, copie o Meeting ID e Passcode, cole aqui. A sala abre embutida no app.
        </p>
      </div>

      {err && <div className="card" style={{ padding: 12, marginBottom: 16, borderColor: 'var(--down)', color: 'var(--down)', fontSize: 12 }}>{err}</div>}

      <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="título *">
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Open class · terça 20h" autoFocus />
        </Field>
        <Field label="descrição">
          <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="tema da aula, material complementar..." style={{ resize: 'vertical' }} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Field label="apresentador">
            <input className="input" value={form.host_name} onChange={e => set('host_name', e.target.value)} placeholder="Mateus Schwartz" />
          </Field>
          <Field label="início *">
            <input className="input" type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Field label="zoom meeting ID *">
            <input className="input" value={form.zoom_meeting_id} onChange={e => set('zoom_meeting_id', e.target.value)} placeholder="123 456 7890" inputMode="numeric" />
          </Field>
          <Field label="passcode">
            <input className="input" value={form.zoom_passcode} onChange={e => set('zoom_passcode', e.target.value)} placeholder="opcional" />
          </Field>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? 'criando...' : 'criar aula'}
        </button>
        <Link to="/app/aulas" className="btn btn-ghost">cancelar</Link>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="label-muted">{label}</span>
      {children}
    </label>
  )
}
