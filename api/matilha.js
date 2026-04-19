// Vercel serverless — GET /api/matilha?resource=...&...
// Proxy for Lovable diário API. Keeps x-api-key server-side.
//
// Forwards all query params as-is to:
//   https://buxrzygoiuodloekgwly.supabase.co/functions/v1/api-data?<params>

const UPSTREAM = 'https://buxrzygoiuodloekgwly.supabase.co/functions/v1/api-data'

export default async function handler(req, res) {
  const key = process.env.MATILHA_API_KEY
  if (!key) return res.status(500).json({ error: 'MATILHA_API_KEY not configured' })

  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const url = UPSTREAM + qs

  try {
    const upstream = await fetch(url, { headers: { 'x-api-key': key } })
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
