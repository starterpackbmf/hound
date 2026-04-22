// Vercel serverless — POST /api/zoom/join
// Valida os 3 gates (nome / feedback pendente / ip+device + rate),
// assina token de 60s e devolve redirect_url pro endpoint /go.
//
// Body: { live_session_id?: uuid }
// Header: Authorization: Bearer <supabase access token>

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const RATE_LIMIT_MS      = 5 * 60 * 1000   // 5min
const SESSION_WINDOW_MS  = 2 * 60 * 60 * 1000  // 2h
const TOKEN_TTL_S        = 60

function hmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url')
}
function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${hmac(body, secret)}`
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const SUPABASE_URL   = process.env.VITE_SUPABASE_URL
  const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY
  const JOIN_SECRET    = process.env.ZOOM_JOIN_SECRET || SERVICE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'server misconfigured' })
  }

  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'UNAUTHENTICATED' })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Auth
  const { data: userRes, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !userRes?.user) return res.status(401).json({ error: 'UNAUTHENTICATED' })
  const userId = userRes.user.id

  // 2) Gate: nome + sobrenome (2+ palavras)
  const { data: profile } = await sb
    .from('profiles').select('name').eq('id', userId).single()
  const fullName = String(profile?.name || '').trim().replace(/\s+/g, ' ')
  const nameParts = fullName.split(' ').filter(Boolean)
  if (nameParts.length < 2) {
    return res.status(400).json({
      error: 'NAME_REQUIRED',
      message: 'Complete seu nome (nome + sobrenome) pra entrar no ao vivo — a presença é automática.',
    })
  }

  // 3) Gate: feedback pendente?
  const { data: pendingRows } = await sb
    .rpc('user_has_pending_live_feedback', { p_user: userId })
  if (pendingRows?.length) {
    const p = pendingRows[0]
    return res.status(403).json({
      error: 'FEEDBACK_REQUIRED',
      message: 'Você precisa responder o feedback da aula anterior antes de entrar no próximo ao vivo.',
      pending: {
        live_session_id: p.live_session_id,
        session_title: p.session_title,
        session_ended_at: p.session_ended_at,
      },
    })
  }

  // 4) Gate: IP+device + rate limit (últimas 2h)
  const ip = clientIp(req)
  const deviceHash = deviceHashFrom(req)
  const since = new Date(Date.now() - SESSION_WINDOW_MS).toISOString()

  const { data: recent } = await sb
    .from('zoom_join_log')
    .select('ip, device_hash, joined_at')
    .eq('user_id', userId)
    .gte('joined_at', since)
    .order('joined_at', { ascending: false })
    .limit(20)

  if (recent?.length) {
    const lastMs = Date.now() - new Date(recent[0].joined_at).getTime()
    if (lastMs < RATE_LIMIT_MS) {
      return res.status(429).json({
        error: 'RATE_LIMIT',
        message: 'Aguarde antes de tentar entrar de novo.',
        retry_in_s: Math.ceil((RATE_LIMIT_MS - lastMs) / 1000),
      })
    }
    // Compartilhamento: IP **e** device diferentes na janela
    for (const row of recent) {
      const ipDiff = row.ip && ip && row.ip !== ip
      const devDiff = row.device_hash && row.device_hash !== deviceHash
      if (ipDiff && devDiff) {
        return res.status(403).json({
          error: 'SESSION_CONFLICT',
          message: 'Detectamos login suspeito desta conta em outro dispositivo. Se não foi você, contacte o suporte.',
        })
      }
    }
  }

  // 5) Config do Zoom deve estar preenchida
  const { data: cfgRow } = await sb
    .from('app_settings').select('value').eq('key', 'zoom_live').single()
  const cfg = cfgRow?.value || {}
  if (!cfg.meeting_id) {
    return res.status(503).json({
      error: 'NOT_CONFIGURED',
      message: 'Sala do ao vivo ainda não foi configurada. Avise o admin.',
    })
  }

  // 6) Assina token (payload mínimo — config é re-lida no /go)
  const liveSessionId = (req.body?.live_session_id && String(req.body.live_session_id)) || null
  const payload = {
    uid: userId,
    ls: liveSessionId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_S,
  }
  const signed = signToken(payload, JOIN_SECRET)

  return res.status(200).json({
    ok: true,
    redirect_url: `/api/zoom/go?t=${signed}`,
    name: fullName,
  })
}
