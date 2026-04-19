import { supabase } from './supabase'

export const POST_CATEGORIES = [
  { code: 'geral',       label: 'geral',       emoji: '💬' },
  { code: 'relato',      label: 'relato',      emoji: '📝' },
  { code: 'trade',       label: 'trade',       emoji: '📊' },
  { code: 'dificuldade', label: 'dificuldade', emoji: '🆘' },
  { code: 'leitura',     label: 'leitura',     emoji: '📖' },
]

export function categoryMeta(code) {
  return POST_CATEGORIES.find(c => c.code === code) || POST_CATEGORIES[0]
}

export async function listPosts({ category, limit = 50 } = {}) {
  let q = supabase.from('community_posts').select('*').order('created_at', { ascending: false }).limit(limit)
  if (category && category !== 'all') q = q.eq('category', category)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createPost({ body, category = 'geral', image_url = null }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('community_posts')
    .insert({ user_id: user.id, body: body.trim(), category, image_url })
    .select().single()
  if (error) throw error
  return data
}

export async function deletePost(id) {
  const { error } = await supabase.from('community_posts').delete().eq('id', id)
  if (error) throw error
}

export async function listComments(postId) {
  const { data, error } = await supabase
    .from('community_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function postComment(postId, body) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('community_comments')
    .insert({ post_id: postId, user_id: user.id, body: body.trim() })
    .select().single()
  if (error) throw error
  return data
}

export async function toggleLike(postId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  // tenta deletar; se nada deletado, insere
  const { data: existing } = await supabase
    .from('community_likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) {
    await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    return { liked: false }
  } else {
    await supabase.from('community_likes').insert({ post_id: postId, user_id: user.id })
    return { liked: true }
  }
}

export async function fetchMyLikes(postIds) {
  if (!postIds?.length) return new Set()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()
  const { data } = await supabase
    .from('community_likes')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', postIds)
  return new Set((data || []).map(r => r.post_id))
}

export async function fetchAuthors(userIds) {
  if (!userIds?.length) return {}
  const unique = [...new Set(userIds)]
  const { data } = await supabase
    .from('profiles')
    .select('id, name, current_badge, roles, avatar_url')
    .in('id', unique)
  const map = {}
  ;(data || []).forEach(p => { map[p.id] = p })
  return map
}
