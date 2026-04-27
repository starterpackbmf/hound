// GET /api/oraculo/quota — read-only: quanto resta hoje?
// Authorization: Bearer <supabase token>

const { createClient } = require('@supabase/supabase-js')

const QUOTA_LIMIT = parseInt(process.env.ORACULO_DAILY_LIMIT || '20', 10)

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return res.status(500).json({ error: 'server misconfigured' })

  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'UNAUTHENTICATED' })

  try {
    const sb = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data, error } = await sb.rpc('oraculo_quota_status', { p_limit: QUOTA_LIMIT })
    if (error) throw error
    res.status(200).json(data || { used: 0, limit: QUOTA_LIMIT, remaining: QUOTA_LIMIT })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
