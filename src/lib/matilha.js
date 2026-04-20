// Typed fetchers for the Matilha diário API via our /api/matilha proxy.

const BASE = '/api/matilha'

async function get(params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}?${qs}`)
  if (!res.ok) throw new Error(`Matilha API ${res.status}`)
  return res.json()
}

export const matilha = {
  students: () => get({ resource: 'students' }),
  student: (id) => get({ resource: 'student', id }),
  trades: (studentId, from, to) => get({ resource: 'trades', student_id: studentId, ...(from && { from }), ...(to && { to }) }),
  summary: (studentId, from, to) => get({ resource: 'summary', student_id: studentId, ...(from && { from }), ...(to && { to }) }),
  daySummaries: (studentId, from, to) => get({ resource: 'day-summaries', student_id: studentId, ...(from && { from }), ...(to && { to }) }),

  // Tabelas genéricas via proxy (?resource=table&name=...)
  table: (name, opts = {}) => get({ resource: 'table', name, ...opts }),

  // Comunidade
  communityPosts: (limit = 50) => get({ resource: 'table', name: 'community_posts', limit, order: 'created_at.desc' }),
  communityComments: (postId) => get({ resource: 'table', name: 'community_comments', limit: 500, order: 'created_at.asc', select: '*' }).then(all =>
    (all || []).filter(c => c.post_id === postId)
  ),
  profiles: (ids) => get({ resource: 'table', name: 'profiles', limit: 500 }),
  storeItems: () => get({ resource: 'table', name: 'store_items', limit: 100, order: 'created_at.desc' }),
  storeItemVariants: () => get({ resource: 'table', name: 'store_item_variants', limit: 500 }),
  storeItemImages: () => get({ resource: 'table', name: 'store_item_images', limit: 500 }),
}
