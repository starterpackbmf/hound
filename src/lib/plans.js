import { supabase } from './supabase'

// Plano ativo = status='active'. Trigger no banco garante 1 por aluno.
export async function getMyExecutionPlan() {
  const { data, error } = await supabase.rpc('get_my_active_execution_plan')
  if (error) throw error
  return (data && data[0]) || null
}

// Monitor busca o plano ativo de um aluno
export async function getStudentPlan(userId) {
  const { data, error } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Lista TODOS os planos do aluno (histórico)
export async function listStudentPlans(userId) {
  const { data, error } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

// Monitor cria novo plano (trigger no banco arquiva o ativo anterior)
export async function createPlan(plan) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const payload = {
    ...plan,
    defined_by: user.id,
    status: 'active',
    active: true, // compat com coluna legacy
  }
  delete payload.id
  const { data, error } = await supabase
    .from('execution_plans')
    .insert(payload)
    .select().single()
  if (error) throw error
  return data
}

export async function updatePlan(id, patch) {
  const { data, error } = await supabase
    .from('execution_plans')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function archivePlan(planId) {
  const { error } = await supabase
    .from('execution_plans')
    .update({ status: 'completed', active: false })
    .eq('id', planId)
  if (error) throw error
}

// Compat com código antigo
export const savePlan = createPlan
export const deactivatePlan = archivePlan
