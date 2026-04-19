import { supabase } from './supabase'

// Multiplicadores do ponto → R$ (pode extender com outros ativos)
export const ASSET_MULTIPLIERS = {
  WIN: 0.20,
  WDO: 10.00,
  WINZ25: 0.20,
  WINV25: 0.20,
  WDOZ25: 10.00,
  WDOV25: 10.00,
}

export const EMOTIONS = [
  'Confiante', 'Calmo', 'Focado', 'Neutro',
  'Cauteloso', 'Atento', 'Paciente',
  'Ansioso', 'Irritado', 'Impulsivo', 'Vingativo', 'Com medo',
]

export const EMOTION_TONES = {
  Confiante: 'up', Calmo: 'up', Focado: 'up', Neutro: 'neutral',
  Cauteloso: 'neutral', Atento: 'up', Paciente: 'up',
  Ansioso: 'down', Irritado: 'down', Impulsivo: 'down',
  Vingativo: 'down', 'Com medo': 'down',
}

// Multiplier do ativo — default WIN se desconhecido
export function assetMultiplier(ativo) {
  const up = (ativo || '').toUpperCase().trim()
  if (up in ASSET_MULTIPLIERS) return ASSET_MULTIPLIERS[up]
  if (up.startsWith('WIN')) return ASSET_MULTIPLIERS.WIN
  if (up.startsWith('WDO')) return ASSET_MULTIPLIERS.WDO
  return ASSET_MULTIPLIERS.WIN // fallback
}

// Calcula média ponderada em pts dadas as parciais + encerramento final
// partials: [{ pts, contratos }], encerramentoPts aplica-se ao saldo restante
export function calcMediaPonderada(partials, encerramentoPts, contratosIniciais) {
  const contratos = contratosIniciais || 0
  if (!contratos) return 0
  let somaPts = 0
  let contratosUsados = 0
  for (const p of (partials || [])) {
    const c = Number(p.contratos) || 0
    const pts = Number(p.pts) || 0
    somaPts += pts * c
    contratosUsados += c
  }
  const saldo = Math.max(0, contratos - contratosUsados)
  if (saldo > 0 && encerramentoPts != null && encerramentoPts !== '') {
    somaPts += Number(encerramentoPts) * saldo
    contratosUsados += saldo
  }
  if (contratosUsados === 0) return 0
  return somaPts / contratosUsados
}

// Resultado em R$
export function calcResultadoBrl(mediaPonderada, contratosIniciais, ativo) {
  const mult = assetMultiplier(ativo)
  return (Number(mediaPonderada) || 0) * (contratosIniciais || 0) * mult
}

// CRUD ---------------------------------------------------------
export async function listAccounts() {
  const { data, error } = await supabase
    .from('trade_accounts')
    .select('*')
    .order('order_index')
  if (error) throw error
  return data || []
}

export async function getDefaultAccount() {
  const accs = await listAccounts()
  return accs.find(a => a.is_default) || accs[0] || null
}

export async function listTrades({ accountId, from, to } = {}) {
  let q = supabase.from('trades').select('*').order('date', { ascending: false })
  if (accountId) q = q.eq('account_id', accountId)
  if (from) q = q.gte('date', from)
  if (to) q = q.lte('date', to)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getTrade(id) {
  const { data, error } = await supabase.from('trades').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function upsertTrade(payload) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const row = { ...payload, user_id: user.id }
  const { data, error } = await supabase
    .from('trades')
    .upsert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTrade(id) {
  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) throw error
}

// Day summaries
export async function getDaySummary(date, accountId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  let q = supabase.from('day_summaries').select('*').eq('user_id', user.id).eq('date', date)
  if (accountId) q = q.eq('account_id', accountId)
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return data
}

export async function upsertDaySummary(payload) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const row = { ...payload, user_id: user.id }
  const { data, error } = await supabase
    .from('day_summaries')
    .upsert(row, { onConflict: 'user_id,date,account_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// Métricas agregadas
export async function computeSummary({ accountId, from, to } = {}) {
  const trades = await listTrades({ accountId, from, to })
  if (!trades.length) return { total_trades: 0 }

  const total = trades.length
  const wins = trades.filter(t => Number(t.resultado_brl) > 0).length
  const losses = trades.filter(t => Number(t.resultado_brl) < 0).length
  const zeros = trades.filter(t => Number(t.resultado_brl) === 0).length
  const result = trades.reduce((a, t) => a + Number(t.resultado_brl || 0), 0)
  const pts = trades.reduce((a, t) => a + Number(t.media_ponderada || 0) * Number(t.contratos_iniciais || 0), 0)
  const winRate = total ? (wins / total) * 100 : 0
  const followed = trades.filter(t => t.followed_plan === true).length
  const followedRate = total ? (followed / total) * 100 : 0
  const avgWin = wins ? trades.filter(t => Number(t.resultado_brl) > 0).reduce((a, t) => a + Number(t.resultado_brl), 0) / wins : 0
  const avgLoss = losses ? Math.abs(trades.filter(t => Number(t.resultado_brl) < 0).reduce((a, t) => a + Number(t.resultado_brl), 0)) / losses : 0
  const rr = avgLoss ? avgWin / avgLoss : 0

  const bySetup = {}
  trades.forEach(t => {
    const s = t.setup
    bySetup[s] = bySetup[s] || { count: 0, result: 0, wins: 0 }
    bySetup[s].count++
    bySetup[s].result += Number(t.resultado_brl || 0)
    if (Number(t.resultado_brl) > 0) bySetup[s].wins++
  })

  const days = new Set(trades.map(t => t.date)).size

  return {
    total_trades: total,
    wins, losses, zeros,
    total_result_brl: Math.round(result * 100) / 100,
    total_points: Math.round(pts * 10) / 10,
    win_rate: Math.round(winRate * 10) / 10,
    avg_win_brl: Math.round(avgWin * 100) / 100,
    avg_loss_brl: Math.round(avgLoss * 100) / 100,
    risk_reward: Math.round(rr * 10) / 10,
    followed_plan_rate: Math.round(followedRate * 10) / 10,
    days_operated: days,
    by_setup: bySetup,
  }
}
