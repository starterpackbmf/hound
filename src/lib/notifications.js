import { supabase } from './supabase'

export async function listNotifications({ limit = 30, unreadOnly = false } = {}) {
  let q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit)
  if (unreadOnly) q = q.is('read_at', null)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function countUnread() {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)
  if (error) return 0
  return count || 0
}

export async function markAsRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function markAllRead() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
  if (error) throw error
}

export function subscribeToMine(callback) {
  const channel = supabase.channel('notifs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
      callback(payload.new)
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export const NOTIF_KIND_META = {
  trade_feedback:       { icon: '✎', color: 'var(--cyan)' },
  daily_feedback:       { icon: '🧭', color: 'var(--cyan)' },
  session_saved:        { icon: '🎓', color: 'var(--purple)' },
  slot_confirmed:       { icon: '📅', color: 'var(--up)' },
  slot_requested:       { icon: '🔔', color: 'var(--pink)' },
  challenge_new:        { icon: '⚡', color: 'var(--pink)' },
  challenge_completed:  { icon: '🎉', color: 'var(--up)' },
  rank_up:              { icon: '👑', color: 'var(--gold)' },
  achievement_unlocked: { icon: '🏆', color: 'var(--gold)' },
  plan_updated:         { icon: '🎯', color: 'var(--cyan)' },
  live_starting:        { icon: '🔴', color: 'var(--live)' },
  redemption_status:    { icon: '📦', color: 'var(--pink)' },
  generic:              { icon: '✦', color: 'var(--text-secondary)' },
}
