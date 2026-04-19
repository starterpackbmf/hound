import React from 'react'

// 6 níveis neon distintos — cada rank tem sua cor identitária
export const RANKS = {
  primeiro_instinto: { label: 'PRIMEIRO INSTINTO', color: '#71717a', bg: '#71717a22', threshold: 0,     glow: '#71717a44' },
  predador:          { label: 'PREDADOR',          color: '#ec4899', bg: '#ec489922', threshold: 1000,  glow: '#ec489966' },
  aprendiz_cacador:  { label: 'APRENDIZ DE CAÇADOR', color: '#00d9ff', bg: '#00d9ff22', threshold: 5000, glow: '#00d9ff66' },
  cacador:           { label: 'CAÇADOR',           color: '#a855f7', bg: '#a855f722', threshold: 10000, glow: '#a855f766' },
  killer:            { label: 'KILLER',            color: '#ef4444', bg: '#ef444422', threshold: 20000, glow: '#ef444466' },
  alpha:             { label: 'ALPHA',             color: '#f59e0b', bg: '#f59e0b22', threshold: 50000, glow: '#f59e0b88' },

  // aliases legados (profiles/API do Lovable)
  primeiro:          { label: 'PRIMEIRO INSTINTO', color: '#71717a', bg: '#71717a22', threshold: 0 },
  aprendiz:          { label: 'PRIMEIRO INSTINTO', color: '#71717a', bg: '#71717a22', threshold: 0 },
  cacadoria:         { label: 'CAÇADOR',           color: '#a855f7', bg: '#a855f722', threshold: 10000 },
  alfa:              { label: 'ALPHA',             color: '#f59e0b', bg: '#f59e0b22', threshold: 50000 },
}

export const RANK_ORDER = [
  'primeiro_instinto',
  'predador',
  'aprendiz_cacador',
  'cacador',
  'killer',
  'alpha',
]

export function computeRank(resultBrl = 0) {
  let current = 'primeiro_instinto'
  for (const r of RANK_ORDER) {
    if ((RANKS[r].threshold ?? 0) <= resultBrl) current = r
  }
  return current
}

export function nextRank(currentRank) {
  const idx = RANK_ORDER.indexOf(currentRank)
  if (idx === -1 || idx === RANK_ORDER.length - 1) return null
  return RANK_ORDER[idx + 1]
}

export default function RankBadge({ rank, size = 'sm', glow = false }) {
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
      ...(glow && r.glow ? { boxShadow: `0 0 12px ${r.glow}` } : {}),
    }}>
      <span style={{
        width: s.dot, height: s.dot, borderRadius: 99, background: r.color,
        ...(glow && r.glow ? { boxShadow: `0 0 6px ${r.color}` } : {}),
      }} />
      {r.label}
    </span>
  )
}
