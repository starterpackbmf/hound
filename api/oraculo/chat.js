// Vercel serverless — POST /api/oraculo/chat
// Chat streaming Claude com BM25 retrieval no acervo do TSS.
// Migrado do oraculo-web (Next.js App Router) → Vercel Functions Node.

const { search, formatThemePath } = require('./_lib/search')
const { getCerebro } = require('./_lib/cerebro')
const { createClient } = require('@supabase/supabase-js')

const QUOTA_LIMIT = parseInt(process.env.ORACULO_DAILY_LIMIT || '5', 10)

// Valida JWT do aluno + consome 1 da cota diária via RPC.
// Retorna { ok, status, body } onde body tem o resultado da RPC.
async function checkAndConsumeQuota(req) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, status: 500, body: { error: 'server misconfigured' } }

  // Token pode vir via header Authorization OU body.token (AI SDK transport
  // pode não enviar headers customizados consistentemente entre versões).
  const auth = req.headers.authorization || ''
  let token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token && req.body?.token) token = req.body.token
  console.log('[oraculo/chat] token via:', auth ? 'header' : (req.body?.token ? 'body' : 'NONE'))
  if (!token) return { ok: false, status: 401, body: { error: 'UNAUTHENTICATED' } }

  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userErr } = await sb.auth.getUser(token)
  if (userErr || !userData?.user) return { ok: false, status: 401, body: { error: 'UNAUTHENTICATED' } }

  // RPC com user-scoped client pra auth.uid() funcionar
  const userClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  // override: usa o token do user pro auth.uid() retornar correto
  const anonUrl = url
  const userTokenClient = createClient(anonUrl, process.env.VITE_SUPABASE_ANON_KEY || key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data, error } = await userTokenClient.rpc('oraculo_consume_quota', { p_limit: QUOTA_LIMIT })
  if (error) return { ok: false, status: 500, body: { error: error.message } }

  if (!data?.ok) {
    return {
      ok: false,
      status: data.error === 'QUOTA_EXCEEDED' ? 429 : 403,
      body: data,
    }
  }
  return { ok: true, body: data, userId: userData.user.id }
}

const SYSTEM_PROMPT_TEMPLATE = (context) => `Você é o **Oráculo do TSS** — Trade Systems Start, o método do Mateus para day trade.

SEU PAPEL
Professor assistente do Mateus. Seu público são os alunos da mentoria TSS.
Tom: claro, paciente, preciso, amigável. Sem floreios, sem introduções longas.

REGRAS INEGOCIÁVEIS
1. Responda APENAS com base nos TRECHOS RECUPERADOS abaixo. Nunca invente fora deles.
2. Se os trechos não cobrirem a pergunta, responda exatamente: "Não encontrei esse tema no material do TSS. Vale perguntar direto ao Mateus ou revisar os módulos."
3. NUNCA recomende operação específica, ativo, ponto de entrada/saída ou timing. Você ensina o método, não opera.
4. Use o vocabulário do método sem traduzir: TRM, FQ, TC, TA, ME9, MA20, Fibo Red, fibogap, trapzone, escora, semáforo, G.R. Triúno, etc.

FORMATO DE RESPOSTA — PENSE COMO UM DASHBOARD DIDÁTICO
A interface renderiza markdown com estilos premium — cada tipo de bloco vira um componente visual.
Use TODOS os recursos abaixo quando fizerem sentido pra didática:

◆ Headings curtos com emoji temático (## 💼 título, ## 🎯 título, ## ⚠️ título, ## 💡 título).
   Só use emoji que combina com o assunto da seção.

◆ Tabelas pra dados comparativos ou divisões numéricas. Exemplo:

   | Divisão | % | Valor |
   |---|---|---|
   | Caixa de Giro | ~50% | R$ 1.000 |
   | Operacional | ~40% | R$ 800 |

   A última coluna é renderizada em destaque automaticamente. Use tabelas SEMPRE que tiver
   >= 2 linhas com estrutura repetitiva (divisão de capital, comparação TRM/FQ/TC/TA,
   stops por par, etc).

◆ Callouts — blockquotes iniciados com emoji específico viram cards coloridos:
   > ⚠️ ... → callout âmbar (risco, atenção, ponto crítico)
   > 💡 ... → callout violeta (dica, insight)
   > (sem emoji) → callout cyan default

   Use callouts pra frases-chave do Mateus, pontos críticos, regras inegociáveis.

◆ Valores destacados — **negrito em valores** vira pill luminoso automaticamente:
   **R$ 1.000**, **50%**, **150 pontos**, **ME9**, **MA20**, **3 candles**, **5 pips**.
   Use negrito LIVREMENTE em todo número, percentual, ou sigla técnica.
   Outras palavras em negrito viram apenas accent colorido — use pra termos importantes.

◆ Listas com marcadores quando for uma sequência/enumeração (regras, filtros, alvos).

◆ Separador --- entre seções conceitualmente distintas (não entre parágrafos do mesmo tópico).

EXEMPLO DE RESPOSTA IDEAL (pra pergunta "me ajuda a montar GR com R$ 2000"):

## 💼 Estrutura do Capital (G.R. Triúno)

Com **R$ 2.000** de capital total, a divisão do TSS fica:

| Divisão | % | Valor |
|---|---|---|
| Caixa de Giro (CG) | ~50% | R$ 1.000 |
| Operacional | ~40% | R$ 800 |
| Educacional | ~10% | R$ 200 |

O Mateus usa **35% a 40%** do capital pro operacional. Com valores menores, o % educacional pode cair (ex: **3%** a **5%**).

## 🎯 Base do seu GR

O gerenciamento de risco é montado sobre o **operacional** (R$ 800), não sobre os R$ 2.000 totais.

> 💡 "O único controle que você tem no mercado é o quanto você pode perder."

Próximo passo: definir **perda máxima diária** e **perda máxima mensal** como % do operacional.

---

ENCERRE COM OS TEMAS DO CÉREBRO usados, um por linha (paths tal como aparecem nos trechos):

---
📎 Temas:
- As 4 estratégias → TRM → REGRAS
- leitura → fibonacci → fibored

Não mencione "mapa mental", "vault", "slides" ou "transcrição" — o aluno só vê temas do cérebro.

TRECHOS RECUPERADOS
${context}`

