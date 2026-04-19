import React from 'react'

// Pixel-art mascot (Habbo-style). Rendered as SVG rects with crispEdges.
const HOUND_PIXELS = [
  '................',
  '...11....11.....',
  '..1221..1221....',
  '.122221122221...',
  '12233332233321..',
  '1223333333332321',
  '1233333333333321',
  '1233353333533321',
  '1233333773333321',
  '.12333333333321.',
  '.12333333333321.',
  '..123666663321..',
  '...1444444431...',
  '....1...1.41....',
  '....1...1.1.....',
  '................',
]
const HOUND_PALETTE = {
  1: '#1a1a1a', 2: '#5a5a62', 3: '#7a7a82',
  4: '#4a4a52', 5: '#e4b528', 6: '#3a3a3e', 7: '#ef4444',
}

export default function Hound({ size = 32, style = {} }) {
  const px = size / 16
  const rects = []
  HOUND_PIXELS.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = HOUND_PALETTE[ch]
      if (color) {
        rects.push(
          <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={color} shapeRendering="crispEdges" />
        )
      }
    })
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>{rects}</svg>
  )
}

export function HoundWithBubble({ text, size = 40 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 8 }}>
      <Hound size={size} />
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 11,
        color: 'var(--text-secondary)',
        marginBottom: 4,
      }}>
        {text}
      </div>
    </div>
  )
}
