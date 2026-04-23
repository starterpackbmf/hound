import { supabase } from './supabase'

export async function listAvailableSlots({ from, to } = {}) {
  let q = supabase
    .from('monitor_slots')
    .select('*')
    .eq('status', 'disponivel')
    .order('starts_at', { ascending: true })
  if (from) q = q.gte('starts_at', from)
  if (to) q = q.lte('starts_at', to)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function listMySessions({ status = null } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let q = supabase
    .from('monitor_slots')
    .select('*')
    .eq('student_id', user.id)
    .order('starts_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

// Monitor — seus slots
export async function listMyMonitorSlots({ from, to } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let q = supabase
    .from('monitor_slots')
    .select('*')
    .eq('monitor_id', user.id)
    .order('starts_at', { ascending: true })
  if (from) q = q.gte('starts_at', from)
  if (to) q = q.lte('starts_at', to)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createSlot({ starts_at, duration_min = 60, status = 'disponivel' }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('monitor_slots')
    .insert({ monitor_id: user.id, starts_at, duration_min, status })
    .select().single()
  if (error) throw error
  return data
}

// Solicita um slot. Agora exige contexto (motivo/categoria/prioridade).
// Backend valida fair-use e retorna error codes estruturados.
export async function requestSlot(slotId, {
  motivo, categoria = null, prioridade = 'rotina', attachment_url = null,
} = {}) {
  const { data, error } = await supabase.rpc('request_monitor_slot', {
    slot_id: slotId,
    p_motivo: motivo || null,
    p_categoria: categoria,
    p_prioridade: prioridade,
    p_attachment_url: attachment_url,
  })
  if (error) throw error
  if (!data?.ok) {
    const err = new Error(data?.message || data?.error || 'falha ao solicitar')
    err.code = data?.error
    throw err
  }
  return data
}

// Marca aluno como no-show (monitor-only)
export async function markNoShow(slotId) {
  const { error } = await supabase
    .from('monitor_slots')
    .update({ status: 'no_show' })
    .eq('id', slotId)
  if (error) throw error
}

export const SESSION_CATEGORIES = [
  { code: 'tecnico',        label: 'técnico',         emoji: '📊' },
  { code: 'emocional',      label: 'emocional',       emoji: '🧠' },
  { code: 'plano',          label: 'plano de execução', emoji: '📋' },
  { code: 'revisar_trades', label: 'revisar trades',  emoji: '🔍' },
  { code: 'onboarding',     label: 'onboarding',      emoji: '👋' },
  { code: 'outros',         label: 'outros',          emoji: '💬' },
]

export const SESSION_PRIORITIES = [
  { code: 'rotina',          label: 'rotina',           emoji: '⚪', color: 'var(--text-muted)' },
  { code: 'acompanhamento',  label: 'acompanhamento',   emoji: '🟡', color: 'var(--amber)' },
  { code: 'urgente',         label: 'tô precisando',    emoji: '🔴', color: 'var(--red)' },
]

export async function confirmSlot(slotId, meetingUrl = null) {
  const { data, error } = await supabase.rpc('confirm_monitor_slot', {
    slot_id: slotId,
    meeting_url_arg: meetingUrl,
  })
  if (error) throw error
  if (!data?.ok) throw new Error(data?.error || 'falha ao confirmar')
  return data
}

export async function cancelSlot(slotId) {
  const { error } = await supabase.from('monitor_slots').update({ status: 'cancelado' }).eq('id', slotId)
  if (error) throw error
}

// Enrich: fetch monitor/student profiles for display
export async function fetchUsersForSlots(slots) {
  const ids = new Set()
  slots.forEach(s => { if (s.monitor_id) ids.add(s.monitor_id); if (s.student_id) ids.add(s.student_id) })
  if (!ids.size) return {}
  const { data } = await supabase.from('profiles').select('id, name, current_badge, avatar_url, whatsapp').in('id', [...ids])
  const map = {}
  ;(data || []).forEach(p => { map[p.id] = p })
  return map
}
