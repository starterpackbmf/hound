import React from 'react'

// 6 níveis oficiais do Lovable, thresholds em resultado acumulado (R$)
export const RANKS = {
  primeiro_instinto: { label: 'PRIMEIRO INSTINTO', color: '#71717a', bg: '#71717a20', threshold: 0 },
  predador:          { label: 'PREDADOR',          color: '#f97316', bg: '#f9731618', threshold: 1000 },
  aprendiz_cacador:  { label: 'APRENDIZ DE CAÇADOR', color: '#22c55e', bg: '#22c55e18', threshold: 5000 },
  cacador:           { label: 'CAÇADOR',           color: '#3b82f6', bg: '#3b82f618', threshold: 10000 },
  killer:            { label: 'KILLER',            color: '#ef4444', bg: '#ef444418', threshold: 20000 },
  alpha:             { label: 'ALPHA',             color: '#e4b528', bg: '#e4b52818', threshold: 50000 },
  // aliases legados
  primeiro:          { label: 'PRIMEIRO INSTINTO', color: '#71717a', bg: '#71717a20', threshold: 0 },
  aprendiz:          { label: 'PRIMEIRO INSTINTO', color: '#71717a', bg: '#71717a20', threshold: 0 },
  cacadoria:         { label: 'CAÇADOR',           color: '#3b82f6', bg: '#3b82f618', threshold: 10000 },
  alfa:              { label: 'ALPHA',             color: '#e4b528', bg: '#e4b52818', threshold: 50000 },
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
  // retorna o rank mais alto cujo threshold <= resultado acumulado
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
