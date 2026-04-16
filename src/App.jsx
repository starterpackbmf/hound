import React, { useState, useEffect, useRef } from 'react'

// ═══════════════════════════════════════════════
// HOUND — Minimal Apple-like redesign
// Fullscreen per step, Hound as subtle corner guide
// ═══════════════════════════════════════════════

// Relative paths work in both dev (Vite proxies /api → localhost:3001)
// and prod (Vercel serverless functions under api/)
const CALENDAR_URL = '/api/calendar'
const QUOTES_URL = '/api/quotes'
const OVERNIGHT_URL = '/api/overnight'

// ─── CLASSIFICATION ───
function classificar(v) {
  const a = Math.abs(v)
  const dir = v >= 0 ? 'Alta' : 'Baixa'
  if (a < 1.5) return { label: 'Abertura Lateral', tone: 'neutral' }
  if (a < 2.5) return { label: `Abertura Fraca ${dir}`, tone: v >= 0 ? 'up' : 'down' }
  if (a < 4.5) return { label: `Abertura Moderada ${dir}`, tone: v >= 0 ? 'up' : 'down' }
  return { label: `Abertura Forte ${dir}`, tone: v >= 0 ? 'up' : 'down' }
}

const TONE = {
  up:      { color: '#30d158', glow: '#30d15833' },
  down:    { color: '#ff453a', glow: '#ff453a33' },
  neutral: { color: '#64d2ff', glow: '#64d2ff33' },
}

// ─── DATE HELPER ───
function getTodayBR() {
  const d = new Date()
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  const dias  = ['dom','seg','ter','qua','qui','sex','sáb']
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
}

// After-market helper: 9h BRT is the reference — after that the "opening" has happened
function isAfterOpen() {
  const d = new Date()
  return d.getHours() >= 9
}

// ═══════════════════════════════════════════════
// HOUND PIXEL SPRITE (Habbo-style, animated)
// ═══════════════════════════════════════════════
const P_SIZE = 3
const OUT = '#0a0a0a'
const H = {
  fur1:  '#d0d8e0',
  fur2:  '#8a96a4',
  fur3:  '#525d6b',
  belly: '#f0f4f8',
  eye:   '#0a84ff',
  eyeW:  '#ffffff',
  nose:  '#1a1a1a',
  tongue:'#ff6482',
  earIn: '#c49080',
  paw:   '#a8b4c0',
}

function Sprite({ pixels, w, h, scale = 1, children }) {
  const s = P_SIZE * scale
  const filled = new Set(pixels.map(([x,y]) => `${x},${y}`))
  const outs = []
  pixels.forEach(([x,y]) => {
    if (!filled.has(`${x-1},${y}`)) outs.push([x*s, y*s, 1, s])
    if (!filled.has(`${x+1},${y}`)) outs.push([(x+1)*s-1, y*s, 1, s])
    if (!filled.has(`${x},${y-1}`)) outs.push([x*s, y*s, s, 1])
    if (!filled.has(`${x},${y+1}`)) outs.push([x*s, (y+1)*s-1, s, 1])
  })
  return (
    <svg width={w*s} height={h*s} viewBox={`0 0 ${w*s} ${h*s}`} style={{ imageRendering: 'pixelated', overflow: 'visible', display: 'block' }}>
      {pixels.map(([x,y,c],i) => <rect key={i} x={x*s} y={y*s} width={s} height={s} fill={c} />)}
      {outs.map(([x,y,ww,hh],i) => <rect key={`o${i}`} x={x} y={y} width={ww} height={hh} fill={OUT} />)}
      {children}
    </svg>
  )
}

function HoundWalk({ frame = 0, scale = 1 }) {
  const f = frame % 2
  const px = [
    [5,0,H.fur2],[10,0,H.fur2],
    [4,1,H.fur2],[5,1,H.fur1],[6,1,H.fur2],[9,1,H.fur2],[10,1,H.fur1],[11,1,H.fur2],
    [4,2,H.fur1],[5,2,H.earIn],[6,2,H.fur1],[9,2,H.fur1],[10,2,H.earIn],[11,2,H.fur1],
    [3,3,H.fur1],[4,3,H.fur1],[5,3,H.fur1],[6,3,H.fur1],[7,3,H.fur1],[8,3,H.fur1],[9,3,H.fur1],[10,3,H.fur1],[11,3,H.fur1],[12,3,H.fur1],
    [3,4,H.fur1],[4,4,H.fur1],[5,4,H.fur1],[6,4,H.fur1],[7,4,H.fur1],[8,4,H.fur1],[9,4,H.fur1],[10,4,H.fur1],[11,4,H.fur1],[12,4,H.fur1],
    [3,5,H.fur1],[4,5,H.eyeW],[5,5,H.eye],[6,5,H.fur1],[7,5,H.fur1],[8,5,H.fur1],[9,5,H.eyeW],[10,5,H.eye],[11,5,H.fur1],[12,5,H.fur1],
    [3,6,H.fur1],[4,6,H.fur1],[5,6,H.fur1],[6,6,H.fur1],[7,6,H.fur2],[8,6,H.fur2],[9,6,H.fur1],[10,6,H.fur1],[11,6,H.fur1],[12,6,H.fur1],
    [4,7,H.fur1],[5,7,H.fur1],[6,7,H.belly],[7,7,H.nose],[8,7,H.nose],[9,7,H.belly],[10,7,H.fur1],[11,7,H.fur1],
    [4,8,H.fur1],[5,8,H.belly],[6,8,H.belly],[7,8,H.belly],[8,8,H.belly],[9,8,H.belly],[10,8,H.belly],[11,8,H.fur1],
    [5,9,H.fur2],[6,9,H.fur1],[7,9,H.fur1],[8,9,H.fur1],[9,9,H.fur1],[10,9,H.fur2],
    [5,10,H.fur2],[6,10,H.fur1],[7,10,H.belly],[8,10,H.belly],[9,10,H.fur1],[10,10,H.fur2],
    [5,11,H.fur2],[6,11,H.fur1],[7,11,H.belly],[8,11,H.belly],[9,11,H.fur1],[10,11,H.fur2],
    [5,12,H.fur3],[6,12,H.fur2],[7,12,H.fur1],[8,12,H.fur1],[9,12,H.fur2],[10,12,H.fur3],
    [11,10,H.fur2],[12,9,H.fur1],[13,8,H.fur1],[14,7,H.fur2],
    ...(f === 0 ? [
      [5,13,H.fur3],[6,13,H.fur3],[9,13,H.fur3],[10,13,H.fur3],
      [4,14,H.fur3],[5,14,H.paw],[10,14,H.fur3],[11,14,H.paw],
    ] : [
      [6,13,H.fur3],[7,13,H.fur3],[8,13,H.fur3],[9,13,H.fur3],
      [6,14,H.paw],[7,14,H.fur3],[8,14,H.fur3],[9,14,H.paw],
    ]),
  ]
  return <Sprite pixels={px} w={16} h={16} scale={scale} />
}

