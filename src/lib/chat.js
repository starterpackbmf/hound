import { supabase } from './supabase'

export async function getOrCreateRoomForLiveSession(liveSessionId, title) {
  const { data: existing } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('live_session_id', liveSessionId)
    .maybeSingle()
  if (existing) return existing
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({ kind: 'live_session', live_session_id: liveSessionId, title })
    .select().single()
  if (error) throw error
  return data
}

export async function listMessages(roomId, { limit = 200 } = {}) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function sendMessage(roomId, body, replyTo = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, user_id: user.id, body: body.trim(), reply_to: replyTo })
    .select().single()
  if (error) throw error
  return data
}

export async function deleteMessage(id) {
  const { error } = await supabase
    .from('chat_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function pinMessage(id, pinned = true) {
  const { error } = await supabase.from('chat_messages').update({ pinned }).eq('id', id)
  if (error) throw error
}

export async function markJoined(roomId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('chat_attendance').upsert({
    room_id: roomId, user_id: user.id, joined_at: new Date().toISOString(),
  }, { onConflict: 'room_id,user_id,joined_at' })
}

export async function fetchAuthors(userIds) {
  if (!userIds?.length) return {}
  const unique = [...new Set(userIds)]
  const { data } = await supabase
    .from('profiles')
    .select('id, name, roles, current_badge, avatar_url')
    .in('id', unique)
  const map = {}
  ;(data || []).forEach(p => { map[p.id] = p })
  return map
}

// Subscribe to new messages in a room
export function subscribeMessages(roomId, onInsert, onUpdate) {
  const channel = supabase
    .channel(`chat:${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'chat_messages',
      filter: `room_id=eq.${roomId}`,
    }, payload => onInsert?.(payload.new))
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'chat_messages',
      filter: `room_id=eq.${roomId}`,
    }, payload => onUpdate?.(payload.new))
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// Presence channel — real-time "who's online now"
export function subscribePresence(roomId, me, onSync) {
  const channel = supabase.channel(`presence:${roomId}`, {
    config: { presence: { key: me.id } },
  })
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const users = Object.values(state).flat()
    onSync?.(users)
  })
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        id: me.id,
        name: me.name,
        roles: me.roles || [],
        badge: me.current_badge,
        joined_at: new Date().toISOString(),
      })
    }
  })
  return () => { supabase.removeChannel(channel) }
}

export function userTag(profile) {
  const roles = profile?.roles || []
  if (roles.includes('admin')) return { label: 'ADMIN', color: '#ef4444' }
  if (roles.includes('monitor')) return { label: 'MONITOR', color: '#f59e0b' }
  if (roles.includes('imortal')) return { label: 'IMORTAL', color: '#a855f7' }
  if (profile?.status === 'ativo') return { label: 'MENTORADO', color: '#00d9ff' }
  return { label: 'FREE', color: '#71717a' }
}
