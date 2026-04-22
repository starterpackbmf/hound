import { supabase } from './supabase'

// Segunda da semana passada ou atual, dependendo do input
export function mondayOf(dateIso) {
  const d = new Date(dateIso + 'T12:00:00')
  const dow = d.getDay() // 0=dom
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function fridayOf(mondayIso) {
  const d = new Date(mondayIso + 'T12:00:00')
  d.setDate(d.getDate() + 4)
  return d.toISOString().slice(0, 10)
}

export function currentMonday() {
  return mondayOf(new Date().toISOString().slice(0, 10))
}

export function previousMonday(mondayIso) {
  const d = new Date(mondayIso + 'T12:00:00')
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

export function nextMonday(mondayIso) {
  const d = new Date(mondayIso + 'T12:00:00')
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

// Busca o briefing de uma semana específica (null se não existe).
// Regra: 1 briefing por aluno por semana, independente da conta.
export async function getBriefing({ weekStart }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('ai_briefings').select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Lista últimos N briefings do aluno (pro seletor/histórico)
export async function listBriefings({ limit = 12 } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('ai_briefings').select('*')
    .eq('user_id', user.id)
    .order('week_start', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// Dispara a geração na edge function (user_id é resolvido via JWT na function)
export async function generateBriefing({ weekStart, accountId, force = false }) {
  const { data, error } = await supabase.functions.invoke('generate-wolf-briefing', {
    body: {
      account_id: accountId || null,
      week_start: weekStart,
      force,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error + (data.detail ? ': ' + data.detail : ''))
  return data?.briefing
}

// Formata semana pro UI (ex: "07 – 11 abr")
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export function formatWeekLabel(mondayIso) {
  const m = new Date(mondayIso + 'T12:00:00')
  const f = new Date(mondayIso + 'T12:00:00')
  f.setDate(f.getDate() + 4)
  const d1 = String(m.getDate()).padStart(2, '0')
  const d2 = String(f.getDate()).padStart(2, '0')
  const sameMonth = m.getMonth() === f.getMonth()
  return sameMonth
    ? `${d1} – ${d2} ${MESES[m.getMonth()]}`
    : `${d1} ${MESES[m.getMonth()]} – ${d2} ${MESES[f.getMonth()]}`
}

// Hook helper: dado uma string markdown leve, renderiza **bold** e emojis inline
// (parser minimalista — mantém o JSX limpo)
export function parseLightMarkdown(text) {
  if (!text) return []
  const parts = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIdx = 0
  let m
  let key = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push({ k: key++, type: 'text', value: text.slice(lastIdx, m.index) })
    parts.push({ k: key++, type: 'bold', value: m[1] })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) parts.push({ k: key++, type: 'text', value: text.slice(lastIdx) })
  return parts
}
