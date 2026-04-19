import React from 'react'

export const RANKS = {
  primeiro_instinto: { label: 'PRIMEIRO INSTINTO', color: '#71717a', bg: '#71717a20' },
  predador:          { label: 'PREDADOR',          color: '#f97316', bg: '#f9731618' },
  alfa:              { label: 'ALFA',              color: '#e4b528', bg: '#e4b52818' },
  imortal:           { label: 'IMORTAL',           color: '#a855f7', bg: '#a855f718' },
  // aliases vindos do diário Lovable
  primeiro:          { label: 'PRIMEIRO INSTINTO', color: '#71717a', bg: '#71717a20' },
  cacador:           { label: 'CAÇADOR',           color: '#f97316', bg: '#f9731618' },
  aprendiz:          { label: 'APRENDIZ',          color: '#71717a', bg: '#71717a20' },
  alpha:             { label: 'ALPHA',             color: '#e4b528', bg: '#e4b52818' },
}

export default function RankBadge({ rank, size = 'sm' }) {
  const r = RANKS[rank] || RANKS.primeiro_instinto
  const sizes = {
    xs: { fontSize: 9,  padding: '2px 6px',  dot: 4 },
    sm: { fontSize: 10, padding: '3px 8px',  dot: 5 },
    md: { fontSize: 11, padding: '4px 10px', dot: 6 },
  }
  const s = sizes[size]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: r.bg, color: r.color,
      padding: s.padding, borderRadius: 99,
      fontSize: s.fontSize, fontWeight: 600, letterSpacing: '0.08em',
      lineHeight: 1, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: s.dot, height: s.dot, borderRadius: 99, background: r.color }} />
      {r.label}
    </span>
  )
}
