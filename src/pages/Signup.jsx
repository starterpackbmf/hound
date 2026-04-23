import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { IArrowRight, ICheck } from '../components/icons'

// Cadastro de mentorados (primeiro acesso).
// Trigger no banco auto-aprova quem tá em pre_approved_emails.
export default function Signup() {
  const { user } = useAuth()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [stage, setStage] = useState('form') // 'form' | 'success-active' | 'success-pending'

  useEffect(() => { if (user) nav('/app/inicio', { replace: true }) }, [user, nav])

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null); setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim(), whatsapp: whatsapp.trim() } },
      })
      if (error) throw error

      // Dá ~800ms pros triggers rodarem (ensure_profile + apply_pre_approval)
      // e consulta o profile pra ver se foi auto-aprovado.
      let isApproved = false
      if (data?.user?.id) {
        await new Promise(r => setTimeout(r, 800))
        const { data: prof } = await supabase
          .from('profiles').select('status').eq('id', data.user.id).maybeSingle()
        isApproved = prof?.status === 'ativo'
      }

      // Se já tem session (email confirmation off) e tá ativo, loga direto
      if (data.session && isApproved) {
        nav('/app/inicio', { replace: true })
        return
      }
      setStage(isApproved ? 'success-active' : 'success-pending')
    } catch (e) {
      const msg = String(e.message || e)
      if (msg.toLowerCase().includes('already registered') || msg.includes('User already registered')) {
        setErr('Esse email já tem conta. Use "já tenho conta" pra entrar.')
      } else {
        setErr(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  if (stage === 'success-active') {
    return <SuccessScreen
      title="Bem-vindo à Matilha"
      subtitle="Sua conta tá aprovada. Entre agora com seu email e senha."
      ctaLabel="entrar"
      ctaTo="/login"
    />
  }
  if (stage === 'success-pending') {
    return <SuccessScreen
      title="Cadastro recebido"
      subtitle="Sua conta tá aguardando aprovação do time. Você recebe uma mensagem pelo WhatsApp assim que for liberada."
      ctaLabel="voltar"
      ctaTo="/"
    />
  }

  return (
    <div style={pageStyle}>
      {/* Logo */}
      <div style={logoTop}>
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--cyan)', filter: 'drop-shadow(0 0 8px var(--cyan))' }}>
          <polygon points="7 1 13 12 1 12" fill="currentColor" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.24em', color: 'var(--text-primary)' }}>MATILHA</span>
      </div>

      <div style={{
        width: '100%', maxWidth: 440, padding: 36, borderRadius: 16,
        background: `
          radial-gradient(ellipse at top left, rgba(168,85,247,0.08), transparent 60%),
          radial-gradient(ellipse at bottom right, rgba(0,217,255,0.06), transparent 60%),
          linear-gradient(180deg, rgba(18,22,32,0.85), rgba(14,16,22,0.9))
        `,
        border: '1px solid rgba(168,85,247,0.25)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--purple)', fontWeight: 700, marginBottom: 8 }}>
            PRIMEIRO ACESSO
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0, marginBottom: 8,
            fontFamily: 'var(--font-display, Instrument Serif, serif)',
          }}>
            Criar sua conta
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Se você já é mentorado do Tradesystem, vai entrar direto.
            Se não, fica aguardando aprovação.
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="nome completo">
            <input className="input-underline" type="text" required autoFocus
              value={name} onChange={e => setName(e.target.value)}
              placeholder="nome e sobrenome" />
          </Field>
          <Field label="email">
            <input className="input-underline" type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" />
          </Field>
          <Field label="whatsapp">
            <input className="input-underline" type="tel"
              value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-0000" />
          </Field>
          <Field label="senha">
            <input className="input-underline" type="password" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres" />
          </Field>

          {err && (
            <div style={{
              padding: '10px 12px', borderRadius: 6, fontSize: 11.5,
              color: 'var(--red)', background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
            }}>{err}</div>
          )}

          <button type="submit" disabled={busy} style={{
            width: '100%', padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
            background: 'linear-gradient(135deg, #ec4899, #a855f7, #00d9ff)',
            color: '#fff', fontSize: 13, fontWeight: 600, border: 'none',
            marginTop: 6, opacity: busy ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(168,85,247,0.3)',
          }}>
            {busy ? 'criando...' : 'criar conta'}
            {!busy && <IArrowRight size={13} stroke={2.2} />}
          </button>
        </form>

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: 11.5, color: 'var(--text-muted)', textDecoration: 'none' }}>
            já tenho conta <span style={{ color: 'var(--cyan)' }}>→ entrar</span>
          </Link>
        </div>
      </div>

      <div style={footerBar}>
        <Link to="/" style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
          ← voltar
        </Link>
      </div>
    </div>
  )
}

function SuccessScreen({ title, subtitle, ctaLabel, ctaTo }) {
  return (
    <div style={pageStyle}>
      <div style={{
        maxWidth: 440, padding: 36, textAlign: 'center',
        borderRadius: 16,
        background: 'linear-gradient(180deg, rgba(18,22,32,0.85), rgba(14,16,22,0.9))',
        border: '1px solid rgba(34,197,94,0.3)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px',
          background: 'rgba(34,197,94,0.15)',
          border: '1px solid rgba(34,197,94,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ICheck size={28} stroke={2.2} style={{ color: 'var(--green)' }} />
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 500, margin: 0, marginBottom: 8,
          fontFamily: 'var(--font-display, Instrument Serif, serif)',
        }}>{title}</h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, marginBottom: 22, lineHeight: 1.6 }}>
          {subtitle}
        </p>
        <Link to={ctaTo} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 22px', borderRadius: 10,
          background: 'linear-gradient(135deg, #22c55e, #10b981)',
          color: '#fff', fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
        }}>
          {ctaLabel} <IArrowRight size={12} stroke={2.2} />
        </Link>
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

const pageStyle = {
  minHeight: '100vh', background: 'var(--body)',
  backgroundImage: 'radial-gradient(ellipse 600px 400px at 30% 10%, #00d9ff14 0%, transparent 55%), radial-gradient(ellipse 500px 400px at 70% 80%, #a855f714 0%, transparent 55%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20, position: 'relative',
}
const logoTop = {
  position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)',
  display: 'flex', alignItems: 'center', gap: 10,
}
const footerBar = {
  position: 'absolute', bottom: 20, left: 0, right: 0,
  display: 'flex', justifyContent: 'center', padding: '0 24px',
}
