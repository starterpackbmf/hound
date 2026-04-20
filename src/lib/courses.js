import { supabase } from './supabase'

// Lists courses the current user is allowed to see (RLS does the filtering).
export async function listCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('order_index')
  if (error) throw error
  return data || []
}

export async function getCourseBySlug(slug) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}

// Returns all modules of a course (flat). Caller builds the tree via parent_id.
export async function listModules(courseId) {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index')
  if (error) throw error
  return data || []
}

// Build a tree from flat modules.
export function buildModuleTree(modules) {
  const byId = {}
  const roots = []
  modules.forEach(m => { byId[m.id] = { ...m, children: [] } })
  modules.forEach(m => {
    const node = byId[m.id]
    if (m.parent_id && byId[m.parent_id]) byId[m.parent_id].children.push(node)
    else roots.push(node)
  })
  return roots
}

export async function listLessonMeta(moduleId) {
  const { data, error } = await supabase
    .from('lesson_meta')
    .select('*')
    .eq('module_id', moduleId)
  if (error) throw error
  return data || []
}

export async function listMaterials(moduleId) {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('module_id', moduleId)
    .order('order_index')
  if (error) throw error
  return data || []
}

export async function getMyProgress(pandaVideoIds) {
  if (!pandaVideoIds?.length) return {}
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .in('panda_video_id', pandaVideoIds)
  if (error) throw error
  const map = {}
  ;(data || []).forEach(p => { map[p.panda_video_id] = p })
  return map
}

// Retorna mapa { courseId: { total, completed } }
export async function getCoursesProgress(courseIds) {
  if (!courseIds?.length) return {}
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data: modules } = await supabase
    .from('course_modules').select('id, course_id').in('course_id', courseIds)
  if (!modules?.length) return {}
  const moduleIds = modules.map(m => m.id)
  const modToCourse = {}
  modules.forEach(m => { modToCourse[m.id] = m.course_id })

  const { data: lessons } = await supabase
    .from('lesson_meta').select('id, module_id, panda_video_id').in('module_id', moduleIds)

  const byCourse = {}
  courseIds.forEach(cid => { byCourse[cid] = { total: 0, completed: 0 } })
  ;(lessons || []).forEach(l => {
    const cid = modToCourse[l.module_id]
    if (cid) byCourse[cid].total++
  })

  const pvIds = (lessons || []).map(l => l.panda_video_id).filter(Boolean)
  if (pvIds.length > 0) {
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('panda_video_id, watched_percent, completed_at')
      .eq('user_id', user.id)
      .in('panda_video_id', pvIds)
    const done = new Set((progress || []).filter(p => p.completed_at || p.watched_percent >= 90).map(p => p.panda_video_id))
    ;(lessons || []).forEach(l => {
      if (done.has(l.panda_video_id)) {
        const cid = modToCourse[l.module_id]
        if (cid) byCourse[cid].completed++
      }
    })
  }
  return byCourse
}

export async function markWatched(pandaVideoId, watchedPercent = 100) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const payload = {
    user_id: user.id,
    panda_video_id: pandaVideoId,
    watched_percent: watchedPercent,
    completed_at: watchedPercent >= 90 ? new Date().toISOString() : null,
  }
  const { error } = await supabase
    .from('lesson_progress')
    .upsert(payload, { onConflict: 'user_id,panda_video_id' })
  if (error) throw error
  return payload
}
