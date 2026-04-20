import React from 'react'
import { OPERATIONAL_CONFIG, qualityColor } from '../lib/tradeCalculations'

// RulesSelector — checklist de regras mandatórias por operacional
export function RulesSelector({ operational, selectedRules, onChange }) {
  const config = OPERATIONAL_CONFIG[operational]
  if (!config) {
    return (
      <div className="card" style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        selecione um operacional pra ver as regras mandatórias
      </div>
    )
  }

  const toggle = r => {
    onChange(selectedRules.includes(r) ? selectedRules.filter(x => x !== r) : [...selectedRules, r])
  }
  const done = config.mandatoryRules.every(r => selectedRules.includes(r))
  const count = config.mandatoryRules.filter(r => selectedRules.includes(r)).length

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Regras mandatórias</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            todas devem ser marcadas pra o trade estar no plano
          </div>
        </div>
        <span className="pill" style={{
          fontSize: 10,
          color: done ? 'var(--up)' : 'var(--amber)',
          borderColor: done ? 'var(--up)' : 'var(--amber)',
          opacity: 0.9,
        }}>
          {done ? '✓ completo' : `${count}/${config.mandatoryRules.length}`}
        </span>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {config.mandatoryRules.map(rule => {
          const on = selectedRules.includes(rule)
          return (
            <button
              key={rule}
              type="button"
              onClick={() => toggle(rule)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${on ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                background: on ? 'rgba(34,197,94,0.08)' : 'var(--surface-2)',
                color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 13, textAlign: 'left', cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              <span style={{
                width: 16, height: 16, borderRadius: 4,
                border: `2px solid ${on ? 'var(--up)' : 'var(--text-muted)'}`,
                background: on ? 'var(--up)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0a0a0e', fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>{on && '✓'}</span>
              {rule}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// FiltersSelector — filtros opcionais que somam score
export function FiltersSelector({ operational, selectedFilters, onChange }) {
  const config = OPERATIONAL_CONFIG[operational]
  if (!config) {
    return (
      <div className="card" style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        selecione um operacional pra ver os filtros de qualidade
      </div>
    )
  }

  const toggle = f => {
    onChange(selectedFilters.includes(f) ? selectedFilters.filter(x => x !== f) : [...selectedFilters, f])
  }
  const total = config.optionalFilters.length
  const count = config.optionalFilters.filter(f => selectedFilters.includes(f)).length
  const bonus = total > 0 ? Math.round((count / total) * 30) : 0

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Filtros de qualidade</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            melhoram o score da entrada (até +30%)
          </div>
        </div>
        <span className="pill" style={{ fontSize: 10, color: 'var(--cyan)', borderColor: 'var(--cyan)', opacity: 0.9 }}>
          +{bonus}%
        </span>
      </div>
      <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {config.optionalFilters.map(filter => {
          const on = selectedFilters.includes(filter)
          return (
            <button
              key={filter}
              type="button"
              onClick={() => toggle(filter)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${on ? 'rgba(0,217,255,0.4)' : 'var(--border)'}`,
                background: on ? 'rgba(0,217,255,0.08)' : 'var(--surface-2)',
                color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 12, textAlign: 'left', cursor: 'pointer',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                border: `2px solid ${on ? 'var(--cyan)' : 'var(--text-muted)'}`,
                background: on ? 'var(--cyan)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0a0a0e', fontSize: 8, fontWeight: 700, flexShrink: 0,
              }}>{on && '✓'}</span>
              {filter}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// QualityDisplay — mostra a qualidade calculada em tempo real
export function QualityDisplay({ quality, score, followedPlan }) {
  if (!quality) {
    return (
      <div className="card" style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        selecione as regras pra calcular a qualidade
      </div>
    )
  }

  const color = qualityColor(quality)
  const icon = { EXCELENTE: '★', BOA: '▲', ACEITÁVEL: '●', FORÇADA: '⚠' }[quality]
  const desc = {
    EXCELENTE: 'todas as confluências ideais',
    BOA: 'dentro do plano com bons filtros',
    ACEITÁVEL: 'dentro do plano, pode melhorar filtros',
    FORÇADA: 'fora do plano operacional',
  }[quality]

  return (
    <div className="card" style={{
      padding: 20, borderWidth: 2,
      borderColor: color, background: `${color}10`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: `${color}30`, color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700,
          }}>{icon}</div>
          <div>
            <div className="label-muted" style={{ fontSize: 9 }}>QUALIDADE DA ENTRADA</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.01em' }}>{quality}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
          </div>
        </div>
        {quality !== 'FORÇADA' && (
          <div style={{ textAlign: 'right' }}>
            <div className="label-muted" style={{ fontSize: 9 }}>SCORE</div>
            <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{score}%</div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={followedPlan ? 'dot dot-up' : 'dot dot-down'} style={{ width: 8, height: 8 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: followedPlan ? 'var(--up)' : 'var(--down)' }}>
          {followedPlan ? 'No plano' : 'Fora do plano'}
        </span>
      </div>
    </div>
  )
}

// ResultsPreview — mostra total de pontos, resultado R$ e win rate calculados live
export function ResultsPreview({ totalPoints, resultBrl, initialContracts, asset }) {
  if (!asset || !initialContracts) {
    return (
      <div className="card" style={{ padding: 14, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        informe ativo e contratos pra ver o resultado
      </div>
    )
  }
  const up = totalPoints >= 0
  const color = up ? 'var(--up)' : 'var(--down)'
  const multInfo = asset === 'WIN' ? 'R$ 0,20 / pt / contrato' : 'R$ 10 / pt / contrato'

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Resumo do trade</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            {up ? '▲' : '▼'} Pontos
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
            {up ? '+' : ''}{asset === 'WDO' ? totalPoints.toFixed(1) : Math.round(totalPoints)}
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>R$</div>
          <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
            {up ? '+' : ''}{resultBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Contratos</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {initialContracts}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
        {asset} · {multInfo}
      </div>
    </div>
  )
}
