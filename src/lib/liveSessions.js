import { supabase } from './supabase'

export async function listLiveSessions({ upcoming = true, limit = 50 } = {}) {
  let q = supabase.from('live_sessions').select('*').order('starts_at', { ascending: upcoming })
  if (upcoming) q = q.gte('starts_at', new Date(Date.now() - 4 * 3600 * 1000).toISOString())
  const { data, error } = await q.limit(limit)
  if (error) throw error
  return data || []
}

export async function getLiveSession(id) {
  const { data, error } = await supabase.from('live_sessions').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function upsertLiveSession(payload) {
  const { data, error } = await supabase.from('live_sessions').upsert(payload).select().single()
  if (error) throw error
  return data
}

export async function deleteLiveSession(id) {
  const { error } = await supabase.from('live_sessions').delete().eq('id', id)
  if (error) throw error
}
