// Vercel serverless function — GET /api/overnight
// Returns curated market headlines from the last ~16 hours (overnight window)

export default async function handler(req, res) {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY
  if (!FINNHUB_KEY) return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' })

  try {
    const [generalRes, forexRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/news?category=forex&token=${FINNHUB_KEY}`),
    ])

    if (!generalRes.ok) {
      const text = await generalRes.text()
      return res.status(generalRes.status).json({ error: `Finnhub ${generalRes.status}: ${text}` })
    }

    const general = await generalRes.json()
    const forex = forexRes.ok ? await forexRes.json() : []
    const combined = [...general, ...forex]

    // Filter to last 16h (covers US close → BR open)
    const now = Math.floor(Date.now() / 1000)
    const cutoff = now - (16 * 3600)

    // Dedupe by headline prefix, keep most recent
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
        // UTC unix → BRT (UTC-3)
        hora: new Date((n.datetime - 3 * 3600) * 1000).toISOString().slice(11, 16),
        headline: n.headline,
        source: n.source || '—',
        summary: (n.summary || '').slice(0, 240),
        url: n.url,
        category: n.category || 'general',
      }))

    res.status(200).json({ noticias, _source: 'live', _provider: 'finnhub' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
