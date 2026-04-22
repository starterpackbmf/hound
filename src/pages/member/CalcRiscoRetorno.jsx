import React, { useMemo, useState } from 'react'

/**
 * Calculadora Risco/Retorno vs Assertividade
 *
 * Lógica:
 *   Expectativa por trade (em R) = (assertividade × payoff) - (1 - assertividade)
 *   Payoff mínimo (breakeven)    = (1 - assertividade) / assertividade
 *
 * Ideia didática: quando um sobe, o outro precisa cair.
 */

const PRESETS = [
  { label: 'Scalper',          hit: 65, color: '#6FE6F0' },
  { label: 'Swing',            hit: 45, color: '#E7C67A' },
  { label: 'Tendência/Runner', hit: 33, color: '#A498FF' },
]

// Curva realista derivada do print: breakeven + margem de ~0.9R
// 33% → 2.93 · 45% → 2.12 · 65% → 1.44  (bate com o print)
function payoffFromHit(hitPct) {
  const p = hitPct / 100
  if (p <= 0) return Infinity
  return (1 - p) / p + 0.9
}

function fmt(n, d = 2) {
  if (!isFinite(n)) return '—'
  return n.toFixed(d)
}

export default function CalcRiscoRetorno() {
  const [hit, setHit] = useState(50)       // %
  const [riscoBRL, setRiscoBRL] = useState(200) // R$ por trade (= 1R)
  const payoff = payoffFromHit(hit)        // derivado automaticamente

  const p = hit / 100
  const expectancy = p * payoff - (1 - p)              // em R por trade
  const breakeven  = p > 0 ? (1 - p) / p : Infinity    // payoff mínimo
  const winsPer10  = Math.round(p * 10)
  const lossesPer10 = 10 - winsPer10
  const zone = expectancy > 0.05 ? 'lucro' : expectancy < -0.05 ? 'prejuizo' : 'breakeven'
  const zoneColor = zone === 'lucro' ? '#18D18A' : zone === 'prejuizo' ? '#FF5470' : '#E7C67A'

  // Simulação de 100 trades arriscando 1R por operação
  const resultado100 = expectancy * 100

  // Sequência média de stops consecutivos esperada em 100 trades
  // Fórmula: log(N) / -log(1 - p)  → streak máximo esperado
  const streakStops = p > 0 && p < 1 ? Math.log(100) / -Math.log(1 - p) : 0
  const drawdownR = streakStops
  const drawdownBRL = streakStops * riscoBRL

  // Conversão em R$
  const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const ganhoPorAcerto = payoff * riscoBRL
  const perdaPorErro = riscoBRL
  const expectBRL = expectancy * riscoBRL
  const resultado100BRL = resultado100 * riscoBRL

  const applyPreset = (preset) => {
    setHit(preset.hit)
  }

  return (
    <div style={styles.root}>
      <header style={{ marginBottom: 28 }}>
        <div style={styles.eyebrow}>RISCO × RETORNO</div>
        <h1 style={styles.title}>Calculadora de Expectativa</h1>
        <p style={styles.sub}>
          Assertividade e payoff são uma gangorra. Quando um sobe, o outro cai — é o que o mercado
          oferece. Mexa no slider e veja como o RR se ajusta automaticamente, e o impacto disso no
          bolso.
        </p>
      </header>

      <div style={styles.grid}>
        {/* Controles */}
        <section style={styles.card}>
          <div style={styles.cardTitle}>Parâmetros</div>

          <ControlSlider
            label="Assertividade"
            value={hit}
            min={5} max={95} step={1}
            suffix="%"
            onChange={setHit}
            color="#6FE6F0"
          />
          <div style={styles.hint}>
            A cada 10 trades: <b style={{ color: '#18D18A' }}>{winsPer10} gain</b> ·{' '}
            <b style={{ color: '#FF5470' }}>{lossesPer10} stop</b>
          </div>

          <div style={{ height: 18 }} />

          <div style={styles.derivedBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(233,235,238,0.5)', marginBottom: 4 }}>
                  PAYOFF DERIVADO <span style={{ opacity: 0.6 }}>(o que o mercado oferece)</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(233,235,238,0.55)' }}>
                  Quanto maior a assertividade, menor o RR possível
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, color: '#E7C67A', fontFamily: 'ui-monospace, monospace' }}>
                {fmt(payoff, 2)}<span style={{ opacity: 0.6, fontSize: 14 }}>:1</span>
              </div>
            </div>
            <div style={styles.hint}>
              Ganha <b style={{ color: '#18D18A' }}>{fmt(payoff, 2)}R</b> por acerto ·
              perde <b style={{ color: '#FF5470' }}>1R</b> por erro
            </div>
          </div>

          <div style={{ height: 18 }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={styles.ctrlLabel}>Risco por trade (1R)</span>
              <span style={{ ...styles.ctrlValue, color: '#FF5470' }}>{fmtBRL(riscoBRL)}</span>
            </div>
            <input
              type="range"
              min={50} max={5000} step={50} value={riscoBRL}
              onChange={(e) => setRiscoBRL(parseFloat(e.target.value))}
              style={{ ...styles.slider, accentColor: '#FF5470' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {[100, 200, 500, 1000, 2000].map(v => (
                <button
                  key={v}
                  onClick={() => setRiscoBRL(v)}
                  style={{
                    ...styles.chip,
                    borderColor: riscoBRL === v ? '#FF547088' : 'rgba(255,255,255,0.1)',
                    color: riscoBRL === v ? '#FF5470' : 'rgba(233,235,238,0.7)',
                  }}
                >
                  {fmtBRL(v)}
                </button>
              ))}
            </div>
            <div style={styles.hint}>
              Cada stop custa <b style={{ color: '#FF5470' }}>{fmtBRL(perdaPorErro)}</b> ·
              cada gain entrega <b style={{ color: '#18D18A' }}>{fmtBRL(ganhoPorAcerto)}</b>
            </div>
          </div>

          <div style={{ height: 22 }} />
          <div style={styles.presetRow}>
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                style={{ ...styles.preset, borderColor: preset.color + '55', color: preset.color }}
              >
                <div style={{ fontSize: 10, letterSpacing: '0.12em', opacity: 0.7 }}>PRESET</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{preset.label}</div>
                <div style={{ fontSize: 11, opacity: 0.75, fontFamily: 'ui-monospace, monospace' }}>
                  {preset.hit}% · {fmt(payoffFromHit(preset.hit), 2)}:1
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Resultado */}
        <section style={styles.card}>
          <div style={styles.cardTitle}>Resultado</div>

          <div style={styles.bigStat}>
            <div style={styles.bigLabel}>Expectativa por trade</div>
            <div style={{ ...styles.bigValue, color: zoneColor }}>
              {expectancy >= 0 ? '+' : ''}{fmt(expectancy, 2)} R
            </div>
            <div style={{ fontSize: 15, color: zoneColor, fontFamily: 'ui-monospace, monospace', marginTop: 6, opacity: 0.9 }}>
              ≈ {expectBRL >= 0 ? '+' : ''}{fmtBRL(expectBRL)} por trade
            </div>
            <div style={{ ...styles.zoneTag, color: zoneColor, borderColor: zoneColor + '44' }}>
              {zone === 'lucro' && '✓ SISTEMA LUCRATIVO'}
              {zone === 'prejuizo' && '✗ SISTEMA PERDEDOR'}
              {zone === 'breakeven' && '≈ BREAKEVEN'}
            </div>
          </div>

          <div style={styles.miniGrid}>
            <Mini
              label="Em 100 trades"
              value={`${resultado100BRL >= 0 ? '+' : ''}${fmtBRL(resultado100BRL)}`}
              sub={`${fmt(resultado100, 1)}R · risco ${fmtBRL(riscoBRL)}/trade`}
              color={zoneColor}
            />
            <Mini
              label="Drawdown médio esperado"
              value={`−${fmtBRL(drawdownBRL)}`}
              sub={`~${fmt(streakStops, 1)} stops seguidos (${fmt(drawdownR, 1)}R) a cada 100 trades`}
              color="#FF5470"
            />
          </div>

          <div style={styles.formulaBox}>
            <div style={styles.formulaLabel}>fórmula</div>
            <code style={styles.formula}>
              E = (assertividade × payoff) − (1 − assertividade)
            </code>
            <code style={styles.formulaSmall}>
              = ({fmt(p, 2)} × {fmt(payoff, 2)}) − ({fmt(1 - p, 2)}) = <b style={{ color: zoneColor }}>{fmt(expectancy, 2)}R</b>
            </code>
          </div>
        </section>
      </div>

      {/* Tabela comparativa — a "gangorra" */}
      <section style={{ ...styles.card, marginTop: 20 }}>
        <div style={styles.cardTitle}>A gangorra: assertividade × payoff do mercado</div>
        <div style={styles.tableGrid}>
          {[25, 33, 45, 50, 60, 70, 80].map(h => {
            const po = payoffFromHit(h)
            const isClose = Math.abs(h - hit) <= 4
            return (
              <button
                key={h}
                onClick={() => setHit(h)}
                style={{
                  ...styles.tableCell,
                  background: isClose ? 'rgba(111,230,240,0.08)' : 'transparent',
                  borderColor: isClose ? 'rgba(111,230,240,0.35)' : 'rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  color: 'inherit',
                  font: 'inherit',
                }}
              >
                <div style={styles.tableHit}>{h}%</div>
                <div style={styles.tableArrow}>payoff</div>
                <div style={styles.tableBe}>{fmt(po, 2)}:1</div>
                <div style={styles.tableNote}>do mercado</div>
              </button>
            )
          })}
        </div>
        <div style={styles.insight}>
          <b>Insight:</b> o mercado não te dá assertividade alta E payoff alto ao mesmo tempo. Quanto
          mais perto do preço você coloca o alvo, mais fácil bater (assertividade ↑) — mas o RR cai.
          Escolher um estilo é escolher <b>onde cair na curva</b>, não fugir dela.
        </div>
      </section>
    </div>
  )
}

function ControlSlider({ label, value, min, max, step, suffix, onChange, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={styles.ctrlLabel}>{label}</span>
        <span style={{ ...styles.ctrlValue, color }}>
          {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
          <span style={{ opacity: 0.6, fontSize: 12, marginLeft: 2 }}>{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ...styles.slider, accentColor: color }}
      />
    </div>
  )
}

function Mini({ label, value, sub, color }) {
  return (
    <div style={styles.mini}>
      <div style={styles.miniLabel}>{label}</div>
      <div style={{ ...styles.miniValue, color: color || '#E9EBEE' }}>{value}</div>
      {sub && <div style={styles.miniSub}>{sub}</div>}
    </div>
  )
}

const styles = {
  root: {
    maxWidth: 1100, margin: '0 auto', padding: '40px 28px',
    background: '#07080A', minHeight: '100vh', color: '#E9EBEE',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  eyebrow: {
    fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
    color: '#6FE6F0', fontWeight: 700, marginBottom: 8,
    textShadow: '0 0 14px rgba(111,230,240,0.4)',
  },
  title: {
    fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '0.01em',
    textTransform: 'uppercase',
  },
  sub: { marginTop: 10, color: 'rgba(233,235,238,0.62)', fontSize: 14, maxWidth: 680, lineHeight: 1.5 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 20,
  },
  card: {
    background: 'rgba(14,16,19,0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '22px 24px',
    backdropFilter: 'blur(20px) saturate(150%)',
  },
  cardTitle: {
    fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'rgba(233,235,238,0.5)', fontWeight: 600, marginBottom: 18,
  },
  hint: { fontSize: 12, color: 'rgba(233,235,238,0.6)', marginTop: 6 },
  ctrlLabel: { fontSize: 13, color: '#E9EBEE', fontWeight: 500 },
  ctrlValue: { fontSize: 20, fontWeight: 600, fontFamily: 'ui-monospace, monospace' },
  slider: { width: '100%', height: 4, cursor: 'pointer' },
  derivedBox: {
    padding: '14px 14px',
    background: 'rgba(231,198,122,0.05)',
    border: '1px solid rgba(231,198,122,0.2)',
    borderRadius: 10,
    marginBottom: 6,
  },
  chip: {
    fontSize: 11, padding: '5px 10px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid',
    borderRadius: 999,
    cursor: 'pointer',
    fontFamily: 'ui-monospace, monospace',
  },
  presetRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  preset: {
    flex: '1 1 100px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid',
    borderRadius: 10,
    padding: '10px 12px',
    cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 3,
    textAlign: 'left',
  },
  bigStat: {
    padding: '20px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  bigLabel: {
    fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'rgba(233,235,238,0.5)', marginBottom: 8,
  },
  bigValue: {
    fontSize: 44, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
    letterSpacing: '-0.02em', lineHeight: 1,
  },
  zoneTag: {
    display: 'inline-block', marginTop: 12,
    fontSize: 10, letterSpacing: '0.14em', fontWeight: 700,
    padding: '4px 10px', border: '1px solid', borderRadius: 999,
  },
  miniGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16,
  },
  mini: {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
  },
  miniLabel: { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(233,235,238,0.5)', marginBottom: 6 },
  miniValue: { fontSize: 18, fontWeight: 600, fontFamily: 'ui-monospace, monospace' },
  miniSub: { fontSize: 10, color: 'rgba(233,235,238,0.45)', marginTop: 4, lineHeight: 1.4 },
  formulaBox: {
    padding: '12px 14px',
    background: 'rgba(111,230,240,0.04)',
    border: '1px solid rgba(111,230,240,0.15)',
    borderRadius: 10,
  },
  formulaLabel: {
    fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: '#6FE6F0', marginBottom: 6, opacity: 0.8,
  },
  formula: { display: 'block', fontSize: 12, color: '#E9EBEE', fontFamily: 'ui-monospace, monospace', marginBottom: 4 },
  formulaSmall: { display: 'block', fontSize: 11, color: 'rgba(233,235,238,0.65)', fontFamily: 'ui-monospace, monospace' },
  tableGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8,
  },
  tableCell: {
    padding: '12px 10px',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  tableHit: { fontSize: 20, fontWeight: 700, color: '#6FE6F0', fontFamily: 'ui-monospace, monospace' },
  tableArrow: { fontSize: 9, color: 'rgba(233,235,238,0.45)', margin: '4px 0', letterSpacing: '0.08em' },
  tableBe: { fontSize: 18, fontWeight: 600, color: '#E7C67A', fontFamily: 'ui-monospace, monospace' },
  tableNote: { fontSize: 9, color: 'rgba(233,235,238,0.4)', marginTop: 2 },
  insight: {
    marginTop: 16, padding: '12px 14px',
    background: 'rgba(24,209,138,0.06)',
    border: '1px solid rgba(24,209,138,0.2)',
    borderRadius: 10, fontSize: 13, lineHeight: 1.5, color: 'rgba(233,235,238,0.85)',
  },
}
