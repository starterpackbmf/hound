import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { matilha } from '../lib/matilha'
import RankBadge from '../components/RankBadge'
import Hound from '../components/Hound'

export default function Perfil() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancel = false
    ;(async () => {
      try {
        const [s, sum] = await Promise.all([
          matilha.student(id).catch(() => null),
          matilha.summary(id).catch(() => null),
        ])
        if (cancel) return
        if (!s || !s.profile) {
          setErr('trader não encontrado')
        } else {
          setProfile(s.profile)
          setSummary(sum)
        }
      } catch (e) {
        if (!cancel) setErr(e.message)
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [id])

  const initial = (profile?.name?.[0] || '?').toUpperCase()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0e',
      color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        body { background: #0a0a0e; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fadeUp { animation: fadeUp 0.6s ease both; }
      `}</style>

      {/* ambient */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse at 20% 10%, rgba(0,217,255,0.10) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 90%, rgba(236,72,153,0.10) 0%, transparent 50%)
        `,
      }} />

      {/* topbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,10,14,0.6)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <Link to="/matilha" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#00d9ff' }}>
            <polygon points="7 1 13 12 1 12" fill="currentColor" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.22em' }}>MATILHA</span>
        </Link>
        <Link to="/login" style={{
          fontSize: 11, padding: '6px 12px', borderRadius: 6,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', textDecoration: 'none', letterSpacing: '0.05em',
        }}>
          entrar
        </Link>
      </header>

      <main style={{ position: 'relative', zIndex: 2, maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            carregando perfil…
          </div>
        ) : err ? (
          <div className="fadeUp" style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🐺</div>
            <div style={{ fontSize: 18, color: '#fff', marginBottom: 6 }}>{err}</div>
            <Link to="/matilha" style={{ fontSize: 13, color: '#a855f7', textDecoration: 'underline' }}>voltar</Link>
          </div>
        ) : (
          <div className="fadeUp">
            {/* hero */}
            <section style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{
                width: 96, height: 96, borderRadius: 24, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
                color: '#0a0a0e', fontSize: 40, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(168,85,247,0.3)',
              }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 24, objectFit: 'cover' }} />
                ) : initial}
              </div>
              <div style={{
                fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 300,
                letterSpacing: '-0.03em', marginBottom: 10,
              }}>
                {profile.name?.trim() || 'mentorado'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {profile.current_badge && <RankBadge rank={profile.current_badge} size="md" />}
                <span style={{
                  fontSize: 10, letterSpacing: '0.2em', fontWeight: 600,
                  padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.25)',
                  color: '#00d9ff', fontFamily: 'JetBrains Mono, monospace',
                }}>MENTORADO · MATILHA</span>
              </div>
            </section>

            {/* stats */}
            {summary && summary.total_trades > 0 ? (
              <section style={{
                display: 'grid', gap: 10,
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                marginBottom: 40,
              }}>
                <Stat label="TRADES" value={summary.total_trades.toLocaleString('pt-BR')} />
                <Stat
                  label="RESULTADO"
                  value={`R$ ${(summary.total_result_brl || 0).toLocaleString('pt-BR')}`}
                  color={(summary.total_result_brl || 0) >= 0 ? '#30d158' : '#ff453a'}
                />
                <Stat label="WIN RATE" value={`${(summary.win_rate || 0).toFixed(1)}%`} color="#00d9ff" />
                <Stat label="DIAS OPERADOS" value={summary.days_operated || 0} />
                <Stat label="SEGUIU PLANO" value={`${(summary.followed_plan_rate || 0).toFixed(1)}%`} color="#a855f7" />
              </section>
            ) : (
              <div style={{
                padding: 32, borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 13,
                marginBottom: 40,
              }}>
                ainda não há trades registrados
              </div>
            )}

            {/* cta */}
            <section style={{
              padding: '32px 28px', borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(168,85,247,0.08) 50%, rgba(0,217,255,0.08) 100%)',
              border: '1px solid rgba(168,85,247,0.3)',
              textAlign: 'center',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <Hound size={48} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 8, letterSpacing: '-0.02em' }}>
                quer estar aqui também?
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 20, lineHeight: 1.6 }}>
                a matilha é feita de traders que transformaram o diário, a monitoria e o método em operacional real.
              </div>
              <Link to="/matilha" style={{
                display: 'inline-block',
                padding: '12px 22px', borderRadius: 10,
                background: 'linear-gradient(135deg, #ec4899, #a855f7, #00d9ff)',
                color: '#0a0a0e', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em',
                textDecoration: 'none',
                boxShadow: '0 10px 30px -6px rgba(168,85,247,0.5)',
              }}>
                CONHECER A MATILHA →
              </Link>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, color = '#fff' }) {
  return (
    <div style={{
      padding: '16px 14px', borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        fontSize: 9, letterSpacing: '0.2em', fontFamily: 'JetBrains Mono, monospace',
        color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginBottom: 6,
      }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color, letterSpacing: '-0.01em', fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
    </div>
  )
}
