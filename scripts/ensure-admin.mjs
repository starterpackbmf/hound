// Garante conta admin (Mateus). Se o email já existe, reseta a senha.
// Se não existe, cria. Em qualquer caso, garante profile com role 'admin'.
//
// Uso: node scripts/ensure-admin.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Credenciais vêm de env vars (NUNCA hardcoded em repo público).
// Use: EMAIL=... PASSWORD=... node scripts/ensure-admin.mjs
const EMAIL    = process.env.ADMIN_EMAIL    || env.ADMIN_EMAIL    || ''
const PASSWORD = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || ''
const NAME     = process.env.ADMIN_NAME     || env.ADMIN_NAME     || 'Admin'
if (!EMAIL || !PASSWORD) {
  console.error('❌ Defina ADMIN_EMAIL e ADMIN_PASSWORD (env var ou no .env)')
  process.exit(1)
}

// 1) Procura usuário por email (paginado)
async function findUserByEmail(email) {
  let page = 1
  while (page < 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const u = data.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
    if (u) return u
    if (data.users.length < 1000) break
    page++
  }
  return null
}

let user = await findUserByEmail(EMAIL)

if (user) {
  console.log(`→ usuário já existe (id=${user.id}), resetando senha...`)
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
} else {
  console.log('→ criando novo usuário...')
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME },
  })
  if (error) throw error
  user = data.user
}

// 2) Garante profile com role admin
const { error: upErr } = await admin.from('profiles').upsert({
  id: user.id,
  email: EMAIL,
  name: NAME,
  status: 'ativo',
  roles: ['admin'],
}, { onConflict: 'id' })
if (upErr) throw upErr

console.log('')
console.log('✅ Admin pronto:')
console.log(JSON.stringify({ email: EMAIL, id: user.id, roles: ['admin'] }, null, 2))
console.log('(Senha não exibida por segurança.)')
