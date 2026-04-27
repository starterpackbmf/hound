// Garante que os buckets de storage existem.
// Roda direto via service role — não precisa rodar migration manualmente.

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

const BUCKETS = [
  {
    id: 'trade-prints',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  {
    id: 'avatars',
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  {
    id: 'course-covers',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
]

const { data: existing, error: listErr } = await admin.storage.listBuckets()
if (listErr) { console.error('❌ list:', listErr); process.exit(1) }
const existingIds = new Set((existing || []).map(b => b.id))

for (const b of BUCKETS) {
  if (existingIds.has(b.id)) {
    console.log(`✓ ${b.id} já existe — atualizando config`)
    const { error } = await admin.storage.updateBucket(b.id, {
      public: b.public,
      fileSizeLimit: b.fileSizeLimit,
      allowedMimeTypes: b.allowedMimeTypes,
    })
    if (error) console.error(`  ⚠ update falhou:`, error.message)
  } else {
    console.log(`+ criando ${b.id}...`)
    const { error } = await admin.storage.createBucket(b.id, {
      public: b.public,
      fileSizeLimit: b.fileSizeLimit,
      allowedMimeTypes: b.allowedMimeTypes,
    })
    if (error) console.error(`  ❌ falhou:`, error.message)
    else console.log(`  ✓ criado`)
  }
}

console.log('')
console.log('🎯 Buckets prontos. Pode upar prints agora.')
console.log('')
console.log('⚠️  As policies RLS dos buckets ainda precisam da migration 0014 rodada')
console.log('    no SQL Editor pra escrita ser segura. Rode esse SQL:')
console.log('    https://github.com/starterpackbmf/hound/blob/main/supabase/migrations/0014_storage.sql')
