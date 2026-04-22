// Client helper pra chamar POST /api/zoom/join e, se aprovado,
// navegar pro redirect_url (que responde 302 pro Zoom com uname prefilled).

import { supabase } from './supabase'

// Pré-check: lê pendências direto do banco ANTES do aluno clicar "entrar".
// Serve pra já abrir o modal de feedback proativamente no load da página,
// sem precisar do round-trip pelo backend (que só detectaria depois do click).
export async function checkMyPendingFeedback() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .rpc('user_has_pending_live_feedback', { p_user: user.id })
  if (error) return null
  return data?.[0] || null
}

export async function requestZoomJoin({ liveSessionId = null } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    return { ok: false, error: 'UNAUTHENTICATED', message: 'Faça login de novo pra continuar.' }
  }

  let res, json
  try {
    res = await fetch('/api/zoom/join', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ live_session_id: liveSessionId }),
    })
    json = await res.json()
  } catch (e) {
    return { ok: false, error: 'NETWORK', message: 'Falha de rede. Tente de novo.' }
  }

  if (res.ok && json?.ok && json.redirect_url) {
    return { ok: true, redirect_url: json.redirect_url, name: json.name }
  }
  return { ok: false, ...json }
}

// Submete feedback do aluno → trigger no banco remove o pending automaticamente
export async function submitLiveFeedback({ liveSessionId, mood, note }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('não autenticado')
  const { error } = await supabase.from('live_feedback').insert({
    user_id: user.id,
    live_session_id: liveSessionId,
    mood: mood ?? null,
    note: note ?? null,
  })
  if (error) throw error
  return { ok: true }
}
