import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyProfile } from '../../lib/profile'
import { uploadAvatar } from '../../lib/storage'
import { useAuth } from '../../auth/AuthContext'
import { PageTitle, Section, ErrorBox, Loading } from './ui'
import { ICheck, IX } from '../../components/icons'

export default function Settings() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [draft, setDraft] = useState({})

  // Password change
  const [pwOpen, setPwOpen] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  async function reload() {
    try {
      const p = await getMyProfile()
      setProfile(p)
      setDraft({
        name: p?.name || '',
        whatsapp: p?.whatsapp || '',
        avatar_url: p?.avatar_url || '',
      })
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [])

  async function saveProfile() {
    setSaving(true); setErr(null); setMsg(null)
    try {
      const { error } = await supabase.from('profiles').update({
        name: draft.name?.trim() || null,
        whatsapp: draft.whatsapp?.trim() || null,
        avatar_url: draft.avatar_url || null,
      }).eq('id', user.id)
      if (error) throw error
      setMsg('✓ perfil salvo')
      setTimeout(() => setMsg(null), 3000)
      await reload()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  async function changePassword() {
    setErr(null); setMsg(null)
    if (newPw.length < 6) return setErr('senha mínimo 6 caracteres')
    if (newPw !== confirmPw) return setErr('senhas não conferem')
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      setMsg('✓ senha atualizada')
      setNewPw(''); setConfirmPw(''); setPwOpen(false)
      setTimeout(() => setMsg(null), 3000)
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  async function onAvatarFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadingAvatar(true); setErr(null)
    try {
      const { url } = await uploadAvatar(f)
      setDraft(d => ({ ...d, avatar_url: url }))
      // auto-save avatar
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setMsg('✓ avatar atualizado')
      setTimeout(() => setMsg(null), 3000)
      await reload()
    } catch (ex) { setErr(ex.message) } finally { setUploadingAvatar(false); e.target.value = '' }
  }

  if (loading) return <Loading />

  const initial = (profile?.name?.[0] || user?.email?.[0] || 'M').toUpperCase()

  return (
    <div style={{ maxWidth: 680 }}>
      <PageTitle eyebrow="CONTA" sub="seus dados pessoais, avatar e senha.">
        configurações
      </PageTitle>

      {err && <ErrorBox>{err}</ErrorBox>}
      {msg && (
        <div style={{ padding: '8px 12px', background: '#22c55e15', border: '1px solid #22c55e44', borderRadius: 6, color: 'var(--up)', fontSize: 12, marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {/* Avatar */}
      <Section title="avatar">
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          {draft.avatar_url ? (
            <img src={draft.avatar_url} alt="avatar" style={{
              width: 72, height: 72, borderRadius: 12, objectFit: 'cover',
              border: '1px solid rgba(255,255,255,0.1)',
            }} onError={e => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 12,
              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
              color: '#0a0a0e', fontSize: 32, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{initial}</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
              sua foto
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              JPG/PNG/WebP até 2 MB
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="btn btn-outline-cyan" style={{ cursor: uploadingAvatar ? 'wait' : 'pointer' }}>
                {uploadingAvatar ? 'enviando...' : '📷 trocar foto'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarFile} style={{ display: 'none' }} disabled={uploadingAvatar} />
              </label>
              {draft.avatar_url && (
                <button onClick={() => setDraft(d => ({ ...d, avatar_url: '' }))} className="btn btn-ghost">
                  remover
                </button>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Dados */}
      <Section title="dados pessoais">
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="nome">
            <input className="input" value={draft.name || ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          </Field>
          <Field label="whatsapp">
            <input className="input" placeholder="(11) 99999-9999" value={draft.whatsapp || ''} onChange={e => setDraft(d => ({ ...d, whatsapp: e.target.value }))} />
          </Field>
          <Field label="email (read-only)">
            <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveProfile} disabled={saving} className="btn btn-primary">
              {saving ? 'salvando...' : 'salvar'}
            </button>
          </div>
        </div>
      </Section>

      {/* Senha */}
      <Section title="senha">
        {!pwOpen ? (
          <button onClick={() => setPwOpen(true)} className="btn btn-outline-cyan">
            alterar senha
          </button>
        ) : (
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="nova senha (mín 6)">
              <input className="input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoFocus />
            </Field>
            <Field label="confirmar">
              <input className="input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={changePassword} disabled={saving || !newPw} className="btn btn-primary">
                {saving ? 'salvando...' : 'atualizar senha'}
              </button>
              <button onClick={() => { setPwOpen(false); setNewPw(''); setConfirmPw('') }} className="btn btn-ghost">cancelar</button>
            </div>
          </div>
        )}
      </Section>

      {/* Status + rank (read-only info) */}
      <Section title="status na matilha">
        <div className="card" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
          <InfoStat label="STATUS" value={profile?.status || 'pendente'} />
          <InfoStat label="BADGE" value={profile?.current_badge || '—'} />
          <InfoStat label="ROLES" value={(profile?.roles || ['individual']).join(', ')} />
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
          status e rank são gerenciados pelo monitor.
        </div>
      </Section>
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

function InfoStat({ label, value }) {
  return (
    <div>
      <div className="label-muted" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}
