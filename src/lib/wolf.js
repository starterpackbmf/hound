import { supabase } from './supabase'

function mondayOf(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function sundayOf(weekStart) {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

export function currentWeek() {
  const start = mondayOf()
  return { start, end: sundayOf(start) }
}

export async function listMyReports({ limit = 10 } = {}) {
  const { data, error } = await supabase
    .from('weekly_ai_reports')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(limit)
  if (error && error.code !== 'PGRST116') throw error
  return data || []
}

export async function getReportForWeek(weekStart) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('weekly_ai_reports')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function saveReport(report) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('weekly_ai_reports')
    .upsert({ ...report, user_id: user.id }, { onConflict: 'user_id,week_start' })
    .select().single()
  if (error) throw error
  return data
}

// Pipeline: builds input snapshot from real trades + day_summaries + feedbacks
export async function buildInputSnapshot(weekStart, weekEnd) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [tradesRes, daysRes, feedbackRes] = await Promise.all([
    supabase.from('trades').select('*')
      .eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd)
      .order('date'),
    supabase.from('day_summaries').select('*')
      .eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd),
    supabase.from('mentor_feedback').select('*')
      .eq('student_id', user.id).gte('day_date', weekStart).lte('day_date', weekEnd),
  ])

  const trades = tradesRes.data || []
  const days = daysRes.data || []
  const feedbacks = feedbackRes.data || []

  const total = trades.length
  const wins = trades.filter(t => Number(t.resultado_brl) > 0).length
  const losses = trades.filter(t => Number(t.resultado_brl) < 0).length
  const result = trades.reduce((a, t) => a + Number(t.resultado_brl || 0), 0)
  const winRate = total ? (wins / total) * 100 : 0
  const followed = trades.filter(t => t.followed_plan === true).length
  const followedRate = total ? (followed / total) * 100 : 0

  const bySetup = {}
  trades.forEach(t => {
    const s = t.setup
    bySetup[s] = bySetup[s] || { count: 0, result: 0, wins: 0 }
    bySetup[s].count++
    bySetup[s].result += Number(t.resultado_brl || 0)
    if (Number(t.resultado_brl) > 0) bySetup[s].wins++
  })

  const emotionCounts = {}
  trades.forEach(t => (t.emotions || []).forEach(e => {
    emotionCounts[e] = (emotionCounts[e] || 0) + 1
  }))

  return {
    week_start: weekStart,
    week_end: weekEnd,
    total_trades: total,
    wins, losses,
    win_rate: Math.round(winRate * 10) / 10,
    total_result_brl: Math.round(result * 100) / 100,
    followed_plan_rate: Math.round(followedRate * 10) / 10,
    days_operated: new Set(trades.map(t => t.date)).size,
    by_setup: bySetup,
    emotion_counts: emotionCounts,
    day_summaries_count: days.length,
    mentor_feedbacks: feedbacks.map(f => ({ date: f.day_date, tags: f.tags, text: f.feedback })),
    sample_trades: trades.slice(0, 10).map(t => ({
      date: t.date, setup: t.setup, ativo: t.ativo, direction: t.direction,
      result: t.resultado_brl, men: t.men_pts, mep: t.mep_pts,
      emotions: t.emotions, followed_plan: t.followed_plan,
      leitura: (t.leitura_tecnica || '').slice(0, 200),
    })),
  }
}

// Build the prompt sent to Claude (not sending yet — used by /api/wolf)
export function buildPrompt(snapshot) {
  if (!snapshot) return null
  const s = snapshot
  const setupsStr = Object.entries(s.by_setup || {})
    .map(([k, v]) => `${k}: ${v.count} ops · ${v.wins} wins · R$ ${v.result.toFixed(0)}`)
    .join('\n')
  const emotionsStr = Object.entries(s.emotion_counts || {})
    .map(([e, n]) => `${e} (${n}x)`).join(', ')

  const systemMsg = `Você é o W.O.L.F AI, mentor de trading da Matilha. Analisa a semana do aluno com base em dados reais do diário e gera:
1. SUMMARY: resumo da performance semanal em 3-4 frases claras (sem enrolação)
2. TIPS: 3-5 dicas práticas pra próxima semana
3. ACTIONS: 3-5 ações concretas

Tom: direto, técnico, caloroso mas sem drama. Use pt-BR.
Valoriza disciplina sobre resultado. Se o aluno operou pouco, celebra isso se foi por paciência.`

  const userMsg = `Dados da semana ${s.week_start} a ${s.week_end}:

PERFORMANCE:
- Trades: ${s.total_trades} (${s.wins}W/${s.losses}L)
- Win rate: ${s.win_rate}%
- Resultado: R$ ${s.total_result_brl}
- Seguiu plano: ${s.followed_plan_rate}%
- Dias operados: ${s.days_operated}

SETUPS:
${setupsStr || 'nenhum'}

EMOÇÕES REGISTRADAS:
${emotionsStr || 'nenhuma'}

FEEDBACK DO MONITOR NA SEMANA:
${(s.mentor_feedbacks || []).map(f => `- ${f.date} [${(f.tags || []).join(',')}]: ${f.text}`).join('\n') || 'nenhum'}

AMOSTRA DE TRADES:
${JSON.stringify(s.sample_trades, null, 2)}

Retorne no formato JSON:
{
  "summary": "...",
  "tips": ["...", "..."],
  "actions": ["...", "..."]
}`

  return { systemMsg, userMsg }
}

// Generate + save. Calls /api/wolf proxy (hits Claude if ORACULO_ENABLED/WOLF_ENABLED)
export async function generateReport() {
  const { start, end } = currentWeek()
  const snapshot = await buildInputSnapshot(start, end)

  if (!snapshot || snapshot.total_trades === 0) {
    throw new Error('registra ao menos 1 trade na semana pro w.o.l.f analisar')
  }

  const res = await fetch('/api/wolf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshot }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `wolf ${res.status}`)

  const saved = await saveReport({
    week_start: start, week_end: end,
    generated_at: new Date().toISOString(),
    model: data.model || 'stub',
    prompt_version: 'v1',
    input_snapshot: snapshot,
    output_summary: data.summary,
    output_tips: data.tips || [],
    output_actions: data.actions || [],
    cached: false,
  })
  return saved
}
