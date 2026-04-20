// Vercel serverless — POST /api/zoom-signature
// Gera JWT pro Meeting SDK usando Client ID + Client Secret.
// Body: { meetingNumber, role }  (role: 0=attendee, 1=host)

import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const { meetingNumber, role = 0 } = req.body || {}
  if (!meetingNumber) return res.status(400).json({ error: 'meetingNumber required' })

  const sdkKey = process.env.VITE_ZOOM_SDK_KEY
  const sdkSecret = process.env.ZOOM_SDK_SECRET
  if (!sdkKey || !sdkSecret) {
    return res.status(500).json({ error: 'Zoom credentials not configured' })
  }

  const iat = Math.floor(Date.now() / 1000) - 30
  const exp = iat + 60 * 60 * 2 // 2h
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    appKey: sdkKey,
    sdkKey,
    mn: String(meetingNumber),
    role: Number(role),
    iat,
    exp,
    tokenExp: exp,
  }

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const unsigned = `${b64(header)}.${b64(payload)}`
  const signature = crypto.createHmac('sha256', sdkSecret).update(unsigned).digest('base64url')
  const jwt = `${unsigned}.${signature}`

  res.status(200).json({ signature: jwt, sdkKey })
}
