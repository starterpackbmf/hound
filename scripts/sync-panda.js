/**
 * Sync Panda Video folder tree → Supabase courses + modules.
 *
 * Usage:
 *   node scripts/sync-panda.js            # applies
 *   node scripts/sync-panda.js --dry-run  # just prints what would happen
 *
 * Reads from .env:
 *   PANDA_API_KEY
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: upserts courses by slug, modules by (course_id, panda_folder_id).
 * Safe to re-run whenever you add/rename/remove folders on Panda.
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const DRY_RUN = process.argv.includes('--dry-run')

// --- config: which Panda folders become courses ---
const IMPORTS = [
  {
    slug: 'tradesystem-starter',
    title: 'Tradesystem Starter',
    description: 'O curso carro-chefe da mentoria — leitura de mercado, estratégias, gerenciamento.',
    panda_root_folder_name: 'Mentoria - NRJ',
    // false = os filhos diretos da pasta-raiz viram módulos de primeiro nível
    // (caso contrário tudo fica dentro de um módulo único com o nome da pasta-raiz)
    map_root_to_module: false,
    root_videos_module_title: 'Geral', // usado se a pasta-raiz tiver vídeos próprios
  },
  {
    slug: 'comunidade-starter',
    title: 'Comunidade Starter',
    description: 'Aulas e conteúdos da comunidade.',
    panda_root_folder_name: 'Comunidade Starter',
    map_root_to_module: true,
  },
]

// --- helpers ---
async function fetchAllPandaFolders(key) {
  const r = await fetch('https://api-v2.pandavideo.com.br/folders', {
    headers: { Authorization: key },
  })
  if (!r.ok) throw new Error(`Panda folders ${r.status}: ${await r.text()}`)
  const j = await r.json()
  return j.folders || []
}

async function fetchPandaVideosCount(key, folderId) {
  const r = await fetch(`https://api-v2.pandavideo.com.br/videos?folder_id=${folderId}`, {
    headers: { Authorization: key },
  })
  if (!r.ok) return 0
  const j = await r.json()
  return (j.videos || []).length
}

function collectSubtree(allFolders, rootId) {
  const byParent = {}
  allFolders.forEach(f => {
    const p = f.parent_folder_id || 'ROOT'
    byParent[p] = byParent[p] || []
    byParent[p].push(f)
  })
  function walk(id) {
    const kids = byParent[id] || []
    return kids.flatMap(k => [k, ...walk(k.id)])
  }
  return walk(rootId)
}

async function upsertCourse(sb, { slug, title, description, order_index }) {
  if (DRY_RUN) return { id: `dry-${slug}`, slug, title }
  const { data, error } = await sb
    .from('courses')
    .upsert({ slug, title, description, order_index: order_index ?? 0 }, { onConflict: 'slug' })
    .select()
    .single()
  if (error) throw error
  return data
}

async function upsertModule(sb, { course_id, parent_id, title, panda_folder_id, order_index }) {
  if (DRY_RUN) return { id: `dry-${panda_folder_id}`, title }
  const { data, error } = await sb
    .from('modules')
    .upsert(
      { course_id, parent_id, title, panda_folder_id, order_index: order_index ?? 0 },
      { onConflict: 'course_id,panda_folder_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// --- main ---
async function main() {
  const PANDA_KEY = process.env.PANDA_API_KEY
  const SB_URL = process.env.VITE_SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!PANDA_KEY) throw new Error('PANDA_API_KEY missing in .env')
  if (!SB_URL) throw new Error('VITE_SUPABASE_URL missing in .env')
  if (!SB_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing in .env')

  console.log(DRY_RUN ? '🔍 DRY RUN — nada será gravado\n' : '⚡ SYNC — aplicando alterações\n')

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })

  console.log('→ buscando pastas no Panda...')
  const allFolders = await fetchAllPandaFolders(PANDA_KEY)
  console.log(`✓ ${allFolders.length} pastas encontradas\n`)

  for (const [courseIdx, cfg] of IMPORTS.entries()) {
    const root = allFolders.find(f => f.name.trim() === cfg.panda_root_folder_name.trim())
    if (!root) {
      console.log(`⚠ pasta-raiz "${cfg.panda_root_folder_name}" não encontrada no Panda. pulando.\n`)
      continue
    }

    console.log(`━━━ ${cfg.title} (${cfg.slug}) ━━━`)
    console.log(`  pasta-raiz no Panda: "${root.name}" (${root.id})`)

    const course = await upsertCourse(sb, {
      slug: cfg.slug,
      title: cfg.title,
      description: cfg.description,
      order_index: courseIdx * 10,
    })
    console.log(`  ✓ curso ${DRY_RUN ? 'seria criado' : 'criado/atualizado'}: ${course.id}`)

    // Collect subtree. If map_root_to_module = false, skip the root itself.
    const subtree = collectSubtree(allFolders, root.id)
    const foldersToImport = cfg.map_root_to_module ? [root, ...subtree] : subtree

    // Process top-down: ensure parent modules exist before children
    // Sort by depth (shallower first), using parent chain
    foldersToImport.sort((a, b) => {
      const da = depthOf(allFolders, a, root.id, cfg.map_root_to_module)
      const db = depthOf(allFolders, b, root.id, cfg.map_root_to_module)
      return da - db
    })

    const moduleIdByPanda = {}

    for (const folder of foldersToImport) {
      let parent_id = null
      if (cfg.map_root_to_module && folder.id === root.id) {
        parent_id = null
      } else if (folder.parent_folder_id && folder.parent_folder_id !== root.id) {
        parent_id = moduleIdByPanda[folder.parent_folder_id] || null
      } else if (folder.parent_folder_id === root.id && cfg.map_root_to_module) {
        parent_id = moduleIdByPanda[root.id] || null
      }

      const mod = await upsertModule(sb, {
        course_id: course.id,
        parent_id,
        title: folder.name,
        panda_folder_id: folder.id,
        order_index: 0,
      })
      moduleIdByPanda[folder.id] = mod.id
      console.log(`  ${'  '.repeat(depthOf(allFolders, folder, root.id, cfg.map_root_to_module))}📁 ${folder.name} (${folder.videos_count || 0} vídeos) ${DRY_RUN ? '[dry]' : '→ ' + mod.id.slice(0, 8)}`)
    }

    // If there are direct videos at the root and we're NOT mapping root, create a "Geral" module for them
    if (!cfg.map_root_to_module && Number(root.videos_count || 0) > 0) {
      const mod = await upsertModule(sb, {
        course_id: course.id,
        parent_id: null,
        title: cfg.root_videos_module_title || 'Geral',
        panda_folder_id: root.id,
        order_index: -1, // aparece primeiro
      })
      console.log(`  📁 ${cfg.root_videos_module_title || 'Geral'} (${root.videos_count} vídeos, raiz) ${DRY_RUN ? '[dry]' : '→ ' + mod.id.slice(0, 8)}`)
    }

    console.log('')
  }

  console.log(DRY_RUN ? '🔍 dry-run completo.' : '✓ sync completo.')
}

function depthOf(allFolders, folder, rootId, mapRoot) {
  let depth = 0
  let cur = folder
  while (cur && cur.id !== rootId) {
    cur = allFolders.find(f => f.id === cur.parent_folder_id)
    if (cur) depth++
    else break
  }
  return mapRoot ? depth : Math.max(0, depth - 1)
}

main().catch(e => {
  console.error('\n✗ erro:', e.message)
  process.exit(1)
})
