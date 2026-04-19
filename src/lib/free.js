import { supabase } from './supabase'

// ───── PARTNERS ─────
export async function listPartners() {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('order_index')
  if (error) throw error
  return data || []
}

// ───── SOCIAL POSTS ─────
export async function listSocialPosts() {
  const { data, error } = await supabase
    .from('social_posts')
    .select('*')
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(50)
  if (error) throw error
  return data || []
}

// ───── FORUM ─────
export async function listThreads({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('forum_threads')
    .select('*')
    .order('status', { ascending: false }) // pinned first
    .order('last_reply_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getThread(id) {
  const { data, error } = await supabase
    .from('forum_threads')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listReplies(threadId) {
  const { data, error } = await supabase
    .from('forum_replies')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createThread({ title, body, tags = [] }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('forum_threads')
    .insert({ user_id: user.id, title, body, tags })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function postReply(threadId, body) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('forum_replies')
    .insert({ thread_id: threadId, user_id: user.id, body })
    .select()
    .single()
  if (error) throw error
  return data
}

// Enriches threads/replies with display_name from profiles
export async function fetchAuthorsForUserIds(userIds) {
  if (!userIds.length) return {}
  const unique = [...new Set(userIds)]
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, current_badge, avatar_url')
    .in('id', unique)
  if (error) return {}
  const map = {}
  ;(data || []).forEach(p => { map[p.id] = p })
  return map
}

// ───── PACKSTORE ─────
export async function listStoreItems() {
  const { data, error } = await supabase
    .from('packstore_items')
    .select('*')
    .order('order_index')
  if (error) throw error
  return data || []
}

export async function getMyCoins() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { balance: 0, total_earned: 0 }
  const { data } = await supabase.from('user_coins').select('*').eq('user_id', user.id).maybeSingle()
  return data || { balance: 0, total_earned: 0 }
}

export async function listMyTransactions({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function purchaseItem(itemId) {
  const { data, error } = await supabase.rpc('packstore_purchase', { item_id: itemId })
  if (error) throw error
  if (!data?.ok) throw new Error(data?.error || 'compra falhou')
  return data
}

export async function earnCoins(actionKey, amount, reason) {
  const { data, error } = await supabase.rpc('coins_earn', {
    action_key: actionKey, amount, reason: reason || null,
  })
  if (error) throw error
  return data
}

// Regras reais de ganho de SC (mesmas do Lovable)
export const COIN_RULES = {
  trade_registered:     { amount: 3,   reason: 'registrar trade',            cadence: 'por trade' },
  day_finalized:        { amount: 5,   reason: 'finalizar o dia',            cadence: 'por dia' },
  community_activity:   { amount: 10,  reason: 'atividade na comunidade',    cadence: '1x/dia' },
  positive_week:        { amount: 30,  reason: 'semana positiva',            cadence: 'semanal' },
  plan_streak_5:        { amount: 20,  reason: 'streak 5 dias no plano',     cadence: 'por streak' },
  rank_up:              { amount: 100, reason: 'evolução de rank',           cadence: 'por mudança' },
  diagnostic_complete:  { amount: 10,  reason: 'diagnóstico completado',     cadence: 'por diagnóstico' },
  ficha_complete:       { amount: 20,  reason: 'ficha de acompanhamento completa', cadence: 'única' },
}

export function earnByRule(ruleKey, extraReason) {
  const r = COIN_RULES[ruleKey]
  if (!r) throw new Error(`coin rule desconhecida: ${ruleKey}`)
  return earnCoins(ruleKey, r.amount, extraReason || r.reason)
}

// ───── RELATÓRIO DA COMUNIDADE (derivado do diário) ─────
// Retorna métricas agregadas por período (reutiliza a API Matilha).
