/**
 * Importa um aluno específico do Lovable para o nosso Supabase.
 *
 * Busca o aluno por email ou nome, cria conta no nosso auth, linka o
 * lovable_student_id, e preenche o profile com os dados do Lovable.
 *
 * Uso:
 *   node scripts/import-student.mjs "mateusg.schwartz@gmail.com" "senha"
 *   node scripts/import-student.mjs "Mateus Schwartz" "senha"
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const [query, password, emailOverride] = process.argv.slice(2)
if (!query || !password) {
  console.error('uso: node scripts/import-student.mjs "<uuid|email|nome>" "<senha>" [email-override]')
  process.exit(1)
}

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)

const LOVABLE_API = 'https://buxrzygoiuodloekgwly.supabase.co/functions/v1/api-data'

async function lovableGet(params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${LOVABLE_API}?${qs}`, {
    headers: { 'x-api-key': env.MATILHA_API_KEY },
  })
  if (!res.ok) throw new Error(`Lovable ${res.status}: ${await res.text()}`)
  return res.json()
}

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 1) busca aluno no Lovable
let match
if (isUuid) {
  console.log(`🔍 buscando UUID "${query}"…`)
  const s = await lovableGet({ resource: 'student', id: query })
  if (!s?.profile) {
    console.error(`❌ UUID "${query}" não encontrado.`)
    process.exit(1)
  }
  match = { ...s.profile, roles: s.roles || [], profile: s.profile, intake: s.intake }
} else {
  console.log(`🔍 buscando "${query}" no Lovable…`)
  const all = await lovableGet({ resource: 'all-users' })
  const users = all.users || all || []
  match = users.find(u => {
    const byEmail = u.email?.toLowerCase() === query.toLowerCase()
    const byName = u.name?.toLowerCase().includes(query.toLowerCase())
    return byEmail || byName
  })
  if (!match) {
    console.error(`❌ não achei "${query}" no Lovable.`)
    process.exit(1)
  }
}

console.log(`✓ encontrado: ${match.name} (${match.email})`)
console.log(`  id lovable: ${match.id}`)
console.log(`  roles: ${(match.roles || []).join(', ') || '—'}`)
console.log(`  status: ${match.status}`)

// 2) puxa full-export
console.log(`📦 puxando full-export…`)
const full = await lovableGet({ resource: 'full-export', student_id: match.id })

// 3) cria ou atualiza conta no nosso auth
const email = emailOverride || match.email
if (!email) {
  console.error('❌ email faltando. passe como 3º argumento:')
  console.error(`   node scripts/import-student.mjs "${query}" "${password}" "seu@email.com"`)
  process.exit(1)
}
console.log(`🔐 criando conta no nosso Supabase (${email})…`)
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: match.name },
})

let userId
if (cErr && /already|exists/i.test(cErr.message)) {
  const { data: list } = await admin.auth.admin.listUsers()
  userId = list.users.find(u => u.email === email)?.id
  console.log(`  ↳ já existia. atualizando senha…`)
  await admin.auth.admin.updateUserById(userId, { password })
} else if (cErr) {
  console.error('createUser error:', cErr)
  process.exit(1)
} else {
  userId = created.user.id
}

// 4) upsert do profile
console.log(`👤 gravando profile…`)
const prof = match.profile || match
const roles = Array.isArray(match.roles) && match.roles.length > 0
  ? match.roles
  : ['individual']

const { error: upErr } = await admin.from('profiles').upsert({
  id: userId,
  email,
  name: match.name,
  status: match.status || 'ativo',
  roles,
  whatsapp: prof.whatsapp || null,
  avatar_url: prof.avatar_url || null,
  current_badge: prof.current_badge || null,
  lovable_student_id: match.id,
}, { onConflict: 'id' })

if (upErr) {
  console.error('profile upsert:', upErr)
  process.exit(1)
}

// 5) stats do full-export
const summary = full.summary || {}
console.log(`\n✅ pronto!`)
console.log(`  email: ${email}`)
console.log(`  senha: ${password}`)
console.log(`  id local: ${userId}`)
console.log(`  lovable_student_id: ${match.id}`)
console.log(`\n📊 dados no Lovable:`)
console.log(`  trades: ${summary.total_trades || full.trades?.length || 0}`)
console.log(`  dias operados: ${summary.days_operated || 0}`)
console.log(`  resultado: R$ ${(summary.total_result_brl || 0).toLocaleString('pt-BR')}`)
console.log(`\n🚀 próximo: rode 'node scripts/sync-from-lovable.js --user=${userId}' pra puxar trades/ficha/plano.`)
