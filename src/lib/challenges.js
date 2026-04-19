import { supabase } from './supabase'

function mondayOf(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0=dom..6=sáb
  const diff = day === 0 ? -6 : 1 - day // ajusta pra segunda
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export async function listActiveChallenges() {
  const { data, error } = await supabase
    .from('sc_weekly_challenges')
    .select('*')
    .eq('is_active', true)
    .order('week_start', { ascending: false })
    .limit(10)
  if (error) throw error
  return data || []
}

export async function listThisWeekChallenges() {
  const monday = mondayOf()
  const { data, error } = await supabase
    .from('sc_weekly_challenges')
    .select('*')
    .eq('is_active', true)
    .eq('week_start', monday)
  if (error) throw error
  return data || []
}

export async function listMyCompletions() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('sc_challenge_completions')
    .select('challenge_id')
    .eq('user_id', user.id)
  if (error) return []
  return (data || []).map(r => r.challenge_id)
}

export async function completeChallenge(challengeId) {
  const { data, error } = await supabase.rpc('complete_challenge', { challenge_id: challengeId })
  if (error) throw error
  if (!data?.ok) throw new Error(data?.error || 'falha')
  return data
}

export async function createChallenge({ title, description, reward_sc = 30, criteria = null, week_start = null }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const row = {
    week_start: week_start || mondayOf(),
    title, description, reward_sc, criteria,
    created_by: user.id,
  }
  const { data, error } = await supabase.from('sc_weekly_challenges').insert(row).select().single()
  if (error) throw error
  return data
}

export async function deleteChallenge(id) {
  const { error } = await supabase.from('sc_weekly_challenges').update({ is_active: false }).eq('id', id)
  if (error) throw error
}
