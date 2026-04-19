// Vercel serverless — POST /api/wolf
// Gera resumo semanal via Claude API com base no snapshot do diário.
//
// Body: { snapshot: {...} }
// Resposta: { summary, tips, actions, model }
//
// Só chama Claude se WOLF_ENABLED=true. Caso contrário retorna stub heurístico.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const snapshot = req.body?.snapshot
  if (!snapshot) return res.status(400).json({ error: 'missing snapshot' })

  const enabled = process.env.WOLF_ENABLED === 'true'
  if (!enabled) {
    return res.status(200).json({ ...stubResponse(snapshot), model: 'stub', _mode: 'stub' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY missing' })

  try {
    const { systemMsg, userMsg } = buildPrompts(snapshot)

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemMsg,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })

    const j = await resp.json()
    if (!resp.ok) {
      return res.status(502).json({ error: j.error?.message || 'claude error', raw: j })
    }

    // Extract JSON from response
    const text = j.content?.[0]?.text || ''
    const match = text.match(/\{[\s\S]+\}/)
    if (!match) return res.status(502).json({ error: 'claude returned non-JSON', raw: text })
    try {
      const parsed = JSON.parse(match[0])
      return res.status(200).json({
        summary: parsed.summary || '',
        tips: parsed.tips || [],
        actions: parsed.actions || [],
        model: j.model || 'claude-sonnet-4-6',
      })
    } catch (e) {
      return res.status(502).json({ error: 'json parse failed: ' + e.message, raw: text })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function buildPrompts(s) {
  const setupsStr = Object.entries(s.by_setup || {})
    .map(([k, v]) => `${k}: ${v.count} ops · ${v.wins} wins · R$ ${v.result.toFixed(0)}`)
    .join('\n')
  const emotionsStr = Object.entries(s.emotion_counts || {})
    .map(([e, n]) => `${e} (${n}x)`).join(', ')

  const systemMsg = `Você é o W.O.L.F AI, mentor de trading da Matilha. Analisa a semana do aluno com base em dados reais do diário e gera: 1) summary (3-4 frases claras), 2) tips (3-5 dicas práticas), 3) actions (3-5 ações concretas). Tom: direto, técnico, pt-BR. Valoriza disciplina sobre resultado. Retorne APENAS JSON válido no formato { "summary": "...", "tips": ["..."], "actions": ["..."] }.`

  const userMsg = `Dados da semana ${s.week_start} a ${s.week_end}:

PERFORMANCE:
- Trades: ${s.total_trades} (${s.wins}W/${s.losses}L)
- Win rate: ${s.win_rate}%
- Resultado: R$ ${s.total_result_brl}
- Seguiu plano: ${s.followed_plan_rate}%
- Dias operados: ${s.days_operated}

SETUPS:
${setupsStr || 'nenhum'}

EMOÇÕES:
${emotionsStr || 'nenhuma'}

FEEDBACK DO MONITOR:
${(s.mentor_feedbacks || []).map(f => `- ${f.date} [${(f.tags || []).join(',')}]: ${f.text}`).join('\n') || 'nenhum'}

AMOSTRA DE TRADES (JSON):
${JSON.stringify((s.sample_trades || []).slice(0, 5), null, 2)}

Retorne SÓ o JSON pedido.`

  return { systemMsg, userMsg }
}

// Heurístico quando WOLF_ENABLED é false
function stubResponse(s) {
  const pos = s.total_result_brl > 0
  const disciplined = s.followed_plan_rate >= 80
  const lowTrades = s.total_trades < 5

  let summary = ''
  if (lowTrades) {
    summary = `Semana de pouca atividade — ${s.total_trades} trades. ${disciplined ? 'Boa: filtragem funcionou.' : 'Revise o que bloqueou.'} ${pos ? 'Resultado positivo.' : 'Resultado negativo.'} Win rate ${s.win_rate}% e disciplina ${s.followed_plan_rate}%.`
  } else if (pos && disciplined) {
    summary = `Semana consistente: ${s.total_trades} trades, ${s.win_rate}% de acerto, +R$${s.total_result_brl}. Disciplina em ${s.followed_plan_rate}% — essa é a base. Continue.`
  } else if (pos && !disciplined) {
    summary = `Resultado positivo (+R$${s.total_result_brl}) mas disciplina em ${s.followed_plan_rate}%. Atenção: dinheiro pode ter vindo apesar do plano, não graças a ele. Revisita processos.`
  } else if (!pos && disciplined) {
    summary = `Resultado negativo (R$${s.total_result_brl}) mas disciplina alta (${s.followed_plan_rate}%). Isso é bom sinal operacional — mercado nem sempre recompensa processo correto na mesma semana. Confia.`
  } else {
    summary = `Semana difícil: R$${s.total_result_brl} resultado e ${s.followed_plan_rate}% disciplina. Foco agora é voltar ao plano, não recuperar.`
  }

  const tips = []
  if (s.followed_plan_rate < 70) tips.push('Foco #1: seguir o plano. Antes de cada clique, relê a regra do setup.')
  if (s.days_operated > 4) tips.push('Operando 5+ dias/semana — cuidado com fadiga. Teste 1 dia de pausa forçada.')
  const worstSetup = Object.entries(s.by_setup || {}).sort((a, b) => a[1].result - b[1].result)[0]
  if (worstSetup && worstSetup[1].result < 0) tips.push(`Setup ${worstSetup[0]} tá no vermelho (R$${worstSetup[1].result.toFixed(0)}). Revisa ou para.`)
  if (s.emotion_counts?.Impulsivo > 2) tips.push('Impulsivo em várias entradas. Cronometra 30s entre ver o gatilho e clicar.')
  if (s.emotion_counts?.Vingativo > 1) tips.push('Vingativo aparece após loss. Regra: 1 loss = 5min de pausa obrigatória.')
  while (tips.length < 3) tips.push('Registra todos os trades, mesmo os que não pegou — ausência também é info.')

  const actions = []
  if (s.total_trades > 0) actions.push(`Revisita os ${Math.min(3, s.total_trades)} trades da semana e nota 1 coisa a mudar em cada.`)
  actions.push('Escreve 3 linhas no diário sobre como quer começar a próxima segunda-feira.')
  if (s.followed_plan_rate < 90) actions.push('Imprime o plano operacional e cola na mesa.')
  if (!disciplined) actions.push('Semana 100% simulada se não voltar a >80% de disciplina até quarta.')
  while (actions.length < 3) actions.push('Marcar sessão com monitor pra discutir próximos passos.')

  return { summary, tips: tips.slice(0, 5), actions: actions.slice(0, 5) }
}
