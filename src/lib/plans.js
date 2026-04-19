import { supabase } from './supabase'

// Retorna o plano ativo do usuário (ou null)
export async function getMyExecutionPlan() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Monitor busca o plano ativo de um aluno
export async function getStudentPlan(userId) {
  const { data, error } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Monitor cria/atualiza plano de um aluno
export async function savePlan(plan) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const payload = { ...plan, defined_by: user.id }
  const { data, error } = await supabase
    .from('execution_plans')
    .upsert(payload)
    .select().single()
  if (error) throw error
  return data
}

export async function deactivatePlan(planId) {
  const { error } = await supabase.from('execution_plans').update({ active: false }).eq('id', planId)
  if (error) throw error
}
