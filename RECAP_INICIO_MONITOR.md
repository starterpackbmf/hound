# Recap — Início novo + Monitor expandido

## 🏠 Nova tela `/app/inicio`

Refeita do zero com a intenção de ser um **feed de "o que tá rolando"** — igual você pediu: aluno deve ver ao vivo, resultado da sala, seu portfolio de trades, próximos eventos, e redes sociais.

### 5 seções em ordem vertical:

**1. Greeting**
Saudação contextual ("bom dia/boa tarde"), nome, badge MENTORADO/FREE, rank atual, data por extenso.

**2. Live Hero** — **3 estados dinâmicos:**
- 🔴 **AO VIVO AGORA** — se há `live_session` rolando agora: card rosa/roxo pulsante com nome da aula, host, e CTA grande "entrar na sala" apontando pra `/cursos/aulas`
- 🔵 **PRÓXIMA AULA** — se não há live mas tem agendada: countdown em mm:ss ou HH:mm, horário, host, link pra agenda
- ⚫ **QUIET** — se não tem nada agendado: placeholder polido com CTA pra replays
- Em qualquer estado: mostra cardzinho "última aula" ao lado (se houver)

**3. Diário do Mateus Schwartz** (portfolio — gerador de desejo)
- Puxa trades + summary do mês atual via `/api/matilha` (read-only)
- Stats: **Resultado do mês** (R$, colorido verde/vermelho) + **Win rate** + **# trades**
- Lista dos últimos 6 trades: data, setup, ativo, direção, pontos, W/L, resultado R$
- Se aluno é **free**: banner "Quer ver isso ao vivo?" com CTA "virar mentorado"
- Se aluno é **mentorado**: link discreto pro diário dele próprio
- **Config pendente:** precisa definir `VITE_PORTFOLIO_STUDENT_ID` no `.env` com o student_id seu no banco Lovable. Enquanto não setar, a seção mostra aviso amber "aguardando configuração"

**4. Próximos eventos** (sidebar direita)
Cards com date-chip (DIA/MÊS destacado em cyan) + tipo + título + horário. Puxa de `events` table.

**5. Atividade recente** (2 colunas)
- **Comunidade** (roxo): últimos 4 posts — categoria + snippet do body
- **Redes do Mateus** (amber): últimos 3 `social_posts` — plataforma colorida + título

### Glass morph aplicado
Cards com gradient-radial + border semitransparente + backdrop. Cores por seção:
- Hero live: rosa/roxo
- Hero próxima: cyan
- Portfolio: roxo
- Eventos: cyan
- Comunidade: roxo
- Redes: amber

### Responsive
< 900px: grades viram coluna única.

---

## 🧑‍🏫 Monitor — 2 rotas novas do Lovable audit

### `/mentor/solicitacoes`
Gestão de acesso. Tabs **Pendentes / Aprovados / Recusados / Bloqueados**. Para cada aluno:
- Avatar, nome, email, whatsapp (link pro wa.me), data de cadastro
- Ações por estado: **aprovar** (status → ativo) / **recusar** (→ cancelado) / **bloquear** (→ bloqueado) / **reativar** / **voltar pra pendente**

Resolve o GAP #9 da LOVABLE_AUDIT.md.

### `/mentor/resgates`
Pack Store — aprovar entregas físicas. Tabs **Pendente / Entregue / Cancelado**. Para cada pedido:
- Ícone/imagem do item, nome, custo em SC
- Nome/avatar do aluno, data do pedido
- Shipping info (endereço, tamanho, etc) se o aluno preencheu
- Notes se cancelado
- Ações: **marcar entregue** (registra who+when) / **cancelar** (com prompt de motivo)

Resolve o GAP #8 da LOVABLE_AUDIT.md.

### Sidebar do monitor
Atualizada com os 2 itens novos:
- ✓ solicitações (ícone check)
- ★ resgates (ícone star)

---

## 🎥 Zoom — polimento do fluxo

Atualizei `api/zoom/go.js` e `proxy.js` pra:
- Tentar abrir o **Zoom Desktop** direto via `zoommtg://` URL scheme (aluno nem vê URL)
- Se em 1.5s não abriu (sem app instalado), redireciona pro **Zoom Web Client** direto (`zoom.us/wc/join/...`) — **pula** aquela tela intermediária chata "Entrar na reunião"
- Mostra uma tela de transição estilizada com spinner + "Entrando no ao vivo..."

---

## 📋 Pra você quando voltar

### 1. Configurar seu `student_id` no portfólio
Pra o "Diário do Mateus Schwartz" funcionar, precisa:
1. Pegar seu `student_id` no banco Lovable (pode ser via API `/api/matilha?resource=students` e identificar pelo nome, ou direto no Supabase do Lovable)
2. Adicionar no `.env`:
   ```
   VITE_PORTFOLIO_STUDENT_ID=<seu-uuid-aqui>
   ```
3. Reinicia o `npm run dev` (local) ou faz commit+push pra prod

Se não configurar, a seção aparece com aviso "⚙ aguardando configuração". Resto do Início funciona normal.

### 2. Cadastrar eventos
A seção "Próximos eventos" fica vazia até você criar eventos em `events` via `/mentor/aulas/nova` (pra ao vivo) ou direto no Supabase. Schema já existe.

### 3. Cadastrar social_posts
A seção "Redes do Mateus" fica vazia até popular a tabela `social_posts`. Pode ser manual via SQL Editor ou a gente pode criar uma UI de admin depois.

---

## Status

- ✅ `/app/inicio` redesenhada com 5 seções
- ✅ `/mentor/solicitacoes` criada
- ✅ `/mentor/resgates` criada
- ✅ Sidebar do monitor atualizada
- ✅ Zoom flow polido (pula tela intermediária + tenta app nativo)
- ✅ Build passa, tudo commitado (`feaadb7`) e pushed pra main
- ⏳ Você precisa configurar `VITE_PORTFOLIO_STUDENT_ID` pra ver os trades
- ⏳ Vercel tá rebuildando — deploy deve estar pronto em ~1min

Até.
