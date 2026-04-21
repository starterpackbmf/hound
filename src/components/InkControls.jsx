import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Dropdown custom estilo INK (portal pra não ficar atrás de stacking contexts)
export function InkSelect({ value, onChange, options, placeholder = 'Selecione' }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const btnRef = React.useRef(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function reposition() {
      if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    }
    reposition()
    function onClick(e) {
      if (!btnRef.current?.contains(e.target) && !e.target.closest('[data-ink-dropdown]')) setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input"
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
          color: selected ? 'var(--ink-text, var(--text-primary))' : 'var(--ink-dim, var(--text-muted))',
          borderColor: open ? 'rgba(24,209,138,0.4)' : undefined,
          boxShadow: open ? '0 0 0 3px rgba(24,209,138,0.12)' : undefined,
        }}
      >
        <span>{selected?.label || placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transition: 'transform .15s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && rect && createPortal(
        <div
          data-ink-dropdown
          style={{
            position: 'fixed',
            top: rect.bottom + 6,
            left: rect.left,
            width: rect.width,
            zIndex: 200,
            padding: 4, borderRadius: 10,
            background: 'linear-gradient(180deg, rgba(22,26,32,0.98), rgba(16,19,26,0.98))',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'ink-fade-up .14s ease-out both',
            color: '#E9EBEE',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {options.map(o => {
            const active = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 10px', borderRadius: 6,
                  background: active ? 'rgba(24,209,138,0.12)' : 'transparent',
                  border: 'none',
                  color: active ? '#18D18A' : '#E9EBEE',
                  fontSize: 12.5, fontWeight: active ? 600 : 500,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background .12s ease',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span>{o.label}</span>
                {active && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#18D18A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}

// Date picker custom estilo INK (também via portal)
export function InkDate({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + 'T12:00') : new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const btnRef = React.useRef(null)

  useEffect(() => {
    if (!open) return
    function reposition() {
      if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    }
    reposition()
    function onClick(e) {
      if (!btnRef.current?.contains(e.target) && !e.target.closest('[data-ink-datepicker]')) setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  const display = value ? new Date(value + 'T12:00').toLocaleDateString('pt-BR') : '—'
  const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const DOWS = ['D','S','T','Q','Q','S','S']

  function cells() {
    const first = new Date(view.year, view.month, 1)
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
    const startDow = first.getDay()
    const prevMonthDays = new Date(view.year, view.month, 0).getDate()
    const arr = []
    for (let i = startDow - 1; i >= 0; i--) arr.push({ day: prevMonthDays - i, outside: true, date: new Date(view.year, view.month - 1, prevMonthDays - i) })
    for (let d = 1; d <= daysInMonth; d++) arr.push({ day: d, date: new Date(view.year, view.month, d) })
    while (arr.length < 42) {
      const last = arr[arr.length - 1].date
      const next = new Date(last); next.setDate(last.getDate() + 1)
      arr.push({ day: next.getDate(), outside: true, date: next })
    }
    return arr
  }

  function pick(d) {
    const iso = d.toISOString().slice(0, 10)
    onChange(iso)
    setOpen(false)
  }

  function shift(n) {
    setView(v => {
      const d = new Date(v.year, v.month + n, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input"
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
          color: value ? 'var(--ink-text, var(--text-primary))' : 'var(--ink-dim)',
          fontFamily: 'JetBrains Mono, monospace',
          borderColor: open ? 'rgba(24,209,138,0.4)' : undefined,
          boxShadow: open ? '0 0 0 3px rgba(24,209,138,0.12)' : undefined,
        }}
      >
        <span>{display}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--ink-dim)' }}>
          <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 6h10M5 2v2M9 2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
      {open && rect && createPortal(
        <div
          data-ink-datepicker
          style={{
            position: 'fixed',
            top: rect.bottom + 6,
            left: rect.left,
            minWidth: 260,
            zIndex: 200,
            padding: 14, borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(22,26,32,0.98), rgba(16,19,26,0.98))',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'ink-fade-up .14s ease-out both',
            color: '#E9EBEE',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => shift(-1)} style={{ padding: 6, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E9EBEE', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M7.5 3L4.5 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>
              {MESES[view.month]} <span style={{ color: 'rgba(233,235,238,0.55)', fontFamily: 'JetBrains Mono, monospace' }}>{view.year}</span>
            </div>
            <button type="button" onClick={() => shift(1)} style={{ padding: 6, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E9EBEE', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DOWS.map((d, i) => (
              <div key={i} style={{ fontSize: 9, color: 'rgba(233,235,238,0.45)', textAlign: 'center', padding: '4px 0', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells().map((c, i) => {
              const iso = c.date.toISOString().slice(0, 10)
              const isSelected = iso === value
              const isToday = iso === todayIso
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(c.date)}
                  style={{
                    aspectRatio: '1',
                    width: '100%',
                    borderRadius: 6,
                    border: isToday && !isSelected ? '1px solid rgba(24,209,138,0.35)' : '1px solid transparent',
                    background: isSelected ? 'rgba(24,209,138,0.18)' : 'transparent',
                    color: isSelected ? '#18D18A' : c.outside ? 'rgba(233,235,238,0.25)' : '#E9EBEE',
                    fontSize: 11.5, fontWeight: isSelected ? 700 : 400,
                    cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {c.day}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} style={{ fontSize: 11, color: 'rgba(233,235,238,0.55)', background: 'transparent', border: 'none', cursor: 'pointer' }}>limpar</button>
            <button type="button" onClick={() => pick(new Date())} style={{ fontSize: 11, color: '#18D18A', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>hoje</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
