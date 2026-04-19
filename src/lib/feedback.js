import { supabase } from './supabase'

// ───── Trade feedback ─────
export const TRADE_STATUS_META = {
  OK:       { label: 'OK',       color: 'var(--up)',     bg: '#22c55e22', icon: '✓' },
  AJUSTAR:  { label: 'AJUSTAR',  color: 'var(--pink)',   bg: '#ec489922', icon: '!' },
  DESTAQUE: { label: 'DESTAQUE', color: 'var(--cyan)',   bg: '#00d9ff22', icon: '★' },
  ALERTAR:  { label: 'ALERTAR',  color: 'var(--down)',   bg: '#ef444422', icon: '⚠' },
}

export async function getTradeFeedback(tradeId) {
  const { data, error } = await supabase
    .from('trade_feedback')
    .select('*')
    .eq('trade_id', tradeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function listTradeFeedbackFor(studentId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('trade_feedback')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function saveTradeFeedback({ trade_id, student_id, status, feedback }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('trade_feedback')
    .upsert({ trade_id, student_id, mentor_id: user.id, status, feedback })
    .select().single()
  if (error) throw error
  return data
}

// ───── Daily mentor feedback ─────
export const FEEDBACK_TAGS = ['AJUSTAR', 'ELOGIAR', 'ALERTAR', 'ACOMPANHAR']

export async function listDailyFeedback(studentId, { limit = 30 } = {}) {
  const { data, error } = await supabase
    .from('mentor_feedback')
    .select('*')
    .eq('student_id', studentId)
    .order('day_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getRecentFeedbackForMe({ limit = 5 } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('mentor_feedback')
    .select('*')
    .eq('student_id', user.id)
    .order('day_date', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}

export async function saveDailyFeedback({ student_id, day_date, feedback, tags = [] }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('mentor_feedback')
    .insert({ student_id, mentor_id: user.id, day_date, feedback, tags })
    .select().single()
  if (error) throw error
  return data
}

// ───── Mentorship sessions (resumo pós-sessão) ─────
export async function listSessionsFor(studentId) {
  const { data, error } = await supabase
    .from('mentorship_sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('session_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getMyMentorshipSessions() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('mentorship_sessions')
    .select('*')
    .eq('student_id', user.id)
    .order('session_date', { ascending: false })
  if (error) return []
  return data || []
}

export async function saveSession({ student_id, session_date, summary, technical_adjustments, emotional_observations, suggested_strategies, next_focus }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('mentorship_sessions')
    .insert({
      student_id, mentor_id: user.id, session_date,
      summary, technical_adjustments, emotional_observations,
      suggested_strategies, next_focus,
    })
    .select().single()
  if (error) throw error
  return data
}
