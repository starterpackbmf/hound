import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getMyProfile } from '../../lib/profile'
import { getSetting, setSetting } from '../../lib/adminSettings'
import { IPlay, ICheck, ISettings } from '../../components/icons'

// Roles com acesso a essa tela: só admin + suporte
const STAFF_ROLES = ['admin', 'suporte']

export default function ConfigZoom() {
  const [gate, setGate] = useState('checking') // 'checking' | 'allowed' | 'denied'
  const [form, setForm] = useState({
    meeting_id: '',
    passcode: '',
    base_url: 'https://zoom.us/j/',
    duration_min: 90,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    getMyProfile()
      .then(p => {
        const roles = p?.roles || []
        setGate(roles.some(r => STAFF_ROLES.includes(r)) ? 'allowed' : 'denied')
      })
      .catch(() => setGate('denied'))
  }, [])

  useEffect(() => {
    if (gate !== 'allowed') return
    getSetting('zoom_live')
      .then(v => {
        if (v) setForm(f => ({ ...f, ...v }))
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [gate])

  async function onSave(e) {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      await setSetting('zoom_live', {
        meeting_id: String(form.meeting_id).replace(/\D/g, ''),
        passcode: String(form.passcode).trim(),
        base_url: String(form.base_url).trim() || 'https://zoom.us/j/',
        duration_min: Number(form.duration_min) || 90,
      })
      setSavedAt(new Date())
    } catch (e) {
      setErr(e.message || 'falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (gate === 'checking') {
    return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>verificando permissões...</div>
  }
  if (gate === 'denied') return <Navigate to="/mentor/visao-geral" replace />

  const mid = String(form.meeting_id || '').replace(/\D/g, '')
  const previewUrl = mid
    ? `${form.base_url}${mid}${form.passcode ? `?pwd=${encodeURIComponent(form.passcode)}` : ''}`
    : '—'

  return (
    <div style={{ maxWidth: 720 }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 9, letterSpacing: '0.18em', color: 'var(--amber)',
          padding: '3px 8px', borderRadius: 4,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          fontWeight: 700, textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          <ISettings size={10} stroke={2} />
          Admin + Suporte
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
          Configuração do Ao Vivo
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
          Sala fixa do Zoom que os alunos entram pelo botão <b>"Entrar no ao vivo"</b>.
          O link nunca é exposto pro aluno — o backend faz o redirect direto pro Zoom com
          o nome dele já preenchido (pra sua automação de presença funcionar).
        </p>
      </header>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>carregando...</div>
      ) : (
        <form onSubmit={onSave} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field
            label="Meeting ID"
            hint="só números, pode colar com espaço que eu limpo"
            value={form.meeting_id}
            onChange={v => setForm(f => ({ ...f, meeting_id: v }))}
            placeholder="123 456 7890"
            mono
          />
          <Field
            label="Passcode"
            hint="deixa em branco se a sala não tem senha"
            value={form.passcode}
            onChange={v => setForm(f => ({ ...f, passcode: v }))}
            placeholder="ex: matilha2025"
          />
          <Field
            label="Base URL"
            hint="padrão: https://zoom.us/j/ — só muda se você usa domínio vanity"
            value={form.base_url}
            onChange={v => setForm(f => ({ ...f, base_url: v }))}
            placeholder="https://zoom.us/j/"
            mono
          />
          <Field
            label="Duração padrão (min)"
            hint="usado pra calcular quando marcar feedback pendente, caso a aula não tenha hora de fim cadastrada"
            value={form.duration_min}
            onChange={v => setForm(f => ({ ...f, duration_min: v }))}
            placeholder="90"
            type="number"
            mono
          />

          <div style={{
            padding: '10px 12px', borderRadius: 6,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)', wordBreak: 'break-all',
          }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-faint)', marginBottom: 4, fontWeight: 600 }}>
              PREVIEW (ADMIN ONLY)
            </div>
            {previewUrl}
          </div>

          {err && (
            <div style={{
              padding: '8px 10px', borderRadius: 5, fontSize: 11.5,
              color: 'var(--red)', background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
            }}>
              {err}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {savedAt ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--green)' }}>
                  <ICheck size={11} stroke={2} />
                  salvo às {savedAt.toLocaleTimeString()}
                </span>
              ) : '—'}
            </span>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <IPlay size={12} stroke={2} />
              {saving ? 'salvando...' : 'salvar configuração'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Field({ label, hint, value, onChange, placeholder, mono, type = 'text' }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
        style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: 13 }}
      />
      {hint && (
        <div style={{ fontSize: 10.5, color: 'var(--text-faint)', lineHeight: 1.4 }}>{hint}</div>
      )}
    </label>
  )
}
