// Popula public.pre_approved_emails com os emails dos alunos que você quer liberar
// pra cadastro automático (sem passar pela fila de aprovação).
//
// Uso:
//   1) Edita o array ALUNOS abaixo (ou passa via stdin CSV — ver no final)
//   2) node scripts/seed-pre-approved.mjs
//
// Formato de cada entrada:
//   { email, name?, whatsapp?, lovable_student_id?, roles? }
//
// Quando o aluno rodar /signup:
//   - Se email tá aqui → profile criado com status='ativo' + herda name/whatsapp/lovable_student_id
//   - Senão           → profile criado com status='pendente' (cai em /mentor/solicitacoes)

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

// ============================================================
// COLA AQUI A LISTA — pode ser gerada do seu CRM/planilha
// ============================================================
const ALUNOS = [
  // exemplos (apagar):
  // { email: 'aluno1@exemplo.com', name: 'Fulano Silva', whatsapp: '11999990000' },
  // { email: 'aluno2@exemplo.com', name: 'Ciclano Souza', lovable_student_id: 'uuid-do-lovable' },
]

// ============================================================
// OU: Importa de ./alunos-import.json na raiz (array de objetos)
// ============================================================
let fromFile = []
try {
  fromFile = JSON.parse(readFileSync('./alunos-import.json', 'utf8'))
  console.log(`→ carregados ${fromFile.length} alunos de alunos-import.json`)
} catch { /* arquivo opcional */ }

const all = [...ALUNOS, ...fromFile]
if (!all.length) {
  console.error('❌ Nenhum aluno pra importar. Edite o array ALUNOS ou crie alunos-import.json.')
  process.exit(1)
}

console.log(`→ Inserindo ${all.length} emails em pre_approved_emails...`)

const payload = all.map(a => ({
  email: String(a.email).trim().toLowerCase(),
  name_hint: a.name || null,
  whatsapp_hint: a.whatsapp || null,
  lovable_student_id: a.lovable_student_id || null,
  roles: a.roles || ['individual'],
  notes: a.notes || null,
}))

const { data, error } = await admin
  .from('pre_approved_emails')
  .upsert(payload, { onConflict: 'email' })
  .select()

if (error) {
  console.error('❌ Erro:', error.message)
  process.exit(1)
}

console.log(`✅ ${data.length} registros upsertados.`)
console.log('')
console.log('Amostra:')
data.slice(0, 5).forEach(r => {
  console.log(`  • ${r.email} ${r.name_hint ? `(${r.name_hint})` : ''}`)
})

console.log('')
console.log('Agora esses alunos podem ir em /signup, cadastrar, e entrar direto como ativo.')
