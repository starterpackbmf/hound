import { supabase } from './supabase'
import { earnByRule } from './free'

// 6 perguntas do diagnóstico do trader
export const QUESTIONS = [
  {
    id: 'q1',
    text: 'Quando você entra numa operação, a primeira coisa que passa pela cabeça é:',
    options: [
      { value: 'a', label: 'Quanto posso ganhar aqui' },
      { value: 'b', label: 'Onde é meu stop e qual o risco' },
      { value: 'c', label: 'Se o setup está dentro do plano' },
      { value: 'd', label: 'Se é hora certa ou se vou me arrepender' },
    ],
    tags: { a: ['ganancia'], b: ['disciplinado'], c: ['disciplinado'], d: ['ansiedade'] },
  },
  {
    id: 'q2',
    text: 'Depois de um stop, o que você costuma fazer?',
    options: [
      { value: 'a', label: 'Tento recuperar imediatamente' },
      { value: 'b', label: 'Paro, respiro e revisito o plano' },
      { value: 'c', label: 'Continuo no ritmo, já esperava' },
      { value: 'd', label: 'Desligo a plataforma até o dia seguinte' },
    ],
    tags: { a: ['vingativo'], b: ['disciplinado'], c: ['consistente'], d: ['averso_risco'] },
  },
  {
    id: 'q3',
    text: 'Seu maior inimigo operacional hoje é:',
    options: [
      { value: 'a', label: 'Impulsividade / clicar sem sinal' },
      { value: 'b', label: 'Segurar loss esperando virar' },
      { value: 'c', label: 'Sair cedo demais do lucro' },
      { value: 'd', label: 'Não operar quando devia' },
    ],
    tags: { a: ['impulsivo'], b: ['averso_loss'], c: ['medo_lucro'], d: ['averso_risco'] },
  },
  {
    id: 'q4',
    text: 'Você segue um plano operacional definido?',
    options: [
      { value: 'a', label: 'Nunca tive um plano formal' },
      { value: 'b', label: 'Tenho mas nem sempre sigo' },
      { value: 'c', label: 'Sigo na maioria dos dias' },
      { value: 'd', label: 'Sigo ritualmente todos os dias' },
    ],
    tags: { a: ['sem_plano'], b: ['indisciplinado'], c: ['disciplinado'], d: ['ritualista'] },
  },
  {
    id: 'q5',
    text: 'Registra seus trades em algum lugar?',
    options: [
      { value: 'a', label: 'Não registro nada' },
      { value: 'b', label: 'Às vezes, quando lembro' },
      { value: 'c', label: 'Tenho planilha mas não analiso' },
      { value: 'd', label: 'Registro e revisito frequentemente' },
    ],
    tags: { a: ['sem_metodo'], b: ['inconstante'], c: ['superficial'], d: ['analitico'] },
  },
  {
    id: 'q6',
    text: 'O que te tirou do sério recentemente no mercado?',
    options: [
      { value: 'a', label: 'Um stop inesperado / virada do ativo' },
      { value: 'b', label: 'Eu mesmo, por quebrar meu plano' },
      { value: 'c', label: 'Perder um movimento que eu previ' },
      { value: 'd', label: 'Nada especialmente, tô estável' },
    ],
    tags: { a: ['externalizador'], b: ['autocritico'], c: ['fomo'], d: ['consistente'] },
  },
]

// Dado um objeto de respostas { q1:'a', q2:'b', ... }, calcula tags + summary
export function computeResult(answers) {
  const tags = new Set()
  for (const q of QUESTIONS) {
    const a = answers[q.id]
    if (a && q.tags[a]) q.tags[a].forEach(t => tags.add(t))
  }
  const tagArr = [...tags]

  let summary = ''
  if (tagArr.includes('impulsivo') || tagArr.includes('vingativo')) {
    summary = 'Você tem momentos de alta impulsividade. Trabalhe pausa pós-stop e checagem do plano antes de cada entrada. '
  } else if (tagArr.includes('medo_lucro') || tagArr.includes('ansiedade')) {
    summary = 'Você opera com ansiedade e tendência a sair cedo do lucro. Foque em alvos mecânicos e permita o trade respirar. '
  } else if (tagArr.includes('disciplinado') || tagArr.includes('ritualista') || tagArr.includes('analitico')) {
    summary = 'Seu perfil é disciplinado e metódico. Aproveite essa base pra refinar leitura e identificar setups de maior assertividade. '
  } else if (tagArr.includes('sem_plano') || tagArr.includes('sem_metodo')) {
    summary = 'Falta estrutura. Prioridade imediata: definir plano operacional escrito + diário diário. '
  } else {
    summary = 'Perfil misto. Leia abaixo as tags identificadas e converse com um monitor pra direcionar próximos passos. '
  }
  return { summary: summary.trim(), tags: tagArr }
}

export async function listDiagnostics() {
  const { data, error } = await supabase
    .from('diagnostics')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveDiagnostic(answers) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { summary, tags } = computeResult(answers)
  const { data, error } = await supabase
    .from('diagnostics')
    .insert({ user_id: user.id, answers, result_summary: summary, result_tags: tags })
    .select().single()
  if (error) throw error
  earnByRule('diagnostic_complete', 'diagnóstico completado').catch(() => {})
  return data
}

// Árvore de dificuldades
export async function listDifficulties() {
  const { data, error } = await supabase
    .from('difficulties')
    .select('*')
    .order('order_index').order('created_at')
  if (error) throw error
  return data || []
}

export async function createDifficulty({ parent_id = null, kind = 'dificuldade', title, notes = null }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('difficulties')
    .insert({ user_id: user.id, parent_id, kind, title, notes })
    .select().single()
  if (error) throw error
  return data
}

export async function updateDifficulty(id, patch) {
  const { error } = await supabase.from('difficulties').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteDifficulty(id) {
  const { error } = await supabase.from('difficulties').delete().eq('id', id)
  if (error) throw error
}

// Monta árvore a partir de flat
export function buildTree(flat) {
  const byId = {}
  const roots = []
  flat.forEach(n => { byId[n.id] = { ...n, children: [] } })
  flat.forEach(n => {
    if (n.parent_id && byId[n.parent_id]) byId[n.parent_id].children.push(byId[n.id])
    else roots.push(byId[n.id])
  })
  return roots
}
