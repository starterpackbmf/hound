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
if (!API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set in environment!')
  process.exit(1)
}
console.log('✓ Anthropic key loaded:', API_KEY.slice(0, 10) + '...')
console.log(FINNHUB_KEY ? '✓ Finnhub key loaded' : '⚠ FINNHUB_API_KEY not set (calendar will fallback)')

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

const PORT = 3001
app.listen(PORT, () => {
  console.log(`🐕 Hound proxy running on http://localhost:${PORT}`)
})
