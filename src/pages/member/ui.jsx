import React from 'react'

export function PageTitle({ children, eyebrow, sub }) {
  return (
    <header style={{ marginBottom: 24 }}>
      {eyebrow && <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
      <h1 className="display" style={{
        fontSize: 30, fontWeight: 400, margin: 0,
        color: 'var(--text-primary)',
        letterSpacing: '-0.025em',
      }}>{children}</h1>
      {sub && <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 13, maxWidth: 640 }}>{sub}</p>}
    </header>
  )
}

export function Section({ title, right, children }) {
  return (
    <section style={{ marginBottom: 28, breakInside: 'avoid', pageBreakInside: 'avoid', WebkitColumnBreakInside: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="label-muted">{title}</span>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Card({ label, value, sub, mono = true, tone = 'neutral', delta, deltaUp, dotLive }) {
  const colors = { up: 'var(--up)', down: 'var(--down)', neutral: 'var(--text-primary)' }
  return (
    <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="label-muted" style={{ fontSize: 9.5 }}>{label}</span>
        {dotLive && <span className="dot dot-live" style={{ width: 5, height: 5 }} />}
      </div>
      <div style={{
        fontSize: 18, fontWeight: 500,
        color: colors[tone] || colors.neutral,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
        fontFeatureSettings: mono ? '"zero","ss01"' : undefined,
        letterSpacing: mono ? '-0.01em' : undefined,
        wordBreak: 'break-word',
      }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</div>}
      {delta && (
        <div style={{
          fontSize: 10, color: deltaUp ? 'var(--up)' : 'var(--down)',
          fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {deltaUp ? '↗' : '↘'} {delta}
        </div>
      )}
    </div>
  )
}

export function Placeholder({ title, subtitle }) {
  return (
    <div style={{
      padding: '32px 20px', textAlign: 'center',
      background: 'var(--surface-1)', border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--r-8)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 420, margin: '0 auto' }}>{subtitle}</div>}
    </div>
  )
}

export function ErrorBox({ children }) {
  return (
    <div style={{
      padding: 14, borderRadius: 'var(--r-8)',
      background: '#ef444411', border: '1px solid #ef444444',
      color: 'var(--down)', fontSize: 12, lineHeight: 1.5,
    }}>
      {children}
    </div>
  )
}

export function Loading({ label = 'carregando...' }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>{label}</div>
}
