// Vercel serverless — POST /api/oraculo
// Chat com o Oráculo (RAG sobre o conteúdo da mentoria).
//
// Body: { conversationId, messages: [{role, content}, ...] }
// Resposta (stream SSE): data: {"type":"token","text":"..."}\n\n
//
// ATENÇÃO: quando ORACULO_ENABLED=true, chama Claude API. Consome créditos.
// Enquanto está false, retorna respostas stub pra UI funcionar sem custo.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const body = req.body || {}
  const messages = body.messages || []
  const userMsg = messages[messages.length - 1]?.content || ''

  const enabled = process.env.ORACULO_ENABLED === 'true'

  if (!enabled) {
    // Modo stub — responde sem chamar Claude
    return res.status(200).json({
      role: 'assistant',
      content: oraculoStub(userMsg),
      sources: [],
      _mode: 'stub',
    })
  }

  // Modo real (a ser implementado):
  // 1. Gerar embedding da pergunta (Voyage AI ou outro)
  // 2. Buscar chunks similares via oraculo_match_chunks
  // 3. Montar contexto RAG e mandar pra Claude
  // 4. Stream da resposta de volta
  return res.status(501).json({
    error: 'not implemented — RAG pipeline em construção. Defina ORACULO_ENABLED=false pra usar o modo stub.',
  })
}

function oraculoStub(question) {
  const q = (question || '').toLowerCase().trim()
  if (!q) return '⚠ Oráculo em modo stub — envie uma pergunta.'

  const fixtures = [
    { keys: ['fq', 'fibo quebra', 'fibonacci quebra'], r: 'O **FQ** (Fibo Quebra) é uma das 4 estratégias base do Tradesystem. Opera em pullbacks na retração de Fibonacci quando há quebra de nível relevante. Filtros: VWAP alinhada, volume confirmatório. Alvos: expansão de Fibo 161.8%.\n\n_(modo stub — RAG real virá quando ORACULO_ENABLED=true)_' },
    { keys: ['trm'], r: 'O **TRM** é uma das 4 estratégias do Tradesystem — Tendência com Retração na Média. Busca pullbacks nas médias móveis durante tendência primária clara.\n\n_(modo stub)_' },
    { keys: ['tc', 'tendencia consolidada'], r: 'O **TC** (Tendência Consolidada) é a estratégia que busca continuação de tendência após consolidação lateral. Tem regras específicas de filtro por VWAP e volume.\n\n_(modo stub)_' },
    { keys: ['ta', 'tendencia acumulada'], r: 'O **TA** (Tendência Acumulada) — estratégia que busca pontos de reversão dentro de tendências estabelecidas, combinando Fibo + médias + volume.\n\n_(modo stub)_' },
    { keys: ['vwap'], r: 'A **VWAP** (Volume-Weighted Average Price) é um dos indicadores centrais do Tradesystem. Usada pra identificar fair value intraday e alinhar viés direcional.\n\n_(modo stub)_' },
    { keys: ['gerenciamento', 'risco', 'stop'], r: 'O gerenciamento starter usa stops diários, mensais e por trade. A regra do "melhor de 3" e "melhor de 5" protege de revenge trading.\n\n_(modo stub)_' },
  ]

  for (const f of fixtures) {
    if (f.keys.some(k => q.includes(k))) return f.r
  }

  return `🟡 **Oráculo em modo stub** — a pipeline RAG não está ativa ainda.\n\nQuando o Mateus ativar (${'`ORACULO_ENABLED=true`'}), vou responder usando:\n- todas as aulas transcritas do Tradesystem\n- mapas mentais e PDFs\n- slides e material extra\n\nSua pergunta: "_${question}_"\n\nExperimente perguntar sobre: FQ, TRM, TC, TA, VWAP, gerenciamento de risco.`
}
