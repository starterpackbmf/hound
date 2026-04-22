import { supabase } from './supabase'

// Lê um registro de app_settings por key. RLS só libera pra admin/suporte.
export async function getSetting(key) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) {
    console.warn('[adminSettings] get error:', error.message)
    return null
  }
  return data?.value ?? null
}

export async function setSetting(key, value) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    }, { onConflict: 'key' })
  if (error) throw error
}
