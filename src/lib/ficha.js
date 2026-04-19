import { supabase } from './supabase'

export async function getMyFicha() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('ficha_acompanhamento')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveFicha(patch) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const payload = { ...patch, user_id: user.id }
  const { data, error } = await supabase
    .from('ficha_acompanhamento')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export function countSectionsFilled(f) {
  if (!f) return 0
  let n = 0

  // 1. Dados pessoais
  if (f.nome_completo || f.prefere_ser_chamado || f.whatsapp) n++

  // 2. Experiência
  if (f.tempo_mercado || f.ativo_principal || f.media_ops_dia) n++

  // 3. Raio-X comportamental
  const behFields = ['aceita_stop_tecnico','entra_antes_gatilho','entra_por_comentario','afasta_stop','aumenta_posicao_apos_loss','registra_erros_no_diario']
  if (behFields.some(k => f[k])) n++

  // 4. Dificuldades
  if (f.dificuldades?.length > 0) n++

  // 5. Objetivos
  if (f.objetivo || f.mensagem_monitor) n++

  return n
}

export const TEMPO_MERCADO_OPTIONS = [
  { value: 'menos_6m', label: 'Menos de 6 meses' },
  { value: '6m_1a',    label: '6 meses a 1 ano' },
  { value: '1_2a',     label: '1 a 2 anos' },
  { value: 'mais_2a',  label: 'Mais de 2 anos' },
]

export const ATIVO_OPTIONS = [
  { value: 'WIN',   label: 'WIN (Índice)' },
  { value: 'WDO',   label: 'WDO (Dólar)' },
  { value: 'AMBOS', label: 'Ambos' },
]

export const OPS_DAY_OPTIONS = [
  { value: '1_3',     label: '1 a 3' },
  { value: '4_6',     label: '4 a 6' },
  { value: '7_10',    label: '7 a 10' },
  { value: 'mais_10', label: 'Mais de 10' },
]

export const BEHAVIOR_OPTIONS = [
  { value: 'nunca',          label: '✅ Nunca faço isso', tone: 'up' },
  { value: 'as_vezes',       label: '⚠️ Às vezes acontece', tone: 'warn' },
  { value: 'com_frequencia', label: '❌ Faço com frequência', tone: 'down' },
]

export const DIFICULDADES_OPTIONS = [
  'Controle emocional',
  'Gestão de risco',
  'Leitura de mercado',
  'Disciplina operacional',
  'Aceitar perdas',
  'Seguir plano',
  'Overtrading',
  'Ansiedade antes de clicar',
  'Medo de perder lucro',
  'Pressa de recuperar',
]