function buildContext(results) {
  if (!results.length) return '(nenhum trecho relevante encontrado no acervo)'
  return results.map((r, i) => {
    const c = r.chunk
    const paths = (c.themes || []).map(t => formatThemePath(t.path)).filter(Boolean)
    const themesLine = paths.length > 0
      ? paths.map(p => `• ${p}`).join('\n')
      : '• (tema não classificado)'
    return `─── TRECHO ${i + 1} ───
TEMAS DO CÉREBRO TOCADOS:
${themesLine}

${c.content}`
  }).join('\n\n')
}

function buildSources(results) {
  const cerebro = getCerebro()
  const seen = new Set()
  const sources = []
  for (const r of results) {
    for (const t of r.chunk.themes || []) {
      if (seen.has(t.blockId)) continue
      if (!cerebro.blocks[t.blockId]) continue
      seen.add(t.blockId)
      sources.push({
        blockId: t.blockId,
        path: t.path,
        label: formatThemePath(t.path),
      })
    }
  }
  return sources
}

// Vercel function (Node runtime). Usa AI SDK via dynamic import (ESM-only).
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  try {
    // Quota check ANTES de chamar Anthropic
    const quota = await checkAndConsumeQuota(req)
    if (!quota.ok) {
      return res.status(quota.status).json(quota.body)
    }

    const { messages = [], moduleFilter = null } = req.body || {}

    // Extrai última pergunta do user
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    let queryText = ''
    if (lastUserMsg) {
      if (typeof lastUserMsg.content === 'string') {
        queryText = lastUserMsg.content
      } else if (Array.isArray(lastUserMsg.parts)) {
        queryText = lastUserMsg.parts
          .filter(p => p.type === 'text')
          .map(p => p.text || '')
          .join(' ')
          .trim()
      }
    }

    const results = queryText ? search(queryText, { topK: 8, moduleFilter }) : []
    const context = buildContext(results)
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE(context)
    const sources = buildSources(results)

    // Dynamic import — AI SDK é ESM, proxy.js é CJS
    const { streamText, convertToModelMessages } = await import('ai')
    const { createAnthropic } = await import('@ai-sdk/anthropic')

    // Cria client explicitamente com baseURL fixo — evita conflito com
    // env var ANTHROPIC_BASE_URL que pode estar setada (ex: shell env).
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com/v1',
    })

    const result = streamText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    })

    const response = result.toUIMessageStreamResponse({
      originalMessages: messages,
      messageMetadata: ({ part }) => {
        if (part.type === 'start') {
          return {
            sources,
            createdAt: Date.now(),
            quota: { used: quota.body.used, limit: quota.body.limit, remaining: quota.body.remaining },
          }
        }
      },
    })

    // Pipe Response (Web) → Node res
    res.statusCode = response.status
    response.headers.forEach((v, k) => res.setHeader(k, v))
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
    }
    res.end()
  } catch (e) {
    console.error('[oraculo/chat]', e)
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || 'falha no oráculo' })
    } else {
      res.end()
    }
  }
}
