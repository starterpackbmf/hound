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

const email = 'free@matilha.app'
const password = 'matilha-free-2026'

const { data: created, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: 'Usuário Free' },
})

if (error && !String(error.message).includes('already')) {
  console.error('createUser error:', error)
  process.exit(1)
}

const userId = created?.user?.id || (await admin.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id

// Garantir profile como free: status != 'ativo' e roles sem admin/monitor/imortal
const { error: upErr } = await admin.from('profiles').upsert({
  id: userId,
  email,
  name: 'Usuário Free',
  status: 'pendente',
  roles: ['individual'],
}, { onConflict: 'id' })

if (upErr) console.error('profile upsert:', upErr)

console.log(JSON.stringify({ email, password, id: userId, status: 'pendente' }, null, 2))
