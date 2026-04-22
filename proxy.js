// Simple proxy server that forwards requests to Anthropic API with the key from env
const fs = require('fs')
const path = require('path')
const express = require('express')
const app = express()

// Manual .env loading (handles BOM and Windows quirks)
function loadEnv() {
  try {
    let content = fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1) // strip BOM
    content.split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/)
      if (m) process.env[m[1]] = m[2]
    })
  } catch (e) { console.warn('No .env file found') }
}
loadEnv()

const API_KEY = process.env.ANTHROPIC_API_KEY
const FINNHUB_KEY = process.env.FINNHUB_API_KEY
const MATILHA_API_KEY = process.env.MATILHA_API_KEY
const PANDA_API_KEY = process.env.PANDA_API_KEY
if (!API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set in environment!')
  process.exit(1)
}
console.log('✓ Anthropic key loaded:', API_KEY.slice(0, 10) + '...')
console.log(FINNHUB_KEY ? '✓ Finnhub key loaded' : '⚠ FINNHUB_API_KEY not set (calendar will fallback)')
console.log(MATILHA_API_KEY ? '✓ Matilha key loaded' : '⚠ MATILHA_API_KEY not set (diário API disabled)')
console.log(PANDA_API_KEY ? '✓ Panda key loaded' : '⚠ PANDA_API_KEY not set (Panda API disabled)')

app.use(express.json({ limit: '1mb' }))

