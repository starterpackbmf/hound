import { supabase } from './supabase'

export async function listEvents({ from, to, limit = 50 } = {}) {
  let q = supabase.from('events').select('*').order('starts_at', { ascending: true }).limit(limit)
  if (from) q = q.gte('starts_at', from)
  if (to) q = q.lte('starts_at', to)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export function partitionEvents(events, now = new Date()) {
  const live = []
  const upcoming = []
  const past = []
  for (const e of events) {
    const s = new Date(e.starts_at)
    const endEstimate = e.ends_at ? new Date(e.ends_at) : new Date(s.getTime() + 90 * 60 * 1000)
    if (s <= now && now <= endEstimate) live.push(e)
    else if (s > now) upcoming.push(e)
    else past.push(e)
  }
  past.sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
  return { live, upcoming, past }
}

export function isYoutubeUrl(url) {
  return /youtube\.com|youtu\.be/i.test(url || '')
}

export function youtubeEmbedUrl(url) {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|live\/)([A-Za-z0-9_-]{6,})/)
  const id = m?.[1]
  if (!id) return null
  return `https://www.youtube.com/embed/${id}`
}

export const EVENT_KIND_LABELS = {
  ao_vivo: 'aula ao vivo',
  open_class: 'open class',
  imersao: 'imersão',
  replay: 'replay',
}
