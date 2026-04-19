// Client helpers for Panda Video API via /api/panda proxy.

const BASE = '/api/panda'
const PLAYER_HOST = import.meta.env.VITE_PANDA_PLAYER_HOST

async function get(params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}?${qs}`)
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Panda ${res.status}: ${err}`)
  }
  return res.json()
}

export const panda = {
  folders: (parent_folder_id) => get({ resource: 'folders', ...(parent_folder_id && { parent_folder_id }) }),
  videos: (folder_id, opts = {}) => get({ resource: 'videos', folder_id, ...(opts.page && { page: opts.page }), ...(opts.limit && { limit: opts.limit }) }),
  video: (id) => get({ resource: 'video', id }),
}

export function embedUrl(videoId) {
  if (!PLAYER_HOST) {
    console.warn('[panda] VITE_PANDA_PLAYER_HOST not set')
    return null
  }
  return `https://${PLAYER_HOST}/embed/?v=${encodeURIComponent(videoId)}`
}
