// Vercel serverless function — GET /api/quotes
// Returns variation % for 9 assets: Finnhub for ADRs + Yahoo Finance for B3/VIX/Brent/Iron

async function finnhubQuote(symbol, key) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`
  try {
    const res = await fetch(url)
    const j = await res.json()
    if (j.error || !j.c || !j.pc) {
      return { ticker: symbol, variacao: 0, current: null, prev: null, error: j.error || 'no data' }
    }
    const variacao = ((j.c - j.pc) / j.pc) * 100
    return { ticker: symbol, variacao: parseFloat(variacao.toFixed(2)), current: j.c, prev: j.pc }
  } catch (e) {
    return { ticker: symbol, variacao: 0, current: null, prev: null, error: e.message }
  }
}

async function yahooQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
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
    return { ticker: symbol, variacao: 0, current: null, prev: null, error: e.message }
  }
}

export default async function handler(req, res) {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY
  if (!FINNHUB_KEY) return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' })

  try {
    const [VALE, PBR, ITUB, BDORY, BBD, B3, VIX, BRENT, IRON] = await Promise.all([
      finnhubQuote('VALE', FINNHUB_KEY),
      finnhubQuote('PBR', FINNHUB_KEY),
      finnhubQuote('ITUB', FINNHUB_KEY),
      finnhubQuote('BDORY', FINNHUB_KEY),
      finnhubQuote('BBD', FINNHUB_KEY),
      yahooQuote('B3SA3.SA'),
      yahooQuote('^VIX'),
      yahooQuote('BZ=F'),
      yahooQuote('RIO'), // Rio Tinto as Iron Ore proxy
    ])

    res.status(200).json({
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
      _providers: {
        finnhub: ['VALE', 'PBR', 'ITUB', 'BDORY', 'BBD'],
        yahoo: ['B3SA3.SA', '^VIX', 'BZ=F', 'RIO(proxy)'],
      },
      _raw: { VALE, PBR, ITUB, BDORY, BBD, B3, VIX, BRENT, IRON },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
