import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import Hound from '../components/Hound'
import { IArrowRight } from '../components/icons'

export default function Login() {
  const { signIn, user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const from = loc.state?.from?.pathname || '/app/inicio'

  const [mode, setMode] = useState('login') // 'login' | 'trial'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (user) nav(from, { replace: true }) }, [user, nav, from])
  if (user) return null

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null); setMsg(null); setBusy(true)
    try {
      if (mode === 'trial') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name } },
        })
        if (error) throw error
        if (data.session) nav(from, { replace: true })
        else { setMsg('conta criada. tenta entrar agora.'); setMode('login') }
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
        nav(from, { replace: true })
      }
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const isTrial = mode === 'trial'

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--body)',
      backgroundImage: 'radial-gradient(ellipse 600px 400px at 30% 10%, #00d9ff14 0%, transparent 55%), radial-gradient(ellipse 500px 400px at 70% 80%, #a855f714 0%, transparent 55%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative',
    }}>
      {/* Logo topo */}
      <div style={{ position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--cyan)', filter: 'drop-shadow(0 0 8px var(--cyan))' }}>
          <polygon points="7 1 13 12 1 12" fill="currentColor" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.24em', color: 'var(--text-primary)' }}>MATILHA</span>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>ÁREA DA MATILHA</div>
          <h1 className="display" style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 6 }}>
            {isTrial ? 'criar acesso' : 'acesso exclusivo'}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {isTrial ? 'teste a área do mentorado — sem custo' : 'só pra mentorados do Tradesystem'}
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {isTrial && (
            <Field label="nome">
              <input className="input-underline" type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="teu nome" />
            </Field>
          )}
          <Field label="email">
            <input className="input-underline" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus={!isTrial} placeholder="nome@exemplo.com" />
          </Field>
          <Field label="senha">
            <input className="input-underline" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={isTrial ? 6 : undefined} required placeholder={isTrial ? 'mínimo 6 caracteres' : '••••••••'} />
          </Field>

          {err && <div style={{ padding: '8px 10px', background: '#ef444415', border: '1px solid #ef444444', borderRadius: 6, color: 'var(--down)', fontSize: 12 }}>{err}</div>}
          {msg && <div style={{ padding: '8px 10px', background: '#22c55e15', border: '1px solid #22c55e44', borderRadius: 6, color: 'var(--up)', fontSize: 12 }}>{msg}</div>}

          <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 12.5, marginTop: 4 }}>
            {busy ? '...' : (isTrial ? 'criar conta' : 'entrar')}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => { setMode(isTrial ? 'login' : 'trial'); setErr(null); setMsg(null) }}
            style={{ background: 'transparent', border: 'none', color: 'var(--amber)', fontSize: 11, letterSpacing: 0.5, cursor: 'pointer', padding: 4 }}
          >
            {isTrial ? '← já sou mentorado' : 'criar conta de teste →'}
          </button>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 24px' }}>
        <a href="/" style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          ← voltar pro Hound · v2.4.0
        </a>
        <div style={{ opacity: 0.75 }}>
          <Hound size={32} />
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
