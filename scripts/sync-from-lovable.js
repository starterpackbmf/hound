/**
 * Sync dados do Lovable → nosso Supabase.
 *
 * Usa a API read-only do Lovable (x-api-key) pra puxar:
 * - profiles (status, badge, whatsapp, name, avatar_url)
 * - trading_accounts → trade_accounts
 * - trades (com mapeamento de colunas)
 * - day_summaries
 * - student_intake → ficha_acompanhamento
 * - execution_plans
 *
 * Pré-requisito: profiles locais com `lovable_student_id` preenchido pra
 * fazer o match. Sem isso, o script imprime lista de candidatos.
 *
 * Uso:
 *   node scripts/sync-from-lovable.js              # aplica
 *   node scripts/sync-from-lovable.js --dry-run    # só imprime
 *   node scripts/sync-from-lovable.js --user=UUID  # um user específico
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const DRY_RUN = process.argv.includes('--dry-run')
const USER_FILTER = process.argv.find(a => a.startsWith('--user='))?.split('=')[1] || null

const LOVABLE_API = 'https://buxrzygoiuodloekgwly.supabase.co/functions/v1/api-data'

async function lovableGet(params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${LOVABLE_API}?${qs}`, {
    headers: { 'x-api-key': process.env.MATILHA_API_KEY },
  })
  if (!res.ok) throw new Error(`Lovable ${res.status}: ${await res.text()}`)
  return res.json()
}

function mapEntryQuality(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v >= 1 && v <= 5 ? v : null
  const s = String(v).toUpperCase().trim()
  const map = {
    'EXCELENTE': 5, 'OTIMA': 5, 'ÓTIMA': 5, 'OTIMO': 5, 'ÓTIMO': 5,
    'BOM': 4, 'BOA': 4, 'BOM+': 4,
    'OK': 3, 'NEUTRO': 3, 'NEUTRA': 3, 'MEDIO': 3, 'MÉDIO': 3, 'REGULAR': 3,
    'RUIM': 2, 'RUIM+': 2, 'FRACA': 2, 'FRACO': 2,
    'PESSIMO': 1, 'PÉSSIMO': 1, 'PESSIMA': 1, 'PÉSSIMA': 1, 'TERRIVEL': 1, 'TERRÍVEL': 1,
  }
  return map[s] ?? null
}

async function main() {
  const SB_URL = process.env.VITE_SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const LK = process.env.MATILHA_API_KEY
  if (!SB_URL || !SB_KEY) throw new Error('.env missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  if (!LK) throw new Error('.env missing MATILHA_API_KEY')

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })

  console.log(DRY_RUN ? '🔍 DRY RUN\n' : '⚡ SYNC aplicando\n')

  // 1. Buscar profiles locais com lovable_student_id preenchido
  let { data: locals } = await sb
    .from('profiles')
    .select('id, email, lovable_student_id, name')
    .not('lovable_student_id', 'is', null)

  if (USER_FILTER) locals = locals.filter(l => l.id === USER_FILTER)

  if (!locals || locals.length === 0) {
    console.log('⚠ nenhum user tem lovable_student_id preenchido.')
    console.log('pra linkar, rode no Supabase SQL Editor:')
    console.log('  update profiles set lovable_student_id = <uuid-do-lovable>')
    console.log('  where email = <email-do-user>;')
    console.log('')

    // Lista candidatos do Lovable pra facilitar
    console.log('alguns candidatos (alunos ativos do Lovable):')
    const { students } = await lovableGet({ resource: 'students' })
    students.filter(s => s.status === 'ativo').slice(0, 10).forEach(s => {
      console.log(`  ${s.id}  ${s.name.trim()}`)
    })
    return
  }

  console.log(`→ ${locals.length} user(s) mapeados\n`)

  for (const local of locals) {
    console.log(`━━━ ${local.name || local.email} (${local.id.slice(0, 8)}) ━━━`)
    console.log(`  Lovable UID: ${local.lovable_student_id}`)

    try {
      // Full export já traz tudo
      const bundle = await lovableGet({ resource: 'full-export', student_id: local.lovable_student_id })

      // 2. profile (nome, badge, whatsapp, avatar) — merge com o que já temos
      if (bundle.profile) {
        const p = bundle.profile
        const patch = {
          name: p.name?.trim() || local.name,
          current_badge: mapBadge(p.current_badge),
          avatar_url: p.avatar_url,
          whatsapp: p.whatsapp,
          status: p.status === 'ativo' ? 'ativo' : p.status === 'bloqueado' ? 'bloqueado' : 'pendente',
        }
        console.log(`  profile: ${patch.name} · ${patch.current_badge || 'sem badge'} · ${patch.status}`)
        if (!DRY_RUN) await sb.from('profiles').update(patch).eq('id', local.id)
      }

      // 3. trading_accounts → trade_accounts
      if (bundle.trading_accounts?.length) {
        for (const acc of bundle.trading_accounts) {
          const row = {
            user_id: local.id,
            name: acc.name,
            is_default: acc.is_primary,
            order_index: acc.sort_order ?? 0,
          }
          if (!DRY_RUN) await sb.from('trade_accounts').upsert(row).select()
        }
        console.log(`  trade_accounts: ${bundle.trading_accounts.length}`)
      }

      // 4. trades (mapeamento de colunas)
      if (bundle.trades?.length) {
        // Mapeia account_id do Lovable pro account_id nosso pelo nome
        const { data: ourAccs } = await sb.from('trade_accounts').select('id, name').eq('user_id', local.id)
        const accByName = {}
        ;(ourAccs || []).forEach(a => { accByName[a.name] = a.id })
        const accByLovableId = {}
        ;(bundle.trading_accounts || []).forEach(la => { accByLovableId[la.id] = accByName[la.name] || null })

        const rows = bundle.trades.map(t => ({
          user_id: local.id,
          account_id: accByLovableId[t.account_id] || null,
          date: t.trade_date,
          horario_entrada: t.entry_time,
          horario_saida: t.exit_time,
          ativo: t.asset,
          setup: (t.operational || 'TA').toUpperCase(),
          direction: t.direction === 'compra' || t.direction === 'venda' ? t.direction : (t.direction === 'buy' ? 'compra' : 'venda'),
          contratos_iniciais: t.initial_contracts ?? 1,
          men_pts: t.planned_men,         // usar planned_* como os valores reais por enquanto
          mep_pts: t.planned_mep,
          planned_men_pts: t.planned_men,
          planned_mep_pts: t.planned_mep,
          partials: t.partials || [],
          encerramento_pts: t.final_points,
          total_points: t.total_points,
          media_ponderada: t.total_points && t.initial_contracts ? t.total_points / t.initial_contracts : 0,
          resultado_brl: t.financial_result,
          emotions: t.feelings || [],
          followed_plan: t.followed_plan,
          leitura_tecnica: t.reading,
          print_url: t.screenshot_url,
          selected_rules: t.selected_rules || [],
          selected_filters: t.selected_filters || [],
          entry_quality: mapEntryQuality(t.entry_quality),
          escora_tag: t.escora_tag,
        }))

        if (!DRY_RUN) {
          // upsert em batches de 100
          for (let i = 0; i < rows.length; i += 100) {
            const batch = rows.slice(i, i + 100)
            const { error } = await sb.from('trades').upsert(batch, { onConflict: 'id' })
            if (error) console.error(`  ✗ trades batch ${i}: ${error.message}`)
          }
        }
        console.log(`  trades: ${rows.length}`)
      }

      // 5. day_summaries
      if (bundle.day_summaries?.length) {
        const rows = bundle.day_summaries.map(d => ({
          user_id: local.id,
          date: d.date,
          did_not_trade: d.did_not_trade,
          performance: d.performance,
          learning: d.learning,
          checklist: d.checklist || [],
          is_finalized: d.is_finalized,
        }))
        if (!DRY_RUN) await sb.from('day_summaries').upsert(rows, { onConflict: 'user_id,date,account_id' })
        console.log(`  day_summaries: ${rows.length}`)
      }

      // 6. student_intake → ficha_acompanhamento
      if (bundle.intake) {
        const i = bundle.intake
        const row = {
          user_id: local.id,
          nome_completo: i.full_name,
          prefere_ser_chamado: i.nickname,
          whatsapp: i.whatsapp,
          cidade: (i.city_state || '').split('/')[0]?.trim() || null,
          estado: (i.city_state || '').split('/')[1]?.trim() || null,
          idade: i.age,
          tempo_mercado: mapTempoMercado(i.market_time),
          ativo_principal: i.primary_asset,
          media_ops_dia: mapOpsDia(i.daily_operations_avg),
          mentoria_previa: i.previous_mentoring,
          dificuldades: i.main_difficulties || [],
          objetivo: i.trading_goals,
          mensagem_monitor: i.additional_notes,
          concluida: i.is_complete,
        }
        if (!DRY_RUN) await sb.from('ficha_acompanhamento').upsert(row, { onConflict: 'user_id' })
        console.log(`  intake: ${row.nome_completo}`)
      }

      // 7. execution_plans ativos
      if (bundle.execution_plans?.length) {
        const active = bundle.execution_plans.find(p => p.is_active) || bundle.execution_plans[0]
        if (active) {
          const row = {
            user_id: local.id,
            active: true,
            setups_permitidos: (active.allowed_setups || []).map(s => s.toUpperCase()),
            observacoes: [active.observations, active.execution_rules].filter(Boolean).join('\n\n---\n\n'),
          }
          // não sobrescreve — só insere se não tem
          const { data: existing } = await sb.from('execution_plans').select('id').eq('user_id', local.id).eq('active', true).maybeSingle()
          if (!existing && !DRY_RUN) await sb.from('execution_plans').insert(row)
          console.log(`  plan: ${existing ? 'skip (já existe)' : 'imported'}`)
        }
      }

      // 8. user_trade_config (stops por ativo em pts)
      try {
        const cfgResp = await lovableGet({ resource: 'table', name: 'user_trade_config', user_id: local.lovable_student_id })
        const cfg = (cfgResp.rows || cfgResp.data || [])[0]
        if (cfg) {
          const row = {
            user_id: local.id,
            stop_max_win_points: cfg.stop_max_win_points,
            stop_max_wdo_points: cfg.stop_max_wdo_points,
          }
          if (!DRY_RUN) await sb.from('user_trade_config').upsert(row, { onConflict: 'user_id' })
          console.log(`  trade_config: WIN ${cfg.stop_max_win_points}pts · WDO ${cfg.stop_max_wdo_points}pts`)
        }
      } catch {}

      console.log('  ✓ ok')
    } catch (e) {
      console.log(`  ✗ erro: ${e.message}`)
    }
    console.log('')
  }

  console.log(DRY_RUN ? '🔍 dry-run completo.' : '✓ sync completo.')
}

// ─── mappers ─────────────────────────────────────────────────────
function mapBadge(b) {
  if (!b) return null
  const map = {
    primeiro_instinto: 'primeiro_instinto',
    primeiro: 'primeiro_instinto',
    predador: 'predador',
    cacador: 'cacador',
    caçador: 'cacador',
    aprendiz: 'primeiro_instinto',
    aprendiz_cacador: 'aprendiz_cacador',
    killer: 'killer',
    alpha: 'alpha',
    alfa: 'alpha',
  }
  return map[String(b).toLowerCase()] || 'primeiro_instinto'
}

function mapTempoMercado(s) {
  const map = { 'menos_6m': 'menos_6m', '6m_1a': '6m_1a', '1_2a': '1_2a', 'mais_2a': 'mais_2a' }
  return map[s] || null
}

function mapOpsDia(s) {
  const map = { '1_3': '1_3', '4_6': '4_6', '7_10': '7_10', 'mais_10': 'mais_10' }
  return map[s] || null
}

main().catch(e => { console.error('✗', e.message); process.exit(1) })
