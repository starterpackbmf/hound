import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Renderiza uma resposta do Oráculo com cascade reveal + custom renderers
// (callouts coloridos, value pills, tabelas dashboard).
export default function OracleResponse({ text, animate = true }) {
  const blocks = splitIntoBlocks(text || '')
  return (
    <div>
      {blocks.map((block, i) => (
        <div
          key={i}
          className={animate ? 'oraculo-reveal' : ''}
          style={animate ? { animationDelay: `${i * 70}ms` } : undefined}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
            {block}
          </ReactMarkdown>
        </div>
      ))}
      <style>{`
        @keyframes oraculo-reveal-anim {
          from { opacity: 0; transform: translateY(8px); filter: blur(3px); }
          to   { opacity: 1; transform: translateY(0);   filter: blur(0);   }
        }
        .oraculo-reveal { animation: oraculo-reveal-anim 500ms cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>
    </div>
  )
}

function splitIntoBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  let current = []
  let inFenced = false
  for (const line of lines) {
    if (/^```/.test(line)) {
      inFenced = !inFenced
      current.push(line)
      continue
    }
    if (inFenced) { current.push(line); continue }
    if (line.trim() === '') {
      if (current.length > 0) { blocks.push(current.join('\n')); current = [] }
    } else current.push(line)
  }
  if (current.length > 0) blocks.push(current.join('\n'))
  return blocks
}

function extractText(children) {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText(children.props.children)
  }
  return ''
}

// ─── Custom renderers ─────────────────────────────────────────
const COMPONENTS = {
  table: ({ children }) => (
    <div style={oraculoStyles.tableWrap}>
      <table style={oraculoStyles.table}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th style={oraculoStyles.th}>{children}</th>,
  td: ({ children, ...rest }) => <td style={oraculoStyles.td} {...rest}>{children}</td>,

  blockquote: ({ children }) => {
    const text = extractText(children)
    let variant = 'callout-default'
    if (/^[\s>]*[⚠️🚨❗️!]/.test(text)) variant = 'callout-warn'
    else if (/^[\s>]*[💡✨🎯⭐]/.test(text)) variant = 'callout-tip'
    return (
      <div className={`oraculo-callout ${variant}`} style={oraculoStyles.callout(variant)}>
        <div style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>{children}</div>
      </div>
    )
  },

  strong: ({ children }) => {
    const text = extractText(children)
    const isValue = /(^|\s)(R\$\s?[\d.,]+|\d+[.,]?\d*\s*%|\d+\s*pontos?|\d+\s*pips?|ME\s?\d+|MA\s?\d+|TRM|TC|TA|FQ)/i.test(text)
    if (isValue && text.length < 30) {
      return <span style={oraculoStyles.valuePill}>{children}</span>
    }
    return <strong style={{ color: 'var(--cyan)', fontWeight: 600 }}>{children}</strong>
  },

  h1: ({ children }) => <h1 style={oraculoStyles.h1}>{children}</h1>,
  h2: ({ children }) => <h2 style={oraculoStyles.h2}>{children}</h2>,
  h3: ({ children }) => <h3 style={oraculoStyles.h3}>{children}</h3>,
  p: ({ children }) => <p style={oraculoStyles.p}>{children}</p>,
  ul: ({ children }) => <ul style={oraculoStyles.list}>{children}</ul>,
  ol: ({ children }) => <ol style={{ ...oraculoStyles.list, listStyle: 'decimal' }}>{children}</ol>,
  li: ({ children }) => <li style={{ lineHeight: 1.6, marginBottom: 3 }}>{children}</li>,

  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <pre style={oraculoStyles.codeBlock}>
          <code className={className}>{children}</code>
        </pre>
      )
    }
    return <code style={oraculoStyles.codeInline}>{children}</code>
  },

  hr: () => (
    <hr style={{
      margin: '20px 0', border: 0, height: 1,
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 50%, transparent)',
    }} />
  ),

  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>
      {children}
    </a>
  ),
}

const oraculoStyles = {
  h1: {
    fontFamily: 'var(--font-display, Instrument Serif, serif)',
    fontSize: 24, fontWeight: 500, color: 'var(--text-primary)',
    marginTop: 18, marginBottom: 10, letterSpacing: '-0.01em',
  },
  h2: {
    fontFamily: 'var(--font-display, Instrument Serif, serif)',
    fontSize: 19, fontWeight: 500, color: 'var(--text-primary)',
    marginTop: 18, marginBottom: 8, letterSpacing: '-0.005em',
  },
  h3: {
    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
    marginTop: 14, marginBottom: 6, letterSpacing: '0.01em',
  },
  p: { margin: '8px 0', lineHeight: 1.65, color: 'var(--text-primary)', fontSize: 13.5 },
  list: { margin: '8px 0', paddingLeft: 22, lineHeight: 1.6, color: 'var(--text-primary)', fontSize: 13.5 },
  tableWrap: {
    margin: '12px 0', borderRadius: 10, overflow: 'hidden',
    border: '1px solid rgba(0,217,255,0.18)',
    background: 'rgba(0,217,255,0.03)',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: {
    padding: '9px 12px', textAlign: 'left',
    fontSize: 9.5, letterSpacing: '0.14em',
    textTransform: 'uppercase', fontWeight: 700, color: 'var(--cyan)',
    borderBottom: '1px solid rgba(0,217,255,0.2)',
    background: 'rgba(0,217,255,0.05)',
  },
  td: {
    padding: '9px 12px', color: 'var(--text-primary)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  valuePill: {
    display: 'inline-block',
    padding: '1px 8px', borderRadius: 5, margin: '0 1px',
    background: 'rgba(0,217,255,0.12)',
    border: '1px solid rgba(0,217,255,0.28)',
    color: 'var(--cyan)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.92em', fontWeight: 600,
    boxShadow: '0 0 6px rgba(0,217,255,0.18) inset',
    whiteSpace: 'nowrap',
  },
  codeInline: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--cyan)',
    padding: '1px 6px', borderRadius: 4,
    fontFamily: 'var(--font-mono)', fontSize: '0.92em',
  },
  codeBlock: {
    margin: '12px 0', overflowX: 'auto',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8, padding: 12, fontSize: 12,
    fontFamily: 'var(--font-mono)',
  },
  callout: (variant) => {
    if (variant === 'callout-warn') return {
      margin: '12px 0', padding: '10px 14px', borderRadius: 8,
      background: 'rgba(245,158,11,0.08)',
      borderLeft: '3px solid var(--amber)',
      color: 'var(--text-primary)', fontSize: 13,
    }
    if (variant === 'callout-tip') return {
      margin: '12px 0', padding: '10px 14px', borderRadius: 8,
      background: 'rgba(168,85,247,0.08)',
      borderLeft: '3px solid var(--purple)',
      color: 'var(--text-primary)', fontSize: 13,
    }
    return {
      margin: '12px 0', padding: '10px 14px', borderRadius: 8,
      background: 'rgba(0,217,255,0.06)',
      borderLeft: '3px solid var(--cyan)',
      color: 'var(--text-primary)', fontSize: 13,
    }
  },
}