function HoundSit({ frame = 0, scale = 1 }) {
  const tailAngle = (frame % 2 === 0) ? -12 : 12
  const blink = frame % 14 === 0
  const eyeC = blink ? H.fur1 : H.eye
  const px = [
    [5,0,H.fur2],[10,0,H.fur2],
    [4,1,H.fur2],[5,1,H.fur1],[6,1,H.fur2],[9,1,H.fur2],[10,1,H.fur1],[11,1,H.fur2],
    [4,2,H.fur1],[5,2,H.earIn],[6,2,H.fur1],[9,2,H.fur1],[10,2,H.earIn],[11,2,H.fur1],
    [3,3,H.fur1],[4,3,H.fur1],[5,3,H.fur1],[6,3,H.fur1],[7,3,H.fur1],[8,3,H.fur1],[9,3,H.fur1],[10,3,H.fur1],[11,3,H.fur1],[12,3,H.fur1],
    [3,4,H.fur1],[4,4,H.fur1],[5,4,H.fur1],[6,4,H.fur1],[7,4,H.fur1],[8,4,H.fur1],[9,4,H.fur1],[10,4,H.fur1],[11,4,H.fur1],[12,4,H.fur1],
    [3,5,H.fur1],[4,5,H.eyeW],[5,5,eyeC],[6,5,H.fur1],[7,5,H.fur1],[8,5,H.fur1],[9,5,H.eyeW],[10,5,eyeC],[11,5,H.fur1],[12,5,H.fur1],
    [3,6,H.fur1],[4,6,H.fur1],[5,6,H.fur1],[6,6,H.fur1],[7,6,H.fur2],[8,6,H.fur2],[9,6,H.fur1],[10,6,H.fur1],[11,6,H.fur1],[12,6,H.fur1],
    [4,7,H.fur1],[5,7,H.belly],[6,7,H.belly],[7,7,H.nose],[8,7,H.nose],[9,7,H.belly],[10,7,H.belly],[11,7,H.fur1],
    [4,8,H.fur1],[5,8,H.belly],[6,8,H.belly],[7,8,H.tongue],[8,8,H.belly],[9,8,H.belly],[10,8,H.belly],[11,8,H.fur1],
    [5,9,H.fur2],[6,9,H.fur1],[7,9,H.fur1],[8,9,H.fur1],[9,9,H.fur1],[10,9,H.fur2],
    [4,10,H.fur2],[5,10,H.fur1],[6,10,H.belly],[7,10,H.belly],[8,10,H.belly],[9,10,H.fur1],[10,10,H.fur2],[11,10,H.fur2],
    [4,11,H.fur2],[5,11,H.fur1],[6,11,H.belly],[7,11,H.belly],[8,11,H.belly],[9,11,H.fur1],[10,11,H.fur2],[11,11,H.fur2],
    [4,12,H.fur3],[5,12,H.fur2],[6,12,H.fur1],[7,12,H.fur1],[8,12,H.fur1],[9,12,H.fur2],[10,12,H.fur3],[11,12,H.fur3],
    [4,13,H.paw],[5,13,H.paw],[6,13,H.fur3],[7,13,H.fur3],[8,13,H.fur3],[9,13,H.paw],[10,13,H.paw],
  ]
  const s = P_SIZE * scale
  const tailPx = [[0,0,H.fur2],[1,0,H.fur1],[-1,1,H.fur1],[0,1,H.fur2],[1,1,H.fur2]]
  const filled = new Set(px.map(([x,y]) => `${x},${y}`))
  const outs = []
  px.forEach(([x,y]) => {
    if (!filled.has(`${x-1},${y}`)) outs.push([x*s, y*s, 1, s])
    if (!filled.has(`${x+1},${y}`)) outs.push([(x+1)*s-1, y*s, 1, s])
    if (!filled.has(`${x},${y-1}`)) outs.push([x*s, y*s, s, 1])
    if (!filled.has(`${x},${y+1}`)) outs.push([x*s, (y+1)*s-1, s, 1])
  })
  return (
    <svg width={16*s} height={16*s} viewBox={`0 0 ${16*s} ${16*s}`} style={{ imageRendering: 'pixelated', overflow: 'visible', display: 'block' }}>
      {px.map(([x,y,c],i) => <rect key={i} x={x*s} y={y*s} width={s} height={s} fill={c} />)}
      {outs.map(([x,y,ww,hh],i) => <rect key={`o${i}`} x={x} y={y} width={ww} height={hh} fill={OUT} />)}
      <g transform={`translate(${11*s},${9*s}) rotate(${tailAngle}, ${s/2}, ${s})`} style={{ transition: 'transform 0.3s' }}>
        {tailPx.map(([x,y,c],i) => <rect key={`t${i}`} x={x*s} y={y*s} width={s} height={s} fill={c} />)}
      </g>
    </svg>
  )
}

