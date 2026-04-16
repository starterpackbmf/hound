// Vercel serverless function — GET /api/calendar
// Returns today's economic events filtered for Brazil & USA, times in BRT, impact normalized 1-3

export default async function handler(req, res) {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY
  if (!FINNHUB_KEY) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' })
  }

  try {
    const today = new Date()
    const iso = today.toISOString().split('T')[0]
    const url = `https://finnhub.io/api/v1/calendar/economic?from=${iso}&to=${iso}&token=${FINNHUB_KEY}`

    const response = await fetch(url)
    if (!response.ok) {
      const text = await response.text()
      return res.status(response.status).json({ error: `Finnhub ${response.status}: ${text}` })
    }

    const data = await response.json()
    const rawEvents = data.economicCalendar || []

    const countryMap = { US: 'EUA', BR: 'Brasil' }
    const eventos = rawEvents
      .filter(e => countryMap[e.country])
      .map(e => {
        // Finnhub time: "YYYY-MM-DD HH:MM:SS" (UTC) → convert to BRT (UTC-3)
        let hora = '--:--'
        if (e.time) {
          const [, timePart] = e.time.split(' ')
          if (timePart) {
            const [h, m] = timePart.split(':').map(Number)
            const brtH = (h - 3 + 24) % 24
            hora = `${String(brtH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
          }
        }
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

    res.status(200).json({ eventos, _source: 'live', _provider: 'finnhub', _date: iso })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