// CORS for Vite dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// ─── ANTHROPIC PROXY ───
app.post('/v1/messages', async (req, res) => {
  try {
    console.log('→ Proxying request to Anthropic API...')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    console.log('← Response:', response.status, data.usage ? `(${data.usage.input_tokens}+${data.usage.output_tokens} tokens)` : '')
    res.status(response.status).json(data)
  } catch (err) {
    console.error('✗ Proxy error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── FINNHUB ECONOMIC CALENDAR ───
// Returns today's economic events filtered for Brazil & USA, with impact normalized to 1-3 stars
app.get('/calendar', async (req, res) => {
  if (!FINNHUB_KEY) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' })
  }
  try {
    const today = new Date()
    const iso = today.toISOString().split('T')[0]
    const url = `https://finnhub.io/api/v1/calendar/economic?from=${iso}&to=${iso}&token=${FINNHUB_KEY}`
    console.log('→ Fetching Finnhub economic calendar for', iso)

    const response = await fetch(url)
    if (!response.ok) {
      const text = await response.text()
      console.error('✗ Finnhub error:', response.status, text)
      return res.status(response.status).json({ error: `Finnhub ${response.status}: ${text}` })
    }
    const data = await response.json()
    const rawEvents = data.economicCalendar || []
    console.log(`← Finnhub returned ${rawEvents.length} raw events`)

    // Map Finnhub impact (0-3) to our 1-3 scale and country codes to names
    // Only include USA and Brazil events
    const countryMap = { US: 'EUA', BR: 'Brasil' }
    const eventos = rawEvents
      .filter(e => countryMap[e.country])
      .map(e => {
        // Finnhub time format: "YYYY-MM-DD HH:MM:SS" (UTC)
        // Convert to BRT (UTC-3)
        let hora = '--:--'
        if (e.time) {
          const [, timePart] = e.time.split(' ')
          if (timePart) {
            const [h, m] = timePart.split(':').map(Number)
            // UTC -> BRT (subtract 3 hours)
            const brtH = (h - 3 + 24) % 24
            hora = `${String(brtH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
          }
        }
        // Finnhub impact: "low", "medium", "high" OR numeric
        let impacto = 1
        if (typeof e.impact === 'string') {
          const map = { low: 1, medium: 2, high: 3 }
          impacto = map[e.impact.toLowerCase()] || 1
        } else if (typeof e.impact === 'number') {
          impacto = Math.min(3, Math.max(1, e.impact))
        }
        return {
          hora,
          evento: e.event || 'Unknown',
          impacto,
          pais: countryMap[e.country],
          actual: e.actual ?? null,
          estimate: e.estimate ?? null,
          prev: e.prev ?? null,
        }
      })
      .sort((a, b) => a.hora.localeCompare(b.hora))

    console.log(`← Filtered to ${eventos.length} US+BR events`)
    res.json({ eventos, _source: 'live', _provider: 'finnhub', _date: iso })
  } catch (err) {
    console.error('✗ Calendar error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── QUOTES ENDPOINT (mixed: Finnhub + Yahoo Finance) ───
// Returns variation % for all assets needed by Hound
async function finnhubQuote(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`
  const res = await fetch(url)
  const j = await res.json()
  if (j.error || !j.c || !j.pc) return { ticker: symbol, variacao: 0, current: null, prev: null, error: j.error || 'no data' }
  const variacao = ((j.c - j.pc) / j.pc) * 100
  return { ticker: symbol, variacao: parseFloat(variacao.toFixed(2)), current: j.c, prev: j.pc }
}

async function yahooQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
    })
    if (!res.ok) return { ticker: symbol, variacao: 0, current: null, prev: null, error: `HTTP ${res.status}` }
    const j = await res.json()
    const meta = j?.chart?.result?.[0]?.meta
    if (!meta) return { ticker: symbol, variacao: 0, current: null, prev: null, error: 'no meta' }
    const c = meta.regularMarketPrice
    const pc = meta.chartPreviousClose || meta.previousClose
    if (!c || !pc) return { ticker: symbol, variacao: 0, current: c, prev: pc, error: 'missing price' }
    const variacao = ((c - pc) / pc) * 100
    return { ticker: symbol, variacao: parseFloat(variacao.toFixed(2)), current: c, prev: pc }
  } catch (e) {
    console.error(`yahooQuote(${symbol}) failed:`, e.message)
    return { ticker: symbol, variacao: 0, current: null, prev: null, error: e.message }
  }
}

app.get('/quotes', async (req, res) => {
  if (!FINNHUB_KEY) return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' })
  try {
    console.log('→ Fetching all quotes...')
    const [VALE, PBR, ITUB, BDORY, BBD, B3, VIX, BRENT, IRON] = await Promise.all([
      finnhubQuote('VALE'),
      finnhubQuote('PBR'),
      finnhubQuote('ITUB'),
      finnhubQuote('BDORY'),
      finnhubQuote('BBD'),
      yahooQuote('B3SA3.SA'),
      yahooQuote('^VIX'),
      yahooQuote('BZ=F'),
      yahooQuote('RIO'), // Rio Tinto as Iron Ore proxy
    ])
    const out = {
      VALE: VALE.variacao,
      PBR: PBR.variacao,
      ITUB: ITUB.variacao,
      BDORY: BDORY.variacao,
      BBD: BBD.variacao,
      B3: B3.variacao,
      VIX: VIX.variacao,
      BRENT: BRENT.variacao,
      IRON: IRON.variacao,
      _source: 'live',
      _providers: { finnhub: ['VALE','PBR','ITUB','BDORY','BBD'], yahoo: ['B3SA3.SA','^VIX','BZ=F','RIO(proxy)'] },
      _raw: { VALE, PBR, ITUB, BDORY, BBD, B3, VIX, BRENT, IRON },
    }
    console.log('← Quotes delivered:', JSON.stringify({ VALE: out.VALE, PBR: out.PBR, ITUB: out.ITUB, BDORY: out.BDORY, BBD: out.BBD, B3: out.B3, VIX: out.VIX, BRENT: out.BRENT, IRON: out.IRON }))
    res.json(out)
  } catch (err) {
    console.error('✗ Quotes error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── OVERNIGHT NEWS ───
// Returns curated headlines from the last ~16 hours (overnight window)
app.get('/overnight', async (req, res) => {
  if (!FINNHUB_KEY) return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' })
  try {
    console.log('→ Fetching overnight news...')
    // Pull from both general and forex categories in parallel for broader coverage
    const [generalRes, forexRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/news?category=forex&token=${FINNHUB_KEY}`),
    ])

    if (!generalRes.ok) {
      const t = await generalRes.text()
      console.error('✗ Finnhub news error:', generalRes.status, t)
      return res.status(generalRes.status).json({ error: `Finnhub ${generalRes.status}: ${t}` })
    }

    const general = await generalRes.json()
    const forex = forexRes.ok ? await forexRes.json() : []
    const combined = [...general, ...forex]

    // Filter to last 16h (overnight window covers US close → BR open)
    const now = Math.floor(Date.now() / 1000)
    const cutoff = now - (16 * 3600)

    // Dedupe by headline + pick most recent
    const seen = new Set()
    const noticias = combined
      .filter(n => n.datetime >= cutoff && n.headline)
      .filter(n => {
        const key = (n.headline || '').toLowerCase().slice(0, 80)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 12)
      .map(n => ({
        // Convert UTC unix to BRT (UTC-3)
        hora: new Date((n.datetime - 3 * 3600) * 1000).toISOString().slice(11, 16),
        headline: n.headline,
        source: n.source || '—',
        summary: (n.summary || '').slice(0, 240),
        url: n.url,
        category: n.category || 'general',
      }))

    console.log(`← Overnight: ${noticias.length} headlines from last 16h`)
    res.json({ noticias, _source: 'live', _provider: 'finnhub' })
  } catch (err) {
    console.error('✗ Overnight error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── W.O.L.F AI PROXY ───
app.post('/wolf', async (req, res) => {
  const s = req.body?.snapshot
  if (!s) return res.status(400).json({ error: 'missing snapshot' })

  const enabled = process.env.WOLF_ENABLED === 'true'
  if (!enabled) {
    return res.json({ ...wolfStub(s), model: 'stub', _mode: 'stub' })
  }

  if (!API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY missing' })

  try {
    const { systemMsg, userMsg } = wolfBuildPrompts(s)
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1024,
        system: systemMsg,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })
    const j = await r.json()
    if (!r.ok) return res.status(502).json({ error: j.error?.message || 'claude error' })
    const text = j.content?.[0]?.text || ''
    const match = text.match(/\{[\s\S]+\}/)
    if (!match) return res.status(502).json({ error: 'claude returned non-JSON', raw: text })
    const parsed = JSON.parse(match[0])
    return res.json({ ...parsed, model: j.model || 'claude-sonnet-4-6' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

function wolfBuildPrompts(s) {
  const setupsStr = Object.entries(s.by_setup || {}).map(([k, v]) => `${k}: ${v.count}ops ${v.wins}W R$${v.result.toFixed(0)}`).join('\n')
  const emotionsStr = Object.entries(s.emotion_counts || {}).map(([e, n]) => `${e}(${n})`).join(', ')
  const systemMsg = `Você é o W.O.L.F AI, mentor de trading da Matilha. Retorne APENAS JSON { "summary": "...", "tips": ["..."], "actions": ["..."] }. Tom direto em pt-BR. Valoriza disciplina sobre resultado.`
  const userMsg = `Semana ${s.week_start}→${s.week_end}\nTrades:${s.total_trades}(${s.wins}W/${s.losses}L) WR:${s.win_rate}% Resultado:R$${s.total_result_brl} Plano:${s.followed_plan_rate}%\nSetups:\n${setupsStr || 'nenhum'}\nEmoções:${emotionsStr}\nFeedback monitor:${(s.mentor_feedbacks || []).map(f => `${f.date}[${(f.tags || []).join(',')}]:${f.text}`).join(';') || 'nenhum'}\n\nRetorne SÓ o JSON.`
  return { systemMsg, userMsg }
}

function wolfStub(s) {
  const pos = s.total_result_brl > 0
  const disciplined = s.followed_plan_rate >= 80
  const lowTrades = s.total_trades < 5
  let summary = ''
  if (lowTrades) summary = `Semana de pouca atividade — ${s.total_trades} trades. ${disciplined ? 'Boa filtragem.' : 'Revise bloqueios.'} ${pos ? 'Positivo.' : 'Negativo.'} WR ${s.win_rate}%, disciplina ${s.followed_plan_rate}%.`
  else if (pos && disciplined) summary = `Semana consistente: ${s.total_trades} trades, ${s.win_rate}% acerto, +R$${s.total_result_brl}. Disciplina ${s.followed_plan_rate}% — essa é a base.`
  else if (pos && !disciplined) summary = `+R$${s.total_result_brl} mas disciplina em ${s.followed_plan_rate}%. Atenção: sorte > processo. Revisa.`
  else if (!pos && disciplined) summary = `R$${s.total_result_brl} negativo mas disciplina ${s.followed_plan_rate}%. Sinal operacional OK, semana ruim do mercado.`
  else summary = `R$${s.total_result_brl} com ${s.followed_plan_rate}% disciplina. Foco agora: voltar ao plano, não recuperar.`

  const tips = []
  if (s.followed_plan_rate < 70) tips.push('Foco #1: seguir o plano. Relê a regra antes de cada clique.')
  if (s.days_operated > 4) tips.push('Operando 5+ dias/sem — testa 1 dia de pausa forçada.')
  const worstSetup = Object.entries(s.by_setup || {}).sort((a, b) => a[1].result - b[1].result)[0]
  if (worstSetup && worstSetup[1].result < 0) tips.push(`Setup ${worstSetup[0]}: R$${worstSetup[1].result.toFixed(0)}. Revisa ou para.`)
  if (s.emotion_counts?.Impulsivo > 2) tips.push('Impulsivo em várias entradas. Cronometra 30s antes de clicar.')
  if (s.emotion_counts?.Vingativo > 1) tips.push('Vingativo após loss. Regra: 1 loss = 5min pausa obrigatória.')
  while (tips.length < 3) tips.push('Registra todos os trades, mesmo os não executados.')

  const actions = []
  if (s.total_trades > 0) actions.push(`Revisita ${Math.min(3, s.total_trades)} trades da semana e nota 1 coisa a mudar.`)
  actions.push('Escreve 3 linhas sobre como quer começar segunda.')
  if (s.followed_plan_rate < 90) actions.push('Imprime o plano e cola na mesa.')
  if (!disciplined) actions.push('Semana 100% simulada se não voltar a >80% de disciplina até quarta.')
  while (actions.length < 3) actions.push('Marca sessão com monitor pra discutir próximos passos.')

  return { summary, tips: tips.slice(0, 5), actions: actions.slice(0, 5) }
}

// ─── MATILHA DIÁRIO PROXY ───
// Forwards all query params to the Lovable Supabase edge function
app.get('/matilha', async (req, res) => {
  if (!MATILHA_API_KEY) return res.status(500).json({ error: 'MATILHA_API_KEY not configured' })
  const UPSTREAM = 'https://buxrzygoiuodloekgwly.supabase.co/functions/v1/api-data'
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  try {
    const r = await fetch(UPSTREAM + qs, { headers: { 'x-api-key': MATILHA_API_KEY } })
    const text = await r.text()
    res.status(r.status)
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (e) {
    console.error('✗ Matilha proxy error:', e.message)
    res.status(502).json({ error: e.message })
  }
})

// ─── ORÁCULO (stub em dev) ───
app.post('/oraculo', async (req, res) => {
  const enabled = process.env.ORACULO_ENABLED === 'true'
  const messages = req.body?.messages || []
  const userMsg = messages[messages.length - 1]?.content || ''

  if (!enabled) {
    return res.json({ role: 'assistant', content: oraculoStub(userMsg), sources: [], _mode: 'stub' })
  }
  return res.status(501).json({ error: 'RAG pipeline em construção.' })
})

function oraculoStub(q) {
  q = (q || '').toLowerCase().trim()
  if (!q) return '⚠ Oráculo em modo stub — envie uma pergunta.'
  const fixtures = [
    { keys: ['fq', 'fibo quebra'], r: 'O **FQ** (Fibo Quebra) é uma das 4 estratégias base do Tradesystem. Opera em pullbacks na retração de Fibonacci quando há quebra de nível relevante.\n\n_(modo stub — RAG real virá quando ORACULO_ENABLED=true)_' },
    { keys: ['trm'], r: 'O **TRM** é uma das 4 estratégias — Tendência com Retração na Média.\n\n_(modo stub)_' },
    { keys: ['tc', 'tendencia consolidada'], r: 'O **TC** (Tendência Consolidada) é a estratégia de continuação de tendência após consolidação lateral.\n\n_(modo stub)_' },
    { keys: ['ta'], r: 'O **TA** (Tendência Acumulada) — estratégia que busca pontos de reversão combinando Fibo + médias + volume.\n\n_(modo stub)_' },
    { keys: ['vwap'], r: 'A **VWAP** é um dos indicadores centrais do Tradesystem — fair value intraday e viés direcional.\n\n_(modo stub)_' },
    { keys: ['gerenciamento', 'risco', 'stop'], r: 'O gerenciamento starter usa stops diários, mensais e por trade. "Melhor de 3" e "melhor de 5" protegem de revenge trading.\n\n_(modo stub)_' },
  ]
  for (const f of fixtures) if (f.keys.some(k => q.includes(k))) return f.r
  return `🟡 **Oráculo em modo stub** — pipeline RAG ainda não está ativa.\n\nSua pergunta: "_${q}_"\n\nExperimente: FQ, TRM, TC, TA, VWAP, gerenciamento.`
}

// ─── PANDA VIDEO PROXY ───
// GET /panda?resource=folders|videos|video[&...params]
app.get('/panda', async (req, res) => {
  if (!PANDA_API_KEY) return res.status(500).json({ error: 'PANDA_API_KEY not configured' })
  const BASE = 'https://api-v2.pandavideo.com.br'
  const resource = req.query.resource
  const qs = new URLSearchParams({ ...req.query })
  qs.delete('resource')
  const suffix = qs.toString() ? `?${qs.toString()}` : ''

  let path
  if (resource === 'folders') path = `/folders${suffix}`
  else if (resource === 'videos') path = `/videos${suffix}`
  else if (resource === 'video') {
    if (!req.query.id) return res.status(400).json({ error: 'missing id' })
    path = `/videos/${req.query.id}`
  } else return res.status(400).json({ error: 'invalid resource' })

  try {
    const r = await fetch(BASE + path, { headers: { Authorization: PANDA_API_KEY } })
    const text = await r.text()
    res.status(r.status)
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (e) {
    console.error('✗ Panda proxy error:', e.message)
    res.status(502).json({ error: e.message })
  }
})

// Zoom Meeting SDK signature generator
const crypto = require('crypto')
app.use(express.json())
app.post('/zoom-signature', (req, res) => {
  const { meetingNumber, role = 0 } = req.body || {}
  if (!meetingNumber) return res.status(400).json({ error: 'meetingNumber required' })
  const sdkKey = process.env.VITE_ZOOM_SDK_KEY
  const sdkSecret = process.env.ZOOM_SDK_SECRET
  if (!sdkKey || !sdkSecret) return res.status(500).json({ error: 'Zoom not configured' })

  const iat = Math.floor(Date.now() / 1000) - 30
  const exp = iat + 60 * 60 * 2
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = { appKey: sdkKey, sdkKey, mn: String(meetingNumber), role: Number(role), iat, exp, tokenExp: exp }
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const unsigned = `${b64(header)}.${b64(payload)}`
  const signature = crypto.createHmac('sha256', sdkSecret).update(unsigned).digest('base64url')
  res.json({ signature: `${unsigned}.${signature}`, sdkKey })
})

// ─── ZOOM JOIN (gated) ───
// POST /zoom/join       → valida gates, retorna { redirect_url }
// GET  /zoom/go?t=...   → 302 pro Zoom com uname preenchido
const { createClient } = require('@supabase/supabase-js')

const ZOOM_RATE_MS      = 5 * 60 * 1000
const ZOOM_WINDOW_MS    = 2 * 60 * 60 * 1000
const ZOOM_TOKEN_TTL_S  = 60

function _hmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url')
}
function _signJoinToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${_hmac(body, secret)}`
}
function _verifyJoinToken(token, secret) {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (_hmac(body, secret) !== sig) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (p.exp && p.exp < Math.floor(Date.now() / 1000)) return null
    return p
  } catch { return null }
}
function _deviceHash(req) {
  const ua = req.headers['user-agent'] || ''
  const lang = req.headers['accept-language'] || ''
  return crypto.createHash('sha256').update(ua + '|' + lang).digest('hex').slice(0, 32)
}
function _clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || null
}
function _zoomErrorPage(title, message) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Matilha — ${esc(title)}</title><style>body{margin:0;min-height:100vh;background:#0a0a0e;color:#e8e8ee;font:14px/1.5 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}.card{max-width:420px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:28px;text-align:center}h1{font-size:16px;margin:0 0 10px}p{color:#9a9aa4;margin:0 0 18px}a{color:#00d9ff;text-decoration:none;font-size:12px;padding:8px 14px;border:1px solid rgba(0,217,255,0.3);border-radius:6px;display:inline-block}</style></head><body><div class="card"><h1>${esc(title)}</h1><p>${esc(message)}</p><a href="/cursos/aulas">← voltar pro Matilha</a></div></body></html>`
}
function _sbAdmin() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

app.post('/zoom/join', async (req, res) => {
  const sb = _sbAdmin()
  if (!sb) return res.status(500).json({ error: 'server misconfigured' })
  const JOIN_SECRET = process.env.ZOOM_JOIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY

  const auth = req.headers.authorization || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!bearer) return res.status(401).json({ error: 'UNAUTHENTICATED' })

  const { data: userRes, error: authErr } = await sb.auth.getUser(bearer)
  if (authErr || !userRes?.user) return res.status(401).json({ error: 'UNAUTHENTICATED' })
  const userId = userRes.user.id

  const { data: profile } = await sb.from('profiles').select('name').eq('id', userId).single()
  const fullName = String(profile?.name || '').trim().replace(/\s+/g, ' ')
  if (fullName.split(' ').filter(Boolean).length < 2) {
    return res.status(400).json({ error: 'NAME_REQUIRED', message: 'Complete seu nome (nome + sobrenome) pra entrar no ao vivo — a presença é automática.' })
  }

  const { data: pendingRows } = await sb.rpc('user_has_pending_live_feedback', { p_user: userId })
  if (pendingRows?.length) {
    const p = pendingRows[0]
    return res.status(403).json({
      error: 'FEEDBACK_REQUIRED',
      message: 'Você precisa responder o feedback da aula anterior antes de entrar no próximo ao vivo.',
      pending: { live_session_id: p.live_session_id, session_title: p.session_title, session_ended_at: p.session_ended_at },
    })
  }

  const ip = _clientIp(req)
  const deviceHash = _deviceHash(req)
  const since = new Date(Date.now() - ZOOM_WINDOW_MS).toISOString()
  const { data: recent } = await sb
    .from('zoom_join_log')
    .select('ip, device_hash, joined_at')
    .eq('user_id', userId).gte('joined_at', since)
    .order('joined_at', { ascending: false }).limit(20)

  if (recent?.length) {
    const lastMs = Date.now() - new Date(recent[0].joined_at).getTime()
    if (lastMs < ZOOM_RATE_MS) {
      return res.status(429).json({ error: 'RATE_LIMIT', message: 'Aguarde antes de tentar entrar de novo.', retry_in_s: Math.ceil((ZOOM_RATE_MS - lastMs) / 1000) })
    }
    for (const row of recent) {
      const ipDiff = row.ip && ip && row.ip !== ip
      const devDiff = row.device_hash && row.device_hash !== deviceHash
      if (ipDiff && devDiff) {
        return res.status(403).json({ error: 'SESSION_CONFLICT', message: 'Detectamos login suspeito desta conta em outro dispositivo.' })
      }
    }
  }

  const { data: cfgRow } = await sb.from('app_settings').select('value').eq('key', 'zoom_live').single()
  const cfg = cfgRow?.value || {}
  if (!cfg.meeting_id) {
    return res.status(503).json({ error: 'NOT_CONFIGURED', message: 'Sala do ao vivo ainda não foi configurada. Avise o admin.' })
  }

  const liveSessionId = req.body?.live_session_id ? String(req.body.live_session_id) : null
  const payload = { uid: userId, ls: liveSessionId, exp: Math.floor(Date.now()/1000) + ZOOM_TOKEN_TTL_S }
  const signed = _signJoinToken(payload, JOIN_SECRET)

  return res.json({ ok: true, redirect_url: `/api/zoom/go?t=${signed}`, name: fullName })
})

app.get('/zoom/go', async (req, res) => {
  const sb = _sbAdmin()
  if (!sb) return res.status(500).send('server misconfigured')
  const JOIN_SECRET = process.env.ZOOM_JOIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY

  const t = req.query?.t || ''
  const payload = _verifyJoinToken(t, JOIN_SECRET)
  if (!payload) {
    res.status(401).setHeader('content-type', 'text/html; charset=utf-8')
    return res.send(_zoomErrorPage('Link expirado', 'Volte pro Matilha e clique em "Entrar no ao vivo" de novo.'))
  }

  const [{ data: cfgRow }, { data: prof }] = await Promise.all([
    sb.from('app_settings').select('value').eq('key', 'zoom_live').single(),
    sb.from('profiles').select('name').eq('id', payload.uid).single(),
  ])
  const cfg = cfgRow?.value || {}
  const fullName = String(prof?.name || '').trim().replace(/\s+/g, ' ')
  if (!cfg.meeting_id || fullName.split(' ').filter(Boolean).length < 2) {
    res.status(400).setHeader('content-type', 'text/html; charset=utf-8')
    return res.send(_zoomErrorPage('Não foi possível entrar', 'Configuração incompleta. Volte pro Matilha e tente novamente.'))
  }

  try {
    await sb.from('zoom_join_log').insert({
      user_id: payload.uid, live_session_id: payload.ls,
      ip: _clientIp(req), device_hash: _deviceHash(req),
    })
  } catch (_) { /* noop */ }

  const mid = String(cfg.meeting_id).replace(/\D/g, '')
  const pwd = cfg.passcode ? encodeURIComponent(cfg.passcode) : ''
  const uname = encodeURIComponent(fullName)

  const nativeUrl = `zoommtg://zoom.us/join?confno=${mid}${pwd ? `&pwd=${pwd}` : ''}&uname=${uname}`
  const webUrl = `https://zoom.us/wc/join/${mid}?${pwd ? `pwd=${pwd}&` : ''}uname=${uname}&prefer=1`

  res.status(200).setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Entrando no ao vivo...</title>
<style>
  body{margin:0;min-height:100vh;background:#0a0a0e;color:#e8e8ee;font:14px/1.5 system-ui,sans-serif;display:flex;align-items:center;justify-content:center}
  .box{text-align:center;max-width:380px;padding:32px}
  .spin{width:36px;height:36px;border:2px solid rgba(168,85,247,0.2);border-top-color:#a855f7;border-radius:50%;animation:s 0.8s linear infinite;margin:0 auto 18px}
  @keyframes s{to{transform:rotate(360deg)}}
  h1{font-size:16px;margin:0 0 8px;font-weight:600}
  p{color:#9a9aa4;margin:0;font-size:12.5px;line-height:1.5}
  .sub{margin-top:14px;color:#6a6a74;font-size:11px}
</style></head><body><div class="box">
  <div class="spin"></div>
  <h1>Entrando no ao vivo...</h1>
  <p>Se o Zoom não abrir automaticamente, <a href="${webUrl}" style="color:#00d9ff">clique aqui</a>.</p>
  <div class="sub">O link é pessoal — não compartilhe.</div>
</div>
<script>
  var t = setTimeout(function(){ window.location.replace(${JSON.stringify(webUrl)}); }, 1500);
  window.location.href = ${JSON.stringify(nativeUrl)};
  window.addEventListener('pagehide', function(){ clearTimeout(t); });
  window.addEventListener('blur', function(){ clearTimeout(t); });
</script>
</body></html>`)
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`🐕 Hound proxy running on http://localhost:${PORT}`)
})
