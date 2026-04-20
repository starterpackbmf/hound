// Gatekeeping premium vs free.
// status='ativo' = premium (paga). Qualquer outro status = free.
// Monitor/admin/imortal bypassa tudo.

export function isPremium(profile) {
  if (!profile) return false
  const privileged = (profile.roles || []).some(r => ['admin', 'monitor', 'imortal'].includes(r))
  if (privileged) return true
  return profile.status === 'ativo'
}

export function isMonitor(profile) {
  return (profile?.roles || []).some(r => ['monitor', 'admin', 'imortal'].includes(r))
}

export function isAdmin(profile) {
  return (profile?.roles || []).includes('admin')
}

// Rotas premium (só mentorado ativo). Rotas não listadas = free.
export const PREMIUM_ROUTES = new Set([
  '/app/diario', '/app/historico', '/app/novo-trade', '/app/finalizar-dia',
  '/app/estudo',
  '/app/aulas', '/app/imersoes',
  '/app/monitoria', '/app/sessoes', '/app/plano-execucao',
  '/app/oraculo', '/app/resumo-semanal',
  '/app/jornada', '/app/operacional', '/app/feedback',
])

export function isPremiumRoute(path) {
  if (!path) return false
  // tira query/hash
  const p = path.split('?')[0].split('#')[0]
  // checa prefixos também (ex: /app/estudo/tradesystem-starter, /app/trade/:id)
  if (p.startsWith('/app/estudo')) return true
  if (p.startsWith('/app/trade/')) return true
  return PREMIUM_ROUTES.has(p)
}