// ═══════════════════════════════════════════════
// STEP DEFINITIONS
// ═══════════════════════════════════════════════
const STEPS = [
  { id: 'calendar',   num: '01', title: 'Calendário econômico',   sub: 'Buscando eventos do dia' },
  { id: 'brnews',     num: '02', title: 'Notícia Brasil às 09:00', sub: 'Checando o gatilho do dia' },
  { id: 'watchlist',  num: '03', title: 'Watchlist',               sub: 'Variação pré-mercado' },
  { id: 'calculo',    num: '04', title: 'Cálculo',                 sub: 'Aplicando a fórmula' },
  { id: 'resultado',  num: '05', title: 'Classificação',           sub: 'Abertura do dia' },
]

// ═══════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════
export default function App() {
  const [phase, setPhase] = useState('home') // home | running | done
  const [stepIdx, setStepIdx] = useState(0)
  const [data, setData] = useState({})
  const [error, setError] = useState(null)
  const [frame, setFrame] = useState(0)
  const [proxyUp, setProxyUp] = useState(null) // null=checking, true=up, false=down
  const abortRef = useRef(null)

  // Animate hound frames
  useEffect(() => {
    const iv = setInterval(() => setFrame(f => f + 1), 380)
    return () => clearInterval(iv)
  }, [])

  // Preflight ping the proxy
  useEffect(() => {
    let cancelled = false
    async function ping() {
      try {
        const ac = new AbortController()
        const t = setTimeout(() => ac.abort(), 2500)
        const res = await fetch(CALENDAR_URL, { signal: ac.signal })
        clearTimeout(t)
        if (!cancelled) setProxyUp(res.ok)
      } catch {
        if (!cancelled) setProxyUp(false)
      }
    }
    ping()
    const iv = setInterval(ping, 8000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  // ─── RUN AGENT ───
  async function run() {
    setPhase('running')
    setStepIdx(0)
    setData({})
    setError(null)
    abortRef.current = new AbortController()

    const warnings = []

    // Helper: fetch JSON with fallback instead of throwing
    const safeFetch = async (url, fallback, label) => {
      try {
        const res = await fetch(url, { signal: abortRef.current.signal })
        if (!res.ok) throw new Error(`${label} HTTP ${res.status}`)
        const json = await res.json()
        console.log(`[${label}]`, json)
        return json
      } catch (err) {
        if (err.name === 'AbortError') throw err
        const msg = /fetch/i.test(err.message)
          ? `${label}: proxy offline`
          : `${label}: ${err.message}`
        console.warn(`[fallback] ${msg}`)
        warnings.push(msg)
        return { ...fallback, _fallback: true }
      }
    }

    try {
      // Step 0: Calendário
      await wait(700)
      const cal = await safeFetch(CALENDAR_URL, { eventos: [] }, 'calendário')
      setData(d => ({ ...d, calendar: cal }))
      await wait(1800)
      setStepIdx(1)

      // Step 1: Notícia BR 9h (a qualquer hora do dia — olha o calendário inteiro)
      await wait(900)
      const eventosBR9h = (cal.eventos || []).filter(e => e.pais === 'Brasil' && e.hora === '09:00')
      const brNews = { temNoticia: eventosBR9h.length > 0, eventos: eventosBR9h, _fallback: cal._fallback }
      setData(d => ({ ...d, brnews: brNews }))
      await wait(1800)
      setStepIdx(2)

      // Step 2: Watchlist
      await wait(700)
      const zeros = { VALE: 0, PBR: 0, ITUB: 0, BDORY: 0, BBD: 0, B3: 0, VIX: 0, BRENT: 0, IRON: 0 }
      const q = await safeFetch(QUOTES_URL, zeros, 'cotações')
      setData(d => ({ ...d, watchlist: q }))
      await wait(2200)
      setStepIdx(3)

      // Step 3: Cálculo
      await wait(800)
      let calc
      if (brNews.temNoticia) {
        const parts = { VALE: q.VALE||0, PBR: q.PBR||0, ITUB: q.ITUB||0, BDORY: q.BDORY||0, BBD: q.BBD||0, B3: q.B3||0 }
        const total = Object.values(parts).reduce((a,b)=>a+b, 0)
        calc = {
          motivo: 'Notícia BR 09:00 → soma dos 6 papéis brasileiros',
          formula: 'VALE + PBR + ITUB + BDORY + BBD + B3',
          parts,
          resultado: parseFloat(total.toFixed(2)),
          _fallback: q._fallback,
        }
      } else {
        const vix = q.VIX||0, iron = q.IRON||0, brent = q.BRENT||0
        calc = {
          motivo: 'Sem notícia BR 09:00 → índices globais',
          formula: '−VIX + Minério + Brent',
          parts: { '−VIX': -vix, Minério: iron, Brent: brent },
          resultado: parseFloat((-vix + iron + brent).toFixed(2)),
          _fallback: q._fallback,
        }
      }
      setData(d => ({ ...d, calculo: calc }))
      await wait(2200)
      setStepIdx(4)

      // Step 4: Resultado
      await wait(800)
      setData(d => ({ ...d, resultado: { valor: calc.resultado } }))
      await wait(500)

      if (warnings.length > 0) setError(`fallback ativo: ${warnings.join(' · ')}`)
      setPhase('done')
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error(err)
      setError(err.message)
      setPhase('home')
    }
  }

  function reset() {
    abortRef.current?.abort()
    setPhase('home')
    setStepIdx(0)
    setData({})
    setError(null)
  }

  // ─── RENDER ───
  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* Subtle ambient gradient */}
      <div style={S.ambient} />

      {/* Top bar */}
      <header style={S.header}>
        <div style={S.brand}>
          <div style={{ transform: 'translateY(2px)' }}>
            <HoundSit frame={frame} scale={0.55} />
          </div>
          <div>
            <div style={S.brandName}>Hound</div>
            <div style={S.brandSub}>Pré-mercado</div>
          </div>
        </div>
        <div style={S.headerRight}>
          <div style={S.date}>{getTodayBR()}</div>
          {phase === 'running' && (
            <button onClick={reset} style={S.btnGhost}>cancelar</button>
          )}
          {phase === 'done' && (
            <button onClick={reset} style={S.btnGhost}>nova análise</button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={S.main}>
        {phase === 'home' && <HomeScreen onStart={run} error={error} proxyUp={proxyUp} />}
        {phase === 'running' && <StepStage stepIdx={stepIdx} data={data} frame={frame} />}
        {phase === 'done' && <ResultScreen data={data} frame={frame} warning={error} />}
      </main>

      {/* Progress rail */}
      {(phase === 'running' || phase === 'done') && (
        <footer style={S.footer}>
          <div style={S.progressRail}>
            {STEPS.map((s, i) => {
              const active = phase === 'running' ? i === stepIdx : true
              const done = phase === 'done' || i < stepIdx
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    ...S.dot,
                    background: done ? '#ffffff' : active ? '#ffffff' : '#ffffff18',
                    transform: active && phase === 'running' ? 'scale(1.6)' : 'scale(1)',
                    boxShadow: active && phase === 'running' ? '0 0 14px #ffffff88' : 'none',
                  }} />
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 40, height: 1,
                      background: done ? '#ffffff66' : '#ffffff10',
                      transition: 'background 0.4s',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </footer>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════
function HomeScreen({ onStart, error, proxyUp }) {
  const afterOpen = isAfterOpen()
  const disabled = proxyUp === false
  return (
    <div style={S.center}>
      <div className="fadeUp" style={{ textAlign: 'center' }}>
        <div style={S.eyebrow}>
          {afterOpen ? 'Retrospectiva de abertura' : 'Agente de abertura'}
        </div>
        <h1 style={S.hugeTitle}>
          {afterOpen ? 'Como foi a abertura hoje?' : 'O que abre hoje?'}
        </h1>
        <p style={S.heroSub}>
          {afterOpen
            ? 'O Hound revisa o calendário, o gatilho das 09h e a watchlist para reconstruir o que aconteceu na abertura de hoje.'
            : 'O Hound varre o calendário, o gatilho das 09h e a watchlist pré-mercado para antecipar a abertura do mini índice e do mini dólar.'}
        </p>
        <button
          onClick={onStart}
          disabled={disabled}
          style={{
            ...S.btnPrimary,
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {afterOpen ? 'Revisar abertura' : 'Iniciar análise'}
        </button>

        {/* Proxy status line */}
        <div style={{ marginTop: 28, fontSize: 12, letterSpacing: 0.3 }}>
          {proxyUp === null && (
            <span style={{ color: '#ffffff44' }}>verificando proxy…</span>
          )}
          {proxyUp === true && (
            <span style={{ color: TONE.up.color }}>● proxy online — dados ao vivo</span>
          )}
          {proxyUp === false && (
            <div style={{ display: 'inline-block', textAlign: 'center', color: TONE.down.color }}>
              <div style={{ marginBottom: 6 }}>● proxy offline em localhost:3001</div>
              <div style={{ color: '#ffffff66', fontSize: 11 }}>
                num terminal separado, rode:{' '}
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#fff', background: '#ffffff0c', padding: '2px 8px', borderRadius: 4 }}>
                  node proxy.js
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 20, color: TONE.down.color, fontSize: 13, letterSpacing: 0.2 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// STEP STAGE — fullscreen slide per step
// ═══════════════════════════════════════════════
function StepStage({ stepIdx, data, frame }) {
  const step = STEPS[stepIdx]
  return (
    <div style={S.center}>
      <div key={stepIdx} className="slide" style={{ width: '100%', maxWidth: 900 }}>
        <div style={S.stepNum}>{step.num} / 05</div>
        <h2 style={S.stepTitle}>{step.title}</h2>
        <div style={S.stepSub}>{step.sub}</div>

        <div style={S.stepBody}>
          {step.id === 'calendar'  && <CalendarView data={data.calendar} />}
          {step.id === 'brnews'    && <BRNewsView data={data.brnews} />}
          {step.id === 'watchlist' && <WatchlistView data={data.watchlist} />}
          {step.id === 'calculo'   && <CalcView data={data.calculo} />}
          {step.id === 'resultado' && <FinalView data={data.resultado} calc={data.calculo} />}
        </div>

        {/* Hound walking subtle indicator */}
        <div style={S.houndGuide}>
          <HoundWalk frame={frame} scale={0.65} />
          <div style={S.houndGuideText}>Hound farejando…</div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════
function CalendarView({ data }) {
  if (!data) return <Loader label="Puxando calendário Finnhub" />
  const eventos = data.eventos || []
  return (
    <div>
      {eventos.length === 0 ? (
        <div style={S.emptyState}>Nenhum evento relevante para hoje.</div>
      ) : (
        <div style={S.listPanel}>
          {eventos.map((e, i) => (
            <div key={i} className="fadeUp" style={{ ...S.listRow, animationDelay: `${i * 60}ms` }}>
              <div style={S.listTime}>{e.hora}</div>
              <div style={{ flex: 1 }}>
                <div style={S.listEvent}>{e.evento}</div>
                <div style={S.listCountry}>{e.pais}</div>
              </div>
              <div style={S.listImpact}>
                {'●'.repeat(e.impacto)}<span style={{ opacity: 0.2 }}>{'●'.repeat(3 - e.impacto)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BRNewsView({ data }) {
  if (!data) return <Loader label="Procurando gatilho BR às 09:00" />
  const hit = data.temNoticia
  return (
    <div className="fadeUp" style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        padding: '44px 64px',
        background: hit ? `${TONE.neutral.color}11` : '#ffffff05',
        border: `1px solid ${hit ? TONE.neutral.color + '55' : '#ffffff12'}`,
        borderRadius: 22,
      }}>
        <div style={{
          fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
          color: hit ? TONE.neutral.color : '#ffffff66',
        }}>
          {hit ? 'Gatilho detectado' : 'Sem gatilho'}
        </div>
        <div style={{ fontSize: 40, fontWeight: 500, color: '#fff', letterSpacing: -0.8 }}>
          {hit ? 'Há notícia BR às 09:00' : 'Sem notícia BR às 09:00'}
        </div>
        {hit && data.eventos.map((e, i) => (
          <div key={i} style={{ fontSize: 16, color: TONE.neutral.color }}>
            → {e.evento}
          </div>
        ))}
        <div style={{ fontSize: 13, color: '#ffffff55', marginTop: 8, lineHeight: 1.6 }}>
          {hit
            ? 'Usaremos a soma dos 6 papéis brasileiros'
            : 'Usaremos os índices globais (VIX, Minério, Brent)'}
        </div>
      </div>
    </div>
  )
}

function WatchlistView({ data }) {
  if (!data) return <Loader label="Lendo cotações em tempo real" />
  const papeis = [
    ['VALE', 'Vale'],
    ['PBR', 'Petrobras'],
    ['ITUB', 'Itaú'],
    ['BDORY', 'Banco do Brasil'],
    ['BBD', 'Bradesco'],
    ['B3', 'B3'],
  ]
  const indices = [
    ['VIX', 'VIX'],
    ['IRON', 'Minério'],
    ['BRENT', 'Brent'],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
      <div>
        <div style={S.colTitle}>Papéis Brasil</div>
        <div style={S.grid}>
          {papeis.map(([k, name], i) => (
            <Tile key={k} name={name} v={data[k]} delay={i * 50} />
          ))}
        </div>
      </div>
      <div>
        <div style={S.colTitle}>Índices globais</div>
        <div style={S.grid}>
          {indices.map(([k, name], i) => (
            <Tile key={k} name={name} v={data[k]} delay={i * 50 + 300} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Tile({ name, v, delay = 0 }) {
  const val = v || 0
  const up = val >= 0
  const c = up ? TONE.up.color : TONE.down.color
  return (
    <div className="fadeUp" style={{ ...S.tile, animationDelay: `${delay}ms` }}>
      <div style={S.tileName}>{name}</div>
      <div style={{ ...S.tileValue, color: c }}>
        {up ? '+' : ''}{val.toFixed(2)}<span style={{ fontSize: 16, opacity: 0.6 }}>%</span>
      </div>
    </div>
  )
}

function CalcView({ data }) {
  if (!data) return <Loader label="Somando os componentes" />
  const up = data.resultado >= 0
  const c = up ? TONE.up.color : TONE.down.color
  return (
    <div className="fadeUp" style={{ textAlign: 'center' }}>
      <div style={S.calcMotivo}>{data.motivo}</div>
      <div style={S.calcFormula}>{data.formula}</div>
      <div style={S.calcParts}>
        {Object.entries(data.parts).map(([k, v], i) => (
          <div key={k} style={S.calcPart}>
            <div style={S.calcPartName}>{k}</div>
            <div style={{ ...S.calcPartValue, color: v >= 0 ? TONE.up.color : TONE.down.color }}>
              {v >= 0 ? '+' : ''}{v.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40 }}>
        <div style={S.calcTotalLabel}>resultado</div>
        <div style={{ ...S.calcTotalValue, color: c, textShadow: `0 0 40px ${c}66` }}>
          {up ? '+' : ''}{data.resultado.toFixed(2)}<span style={{ fontSize: 28, opacity: 0.6 }}>%</span>
        </div>
      </div>
    </div>
  )
}

function FinalView({ data, calc }) {
  if (!data) return <Loader label="Classificando" />
  const cls = classificar(data.valor)
  const tone = TONE[cls.tone]
  const up = data.valor >= 0
  const afterOpen = isAfterOpen()
  return (
    <div className="fadeUp" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#ffffff55', marginBottom: 20 }}>
        {afterOpen ? 'como foi a abertura' : 'classificação final'}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 400, color: '#fff', letterSpacing: -0.5, marginBottom: 12,
      }}>
        {cls.label}
      </div>
      <div style={{
        fontSize: 140, fontWeight: 200, color: tone.color,
        letterSpacing: -6, lineHeight: 1, textShadow: `0 0 80px ${tone.glow}`,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {up ? '+' : ''}{data.valor.toFixed(2)}<span style={{ fontSize: 60, opacity: 0.5 }}>%</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// RESULT SCREEN (phase='done')
// ═══════════════════════════════════════════════
function ResultScreen({ data, frame, warning }) {
  const v = data.resultado?.valor ?? 0
  const cls = classificar(v)
  const tone = TONE[cls.tone]
  const up = v >= 0
  const calc = data.calculo
  const afterOpen = isAfterOpen()

  const ranges = [
    { k: 'Lateral',  r: '< 1,5%',   active: Math.abs(v) < 1.5 },
    { k: 'Fraca',    r: '1,5–2,5%', active: Math.abs(v) >= 1.5 && Math.abs(v) < 2.5 },
    { k: 'Moderada', r: '2,5–4,5%', active: Math.abs(v) >= 2.5 && Math.abs(v) < 4.5 },
    { k: 'Forte',    r: '> 4,5%',   active: Math.abs(v) >= 4.5 },
  ]

  return (
    <div style={S.resultScroll}>
      {/* ─── HERO ─── */}
      <section style={S.resultHero}>
        <div className="fadeUp" style={{ width: '100%', maxWidth: 1000, textAlign: 'center' }}>
          {/* Hound sitting — subtle, above result */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <HoundSit frame={frame} scale={1.6} />
          </div>

          <div style={{
            fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
            color: '#ffffff55', marginBottom: 16,
          }}>
            {afterOpen ? 'abertura de hoje' : 'abertura estimada'}
          </div>

          <div style={{
            fontSize: 36, fontWeight: 400, color: '#fff', letterSpacing: -0.8, marginBottom: 20,
          }}>
            {cls.label}
          </div>

          <div style={{
            fontSize: 180, fontWeight: 200, color: tone.color,
            letterSpacing: -8, lineHeight: 1, textShadow: `0 0 100px ${tone.glow}`,
            fontVariantNumeric: 'tabular-nums', marginBottom: 48,
          }}>
            {up ? '+' : ''}{v.toFixed(2)}<span style={{ fontSize: 80, opacity: 0.5 }}>%</span>
          </div>

          {/* Rule */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 48, flexWrap: 'wrap' }}>
            {ranges.map((r, i) => (
              <div key={i} style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: `1px solid ${r.active ? tone.color + '88' : '#ffffff14'}`,
                background: r.active ? tone.color + '14' : 'transparent',
                color: r.active ? tone.color : '#ffffff40',
                fontSize: 12,
                transition: 'all 0.4s',
              }}>
                <div style={{ fontWeight: 500 }}>{r.k}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{r.r}</div>
              </div>
            ))}
          </div>

          {/* Formula footnote */}
          {calc && (
            <div style={{ fontSize: 13, color: '#ffffff55', lineHeight: 1.8 }}>
              <div style={{ marginBottom: 4 }}>{calc.motivo}</div>
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#ffffff88' }}>
                {calc.formula}
              </div>
            </div>
          )}

          {/* Fallback warning (subtle, doesn't block viewing) */}
          {warning && (
            <div style={{
              marginTop: 28,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px',
              background: '#ffaa0010',
              border: '1px solid #ffaa0033',
              borderRadius: 999,
              fontSize: 11, color: '#ffaa00cc',
              letterSpacing: 0.3,
            }}>
              ⚠ {warning}
            </div>
          )}

          {/* Scroll hint */}
          <div className="scrollHint" style={{
            marginTop: 56,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: '#ffffff44', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
          }}>
            <span>os passos do Hound</span>
            <span style={{ fontSize: 18, lineHeight: 1 }}>↓</span>
          </div>
        </div>
      </section>

      {/* ─── STEPS REVIEW ─── */}
      <section style={S.stepsReview}>
        <div style={S.stepsReviewInner}>
          <div style={S.stepsReviewHeader}>
            <div style={S.eyebrow}>Revisão da análise</div>
            <h2 style={S.stepsReviewTitle}>Os passos do Hound</h2>
          </div>

          <StepReviewCard
            num="01"
            title="Calendário econômico"
            summary={`${data.calendar?.eventos?.length || 0} eventos relevantes hoje`}
          >
            <CalendarReview data={data.calendar} />
          </StepReviewCard>

          <StepReviewCard
            num="02"
            title="Notícia Brasil às 09:00"
            summary={data.brnews?.temNoticia ? 'gatilho detectado' : 'sem gatilho'}
            tone={data.brnews?.temNoticia ? 'up' : 'neutral'}
          >
            <BRNewsReview data={data.brnews} />
          </StepReviewCard>

          <StepReviewCard
            num="03"
            title="Watchlist pré-mercado"
            summary="variação % dos 9 ativos"
          >
            <WatchlistReview data={data.watchlist} />
          </StepReviewCard>

          <StepReviewCard
            num="04"
            title="Cálculo"
            summary={calc?.formula || '—'}
          >
            <CalcReview data={calc} />
          </StepReviewCard>

          <StepReviewCard
            num="05"
            title="Classificação final"
            summary={`${cls.label} · ${up ? '+' : ''}${v.toFixed(2)}%`}
            tone={cls.tone}
          >
            <FinalReview data={data.resultado} cls={cls} tone={tone} up={up} />
          </StepReviewCard>
        </div>
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════
// STEP REVIEW — compact cards shown below the hero
// ═══════════════════════════════════════════════
function StepReviewCard({ num, title, summary, tone = 'neutral', children }) {
  const toneColor = TONE[tone]?.color || '#ffffff'
  return (
    <div className="fadeUp" style={S.stepCard}>
      <div style={S.stepCardHead}>
        <div style={S.stepCardNum}>{num}</div>
        <div style={{ flex: 1 }}>
          <div style={S.stepCardTitle}>{title}</div>
          <div style={{ ...S.stepCardSummary, color: toneColor, opacity: 0.75 }}>{summary}</div>
        </div>
      </div>
      <div style={S.stepCardBody}>
        {children}
      </div>
    </div>
  )
}

function CalendarReview({ data }) {
  if (!data || !data.eventos || data.eventos.length === 0) {
    return <div style={S.reviewEmpty}>nenhum evento relevante</div>
  }
  return (
    <div>
      {data.eventos.map((e, i) => {
        const isBR9h = e.pais === 'Brasil' && e.hora === '09:00'
        return (
          <div key={i} style={{
            ...S.reviewRow,
            background: isBR9h ? '#64d2ff08' : 'transparent',
            borderLeft: isBR9h ? '2px solid #64d2ff88' : '2px solid transparent',
            paddingLeft: 12,
          }}>
            <div style={{ ...S.reviewTime, color: isBR9h ? '#64d2ff' : '#ffffffcc' }}>
              {e.hora}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#fff' }}>{e.evento}</div>
              <div style={{ fontSize: 11, color: '#ffffff55' }}>{e.pais}</div>
            </div>
            <div style={{ fontSize: 11, color: '#64d2ff99', letterSpacing: 1 }}>
              {'●'.repeat(e.impacto || 1)}
              <span style={{ opacity: 0.2 }}>{'●'.repeat(3 - (e.impacto || 1))}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BRNewsReview({ data }) {
  if (!data) return <div style={S.reviewEmpty}>—</div>
  if (!data.temNoticia) {
    return (
      <div style={S.reviewEmpty}>
        nenhuma notícia brasileira encontrada às 09:00 — o cálculo usou os índices globais
      </div>
    )
  }
  return (
    <div>
      <div style={{ fontSize: 12, color: '#ffffff88', marginBottom: 10 }}>
        o Hound detectou {data.eventos.length} notícia{data.eventos.length > 1 ? 's' : ''} no Brasil às 09:00 — o cálculo usou a soma dos 6 papéis brasileiros
      </div>
      {data.eventos.map((e, i) => (
        <div key={i} style={S.reviewRow}>
          <div style={{ ...S.reviewTime, color: '#64d2ff' }}>09:00</div>
          <div style={{ fontSize: 13, color: '#fff' }}>{e.evento}</div>
        </div>
      ))}
    </div>
  )
}

function WatchlistReview({ data }) {
  if (!data) return <div style={S.reviewEmpty}>—</div>
  const papeis = [
    ['VALE', 'Vale'], ['PBR', 'Petrobras'], ['ITUB', 'Itaú'],
    ['BDORY', 'BB'], ['BBD', 'Bradesco'], ['B3', 'B3'],
  ]
  const indices = [['VIX', 'VIX'], ['IRON', 'Minério'], ['BRENT', 'Brent']]
  const Row = ({ k, name }) => {
    const val = data[k] || 0
    const up = val >= 0
    const c = up ? TONE.up.color : TONE.down.color
    return (
      <div style={S.reviewRow}>
        <div style={{ flex: 1, fontSize: 13, color: '#ffffffcc' }}>{name}</div>
        <div style={{ fontSize: 13, color: '#ffffff44', marginRight: 10 }}>{k}</div>
        <div style={{ fontSize: 13, color: c, fontVariantNumeric: 'tabular-nums', fontWeight: 500, minWidth: 60, textAlign: 'right' }}>
          {up ? '+' : ''}{val.toFixed(2)}%
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
      <div>
        <div style={S.reviewColTitle}>Papéis Brasil</div>
        {papeis.map(([k, n]) => <Row key={k} k={k} name={n} />)}
      </div>
      <div>
        <div style={S.reviewColTitle}>Índices globais</div>
        {indices.map(([k, n]) => <Row key={k} k={k} name={n} />)}
      </div>
    </div>
  )
}

function CalcReview({ data }) {
  if (!data) return <div style={S.reviewEmpty}>—</div>
  const up = data.resultado >= 0
  const c = up ? TONE.up.color : TONE.down.color
  return (
    <div>
      <div style={{ fontSize: 12, color: '#ffffff77', marginBottom: 10 }}>{data.motivo}</div>
      <div style={{ fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#fff', marginBottom: 14 }}>
        {data.formula}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {Object.entries(data.parts).map(([k, val]) => (
          <div key={k} style={{
            padding: '6px 12px',
            background: '#ffffff05',
            border: '1px solid #ffffff0c',
            borderRadius: 8,
            fontSize: 12,
          }}>
            <span style={{ color: '#ffffff55' }}>{k} </span>
            <span style={{ color: val >= 0 ? TONE.up.color : TONE.down.color, fontVariantNumeric: 'tabular-nums' }}>
              {val >= 0 ? '+' : ''}{val.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#ffffff55', letterSpacing: 0.5 }}>
        soma = <span style={{ color: c, fontSize: 18, fontWeight: 500, marginLeft: 4, fontVariantNumeric: 'tabular-nums' }}>
          {up ? '+' : ''}{data.resultado.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

function FinalReview({ data, cls, tone, up }) {
  if (!data) return <div style={S.reviewEmpty}>—</div>
  return (
    <div>
      <div style={{ fontSize: 12, color: '#ffffff77', marginBottom: 10 }}>
        o valor calculado caiu na faixa de <strong style={{ color: tone.color }}>{cls.label}</strong>
      </div>
      <div style={{
        fontSize: 42, fontWeight: 300, color: tone.color,
        letterSpacing: -1.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {up ? '+' : ''}{data.valor.toFixed(2)}<span style={{ fontSize: 20, opacity: 0.6 }}>%</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════
function Loader({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div className="pulse" style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: '#ffffff', marginRight: 10,
      }} />
      <span style={{ color: '#ffffff66', fontSize: 14, letterSpacing: 0.3 }}>{label}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
function wait(ms) { return new Promise(r => setTimeout(r, ms)) }

// ═══════════════════════════════════════════════
// STYLES (Apple-like minimal)
// ═══════════════════════════════════════════════
const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif`

const S = {
  root: {
    width: '100vw', height: '100vh', overflow: 'hidden',
    background: '#0a0a0c',
    color: '#fff',
    fontFamily: FONT,
    position: 'relative',
    display: 'flex', flexDirection: 'column',
    WebkitFontSmoothing: 'antialiased',
  },
  ambient: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 50% 20%, #1a1a2044 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  header: {
    position: 'relative', zIndex: 10,
    padding: '24px 40px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  brandName: { fontSize: 17, fontWeight: 500, letterSpacing: -0.2 },
  brandSub: { fontSize: 11, color: '#ffffff55', letterSpacing: 0.3, marginTop: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 20 },
  date: { fontSize: 12, color: '#ffffff55', letterSpacing: 0.3 },
  btnGhost: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #ffffff1c',
    borderRadius: 999,
    color: '#ffffffaa',
    fontFamily: FONT,
    fontSize: 12,
    cursor: 'pointer',
    letterSpacing: 0.2,
    transition: 'all 0.2s',
  },
  main: {
    flex: 1, position: 'relative', zIndex: 5,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 40px',
    overflow: 'hidden',
  },
  center: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  // Home
  eyebrow: {
    fontSize: 11, letterSpacing: 4, textTransform: 'uppercase',
    color: '#ffffff55', marginBottom: 28,
  },
  hugeTitle: {
    fontSize: 88, fontWeight: 300, letterSpacing: -3,
    margin: 0, lineHeight: 1, marginBottom: 32,
    background: 'linear-gradient(180deg, #ffffff 0%, #ffffff88 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    fontSize: 17, lineHeight: 1.6, color: '#ffffff88',
    maxWidth: 560, margin: '0 auto 48px', letterSpacing: 0.1,
  },
  btnPrimary: {
    padding: '16px 36px',
    background: '#fff',
    border: 'none',
    borderRadius: 999,
    color: '#0a0a0c',
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: 0.1,
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 0 0 1px #ffffff12, 0 20px 60px -10px #ffffff18',
  },
  // Step stage
  stepNum: {
    fontSize: 11, letterSpacing: 4, color: '#ffffff44',
    marginBottom: 16, fontVariantNumeric: 'tabular-nums',
  },
  stepTitle: {
    fontSize: 54, fontWeight: 300, letterSpacing: -1.8,
    margin: 0, lineHeight: 1.05, color: '#fff',
  },
  stepSub: {
    fontSize: 16, color: '#ffffff66', marginTop: 8, letterSpacing: 0.1,
  },
  stepBody: { marginTop: 48, minHeight: 260 },
  houndGuide: {
    marginTop: 40,
    display: 'flex', alignItems: 'center', gap: 10,
    color: '#ffffff44', fontSize: 11, letterSpacing: 0.5,
  },
  houndGuideText: { fontStyle: 'italic' },
  // Lists
  listPanel: {
    background: '#ffffff04',
    border: '1px solid #ffffff0a',
    borderRadius: 18,
    overflow: 'hidden',
  },
  listRow: {
    display: 'flex', alignItems: 'center', gap: 20,
    padding: '18px 24px',
    borderBottom: '1px solid #ffffff08',
  },
  listTime: {
    fontSize: 15, fontVariantNumeric: 'tabular-nums',
    color: '#ffffffcc', width: 60, fontWeight: 500,
  },
  listEvent: { fontSize: 15, color: '#fff', letterSpacing: 0.1 },
  listCountry: { fontSize: 12, color: '#ffffff55', marginTop: 3 },
  listImpact: { fontSize: 12, color: '#64d2ffcc', letterSpacing: 1 },
  emptyState: {
    textAlign: 'center', padding: '60px 20px',
    color: '#ffffff55', fontSize: 15,
  },
  // Watchlist
  colTitle: {
    fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
    color: '#ffffff55', marginBottom: 14,
  },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
  },
  tile: {
    background: '#ffffff04',
    border: '1px solid #ffffff0a',
    borderRadius: 14,
    padding: '18px 20px',
  },
  tileName: {
    fontSize: 12, color: '#ffffff66', letterSpacing: 0.2, marginBottom: 8,
  },
  tileValue: {
    fontSize: 28, fontWeight: 300, letterSpacing: -0.8,
    fontVariantNumeric: 'tabular-nums',
  },
  // Calc
  calcMotivo: {
    fontSize: 13, letterSpacing: 0.3, color: '#ffffff66', marginBottom: 18,
  },
  calcFormula: {
    fontSize: 22, fontWeight: 400, color: '#fff', letterSpacing: 0.3,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    marginBottom: 28,
  },
  calcParts: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
  },
  calcPart: {
    padding: '14px 22px',
    background: '#ffffff04',
    border: '1px solid #ffffff0c',
    borderRadius: 12,
    minWidth: 100,
  },
  calcPartName: { fontSize: 11, color: '#ffffff55', letterSpacing: 0.3, marginBottom: 4 },
  calcPartValue: { fontSize: 20, fontWeight: 400, fontVariantNumeric: 'tabular-nums' },
  calcTotalLabel: {
    fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
    color: '#ffffff55', marginBottom: 10,
  },
  calcTotalValue: {
    fontSize: 100, fontWeight: 200, letterSpacing: -4, lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  // Result screen scroll + steps review
  resultScroll: {
    width: '100%', height: '100%',
    overflowY: 'auto', overflowX: 'hidden',
  },
  resultHero: {
    minHeight: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 40px 60px',
  },
  stepsReview: {
    width: '100%',
    padding: '40px 40px 100px',
    borderTop: '1px solid #ffffff08',
    background: '#08080a',
  },
  stepsReviewInner: {
    maxWidth: 900, margin: '0 auto',
  },
  stepsReviewHeader: {
    textAlign: 'center', marginBottom: 48,
  },
  stepsReviewTitle: {
    fontSize: 40, fontWeight: 300, letterSpacing: -1.2,
    margin: 0, color: '#fff',
  },
  stepCard: {
    background: '#ffffff04',
    border: '1px solid #ffffff0a',
    borderRadius: 18,
    padding: '24px 28px',
    marginBottom: 14,
  },
  stepCardHead: {
    display: 'flex', alignItems: 'flex-start', gap: 18,
    marginBottom: 18,
    paddingBottom: 16,
    borderBottom: '1px solid #ffffff08',
  },
  stepCardNum: {
    fontSize: 11, fontVariantNumeric: 'tabular-nums',
    color: '#ffffff44', letterSpacing: 2, paddingTop: 4,
    minWidth: 28,
  },
  stepCardTitle: {
    fontSize: 18, fontWeight: 500, color: '#fff', letterSpacing: -0.3,
  },
  stepCardSummary: {
    fontSize: 12, marginTop: 4, letterSpacing: 0.2,
  },
  stepCardBody: { paddingLeft: 46 },
  reviewRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '8px 0',
    borderBottom: '1px solid #ffffff06',
  },
  reviewTime: {
    fontSize: 13, fontVariantNumeric: 'tabular-nums',
    width: 48, fontWeight: 500,
  },
  reviewEmpty: {
    fontSize: 12, color: '#ffffff55', fontStyle: 'italic', padding: '4px 0',
  },
  reviewColTitle: {
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: '#ffffff44', marginBottom: 8, paddingBottom: 4,
    borderBottom: '1px solid #ffffff08',
  },
  // Footer
  footer: {
    position: 'relative', zIndex: 10,
    padding: '28px 40px 36px',
    display: 'flex', justifyContent: 'center',
  },
  progressRail: { display: 'flex', alignItems: 'center' },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    transition: 'all 0.5s cubic-bezier(.2,.8,.2,1)',
  },
}

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body { background: #0a0a0c; }

  button:hover { transform: translateY(-1px); }
  button:active { transform: translateY(0); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fadeUp { animation: fadeUp 0.7s cubic-bezier(.2,.8,.2,1) both; }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .slide { animation: slideIn 0.6s cubic-bezier(.2,.8,.2,1) both; }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.4; transform: scale(1.4); }
  }
  .pulse { animation: pulse 1.4s ease-in-out infinite; }

  @keyframes scrollHint {
    0%, 100% { opacity: 0.35; transform: translateY(0); }
    50%      { opacity: 0.7;  transform: translateY(4px); }
  }
  .scrollHint { animation: scrollHint 2.4s ease-in-out infinite; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #ffffff12; border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: #ffffff22; }
`
