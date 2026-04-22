// Vercel serverless — GET /api/zoom/go?t=<token>
// Valida o token assinado pelo /join, grava zoom_join_log e responde 302
// pro Zoom com uname=<nome+sobrenome> preenchido. Zoom URL nunca passa pelo JS.

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function hmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url')
}
function verifyToken(token, secret) {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = hmac(body, secret)
  if (expected !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
function deviceHashFrom(req) {
  const ua = req.headers['user-agent'] || ''
  const lang = req.headers['accept-language'] || ''
  return crypto.createHash('sha256').update(ua + '|' + lang).digest('hex').slice(0, 32)
}
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || null
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}
function errorPage(title, message) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Matilha — ${escapeHtml(title)}</title>
<style>
  body{margin:0;min-height:100vh;background:#0a0a0e;color:#e8e8ee;font:14px/1.5 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:420px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:28px;text-align:center}
  h1{font-size:16px;margin:0 0 10px;font-weight:600}
  p{color:#9a9aa4;margin:0 0 18px}
  a{color:#00d9ff;text-decoration:none;font-size:12px;padding:8px 14px;border:1px solid rgba(0,217,255,0.3);border-radius:6px;display:inline-block}
</style></head><body><div class="card">
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
  <a href="/cursos/aulas">← voltar pro Matilha</a>
</div></body></html>`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('method not allowed')

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const JOIN_SECRET  = process.env.ZOOM_JOIN_SECRET || SERVICE_KEY

  const t = (req.query?.t || (req.url.split('?t=')[1] || '').split('&')[0]) || ''
  const payload = verifyToken(t, JOIN_SECRET)
  if (!payload) {
    res.status(401).setHeader('content-type', 'text/html; charset=utf-8')
    return res.send(errorPage('Link expirado', 'Volte pro Matilha e clique em "Entrar no ao vivo" de novo.'))
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Re-lê config e nome (defesa em profundidade — mesmo com token válido,
  // se a config sumiu ou o nome virou inválido, trava aqui)
  const [{ data: cfgRow }, { data: prof }] = await Promise.all([
    sb.from('app_settings').select('value').eq('key', 'zoom_live').single(),
    sb.from('profiles').select('name').eq('id', payload.uid).single(),
  ])
  const cfg = cfgRow?.value || {}
  const fullName = String(prof?.name || '').trim().replace(/\s+/g, ' ')
  if (!cfg.meeting_id || fullName.split(' ').filter(Boolean).length < 2) {
    res.status(400).setHeader('content-type', 'text/html; charset=utf-8')
    return res.send(errorPage('Não foi possível entrar', 'Configuração incompleta. Volte pro Matilha e tente novamente.'))
  }

  // Grava join_log (ignora erro — não bloqueia a entrada)
  try {
    await sb.from('zoom_join_log').insert({
      user_id: payload.uid,
      live_session_id: payload.ls,
      ip: clientIp(req),
      device_hash: deviceHashFrom(req),
    })
  } catch (e) { /* noop */ }

  // Monta URL do Zoom
  const base = cfg.base_url || 'https://zoom.us/j/'
  const mid = String(cfg.meeting_id).replace(/\D/g, '')
  const params = new URLSearchParams()
  if (cfg.passcode) params.set('pwd', cfg.passcode)
  params.set('uname', fullName)
  const zoomUrl = `${base}${mid}?${params.toString()}`

  res.status(302).setHeader('Location', zoomUrl)
  res.setHeader('Cache-Control', 'no-store')
  return res.end()
}
