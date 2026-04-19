import { supabase } from './supabase'

const BUCKET = 'trade-prints'

// Upload de uma imagem de print. Retorna { url, path } ou throw.
export async function uploadPrint(file) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  if (!file) throw new Error('nenhum arquivo')
  if (file.size > 5 * 1024 * 1024) throw new Error('máximo 5 MB')
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('tipo de arquivo inválido (só jpg/png/webp/gif)')

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = `${user.id}/${filename}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: publicUrl, path }
}

// Upload de avatar
export async function uploadAvatar(file) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  if (file.size > 2 * 1024 * 1024) throw new Error('máximo 2 MB')
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('tipo inválido')

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${user.id}/avatar_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  return { url: publicUrl, path }
}
