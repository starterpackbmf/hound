// Notas cumulativas das sessões de monitoria.
// Qualquer monitor vê o histórico completo de um aluno.

import { supabase } from './supabase'

export async function listStudentNotes(studentId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('monitor_session_notes')
    .select('*, monitor:profiles!monitor_id(id, name, avatar_url)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function listSessionNotes(sessionId) {
  const { data, error } = await supabase
    .from('monitor_session_notes')
    .select('*, monitor:profiles!monitor_id(id, name, avatar_url)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createNote({ session_id = null, student_id, summary_md, tags = [], next_steps_md = null }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('monitor_session_notes')
    .insert({
      session_id,
      student_id,
      monitor_id: user.id,
      summary_md: summary_md.trim(),
      tags: tags || [],
      next_steps_md: next_steps_md?.trim() || null,
    })
    .select().single()
  if (error) throw error
  return data
}

export async function updateNote(id, patch) {
  const { data, error } = await supabase
    .from('monitor_session_notes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export const NOTE_TAGS = [
  'emocional', 'técnico', 'gerenciamento', 'plano',
  'revisar-trades', 'mindset', 'disciplina', 'consistência',
  'onboarding', 'quebra-de-regra',
]
