import { supabase } from './supabase'

export async function listConversations() {
  const { data, error } = await supabase
    .from('oraculo_conversations')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createConversation(title = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('oraculo_conversations')
    .insert({ user_id: user.id, title })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from('oraculo_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveMessage(conversationId, { role, content, sources }) {
  const { data, error } = await supabase
    .from('oraculo_messages')
    .insert({ conversation_id: conversationId, role, content, sources: sources || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function askOraculo(conversationId, messages) {
  const res = await fetch('/api/oraculo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, messages }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `oráculo ${res.status}`)
  return data
}

export async function renameConversation(id, title) {
  const { error } = await supabase.from('oraculo_conversations').update({ title }).eq('id', id)
  if (error) throw error
}

export async function deleteConversation(id) {
  const { error } = await supabase.from('oraculo_conversations').delete().eq('id', id)
  if (error) throw error
}
