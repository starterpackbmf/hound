import React, { useEffect, useState } from 'react'

const STAGES = [
  { icon: '📖', label: 'Lendo o acervo' },
  { icon: '🧭', label: 'Identificando temas' },
  { icon: '🔗', label: 'Conectando ideias' },
  { icon: '✨', label: 'Estruturando a resposta' },
]

const STAGE_INTERVAL_MS = 1400

export default function ThinkingLoader() {
  const [stageIdx, setStageIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStageIdx(i => (i + 1) % STAGES.length), STAGE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const stage = STAGES[stageIdx]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
          background: 'linear-gradient(135deg, rgba(0,217,255,0.12), rgba(0,217,255,0.03))',
          border: '1px solid rgba(0,217,255,0.22)',
          boxShadow: '0 0 16px rgba(0,217,255,0.18)',
        }}>
          {stage.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div key={stageIdx} className="oraculo-block-rise" style={{
            fontSize: 13, color: 'var(--text-primary)',
          }}>
            {stage.label}…
          </div>
          <div style={{
            fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)',
            fontWeight: 600, marginTop: 2,
          }}>
            ORÁCULO PROCESSANDO
          </div>
        </div>
      </div>

      <div style={{
        position: 'relative', height: 2, width: '100%',
        borderRadius: 999, overflow: 'hidden',
        background: 'rgba(255,255,255,0.04)',
      }}>
        <div className="oraculo-shimmer" style={{ position: 'absolute', inset: 0 }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {STAGES.map((_, i) => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 999,
            background: i <= stageIdx ? 'var(--cyan)' : 'rgba(255,255,255,0.06)',
            boxShadow: i === stageIdx ? '0 0 8px rgba(0,217,255,0.6)' : 'none',
            transition: 'background 500ms, box-shadow 500ms',
          }} />
        ))}
      </div>

      <style>{`
        @keyframes oraculo-shimmer-anim {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .oraculo-shimmer {
          background: linear-gradient(90deg, transparent, rgba(0,217,255,0.5), transparent);
          animation: oraculo-shimmer-anim 1.6s linear infinite;
        }
        @keyframes oraculo-block-rise {
          from { opacity: 0; transform: translateY(6px); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .oraculo-block-rise {
          animation: oraculo-block-rise 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )
}
