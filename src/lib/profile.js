import { supabase } from './supabase'

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) {
    console.warn('[profile] fetch error:', error.message)
    return null
  }
  return data
}

export const BADGE_LABELS = {
  primeiro_instinto: 'Primeiro Instinto',
  predador: 'Predador',
  alfa: 'Alfa',
  imortal: 'Imortal',
}

export const STATUS_LABELS = {
  pendente: 'pendente',
  ativo: 'ativo',
  bloqueado: 'bloqueado',
  cancelado: 'cancelado',
}
