// Vercel serverless — GET /api/panda?resource=...&...
// Proxy for Panda Video API v2. Keeps PANDA_API_KEY server-side.
//
// Supported resources:
//   ?resource=folders[&parent_folder_id=UUID]
//   ?resource=videos&folder_id=UUID[&limit=50&page=1]
//   ?resource=video&id=UUID

const BASE = 'https://api-v2.pandavideo.com.br'

async function forward(path, key) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: key } })
  const text = await r.text()
  return { status: r.status, body: text, contentType: r.headers.get('content-type') || 'application/json' }
}

export default async function handler(req, res) {
  const key = process.env.PANDA_API_KEY
  if (!key) return res.status(500).json({ error: 'PANDA_API_KEY not configured' })

  const u = new URL(req.url, 'http://x')
  const resource = u.searchParams.get('resource')
  u.searchParams.delete('resource')
  const qs = u.searchParams.toString()
  const suffix = qs ? `?${qs}` : ''

  let path
  switch (resource) {
    case 'folders':
      path = `/folders${suffix}`
      break
    case 'videos':
      path = `/videos${suffix}`
      break
    case 'video': {
      const id = u.searchParams.get('id')
      if (!id) return res.status(400).json({ error: 'missing id' })
      path = `/videos/${id}`
      break
    }
    default:
      return res.status(400).json({ error: 'invalid resource (use folders | videos | video)' })
  }

  try {
    const { status, body, contentType } = await forward(path, key)
    res.status(status)
    res.setHeader('content-type', contentType)
    res.send(body)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
