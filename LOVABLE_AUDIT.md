# Auditoria do App da Matilha no Lovable

Exploração feita dia 18/abr/26 com acesso admin+monitor+aluno.
Documento focado em **o que existe lá que ainda não existe no nosso**, com decisões de porting.

---

## 📐 Arquitetura: dois lados no mesmo app

O Lovable tem **dois layouts distintos** dentro da mesma URL, trocados via role:
- **Visão do Aluno** (`/jornada`, `/diario`, etc.) — 12 rotas
- **Visão do Monitor** (`/mentor/*`) — 10 rotas
- Botão "**Trocar para Monitor**" na sidebar do aluno troca entre layouts

No nosso app atual, misturamos tudo em `/app/*` — precisamos separar ou trocar a visão pelo role.

---

## 🎭 Sistema de Ranks (CORRIGIDO)

O enum que eu usei (`primeiro_instinto/predador/alfa/imortal`) **está errado**. O real tem **6 níveis** com thresholds em R$:

| Nível              | Threshold       |
|--------------------|-----------------|
| Primeiro Instinto  | Início          |
| Predador           | R$ 1.000        |
| Aprendiz de Caçador| R$ 5.000        |
| Caçador            | R$ 10.000       |
| Killer             | R$ 20.000       |
| Alpha              | R$ 50.000       |

O critério é **resultado financeiro acumulado**. Subir de rank dá **+100 SC**.

**Ação:** Atualizar `user_badge` enum na migration 0001 + RankBadge component.

---

## 💰 Sistema de StarterCoins (SC) — regras reais

No meu `0005_free.sql` inventei algumas regras. Aqui o real:

**Operacional:**
- Registrar trade → **+3 SC** (por trade)
- Finalizar dia → **+5 SC** (por dia, ao preencher resumo diário)

**Comunidade:**
- Atividade (post/comentário) → **+10 SC** (1x/dia)

**Consistência:**
- Semana positiva → **+30 SC** (fechar semana positiva)
- Streak 5 dias no plano → **+20 SC** (5 dias operados seguindo plano)

**Conquistas:**
- Subir de rank → **+100 SC**
- Desafios semanais (definidos pelo mentor) → variável

**Diagnóstico do Trader completado:** **+10 SC**

**Ação:** Atualizar o RPC `coins_earn` com essas action_keys exatas.

---

## 🐺 Área do ALUNO (12 rotas)

### 1. `/jornada` — Evolução
Dashboard pessoal. Métricas do período (filtráveis 7d/14d/30d/90d/180d/1a/tudo):
- Resultado total, Win rate, Dias operados, Max Drawdown
- **Espelho de Padrões** (gráfico)
- **Métricas por Estratégia** (cards TA/TC/TRM/FQ): pontos, R$, assertividade %, ops count, /op
- **Métricas Complementares**: Média vencedora, Média perdedora, Risco x Retorno
- Filtro por ativo: Todos/Índice/Dólar
- Seletor de "Conta" (Principal, secundárias...)
- Banner: "🐺 Novo Resumo Semanal Disponível!" (quando há)

### 2. `/jornada-matilha` — Minha Jornada (4 abas)
- **🐺 Matilha** — caminho da evolução entre os 6 ranks com progress bar até o próximo
- **🎯 Metas** — 3 buckets: Curto / Médio / Longo Prazo (CRUD)
- **🌳 Dificuldades** — árvore mapeando dificuldades + causas + soluções (tipo mind map)
- **🩺 Diagnóstico** — quiz de 6 perguntas que identifica padrões operacionais (ganha +10 SC)

### 3. `/diario` — Diário de Trade (lista)
- Seletor de Conta + Data
- Botão "Registrar" → vai pra `/novo-trade?date=...`
- Botão "Não cliquei hoje" (alternativa quando não operou)

### 4. `/novo-trade` — Formulário de trade (GIGANTE, V3.0)
Campos:
- Data + Horário entrada/saída
- **Ativo** (dropdown) + **Setup** (TA/TC/TRM/FQ) + **Direção** (Compra/Venda)
- **Contratos iniciais**
- **MEN** (Calor, em pts) — max exposição negativa
- **MEP** (Favor, em pts) — max exposição positiva
- **Saídas Parciais** (lista adicionável) + **Saldo em Aberto**
- **Encerramento final** (pts) → calcula Média Ponderada + Resultado R$
- **Estado Emocional** (máx 3 de 12): Confiante, Calmo, Focado, Neutro, Cauteloso, Atento, Paciente, Ansioso, Irritado, Impulsivo, Vingativo, Com medo
- **Leitura Técnica** (texto)
- **Print da Operação** (upload até 5MB JPG/PNG/WebP ou URL)

### 5. `/historico` — Histórico mensal
Calendário mensal mostrando por dia: trades count, W/L, pontos, média por dia.
Filtro por ativo: WIN / WDO / Todos.

### 6. `/raioxrp` — Raio-X RP
*(Não acessível nessa conta — gated por outro role/tier).*

### 7. `/aulas` — Catálogo de aulas
Layout de **carrosséis horizontais** por categoria:
- Trading Lab (9 cursos)
- Triângulo da Consistência (3 cursos)
- Replays (1 curso)

Clicar em curso → `/aulas/curso/:id` (detalhe com lista numerada de aulas + botões Material PDF / Mapa Mental).

Clicar em aula → `/aulas/:id` (player + descrição + data + **comentários** + botão "Próxima aula").

**Diferença do nosso:** deles usa 3 níveis (Carrossel → Curso → Aula). O nosso tem (Course → Module → Lesson). Equivalência:
- Nosso `courses` = Lovable `Carrossel`
- Nosso `modules` = Lovable `Curso`
- Nosso `lessons` (do Panda) = Lovable `Aula`

### 8. `/resumo-semanal` — W.O.L.F AI
IA que gera resumo semanal da performance.
- Nome: **W.O.L.F AI** (mentor de trading com IA)
- Gerado automaticamente **sextas às 17h**
- Só gera se registrou ≥1 trade na semana
- Aba "Histórico" com resumos anteriores
- **Isso é o nosso Oráculo**, mas com geração automática (não chat reativo)

### 9. `/agendar` — Acompanhamento (monitoria)
Calendário de horários disponíveis dos monitores. Aluno clica pra solicitar.
Tab "Minhas Sessões" com histórico de agendamentos.

### 10. `/plano-execucao` — Plano de Execução
Página onde aparece o plano operacional definido pelo mentor (stops, tamanhos, horários, regras). Hoje vazio pra essa conta.

### 11. `/comunidade` — Feed da matilha
**Twitter/Instagram-like, NÃO um fórum tradicional.**
- Botão "Publicar"
- Categorias: 📝 Relato, 📊 Trade, 🆘 Dificuldade, 📖 Leitura, 💬 Geral
- Lista vertical de posts: avatar, nome, **rank badge**, "Monitor" tag (se monitor), categoria, tempo relativo, texto, curtidas
- Posts curtos (1-3 linhas típicas)
- Regras da comunidade no topo
- Alta atividade real (dezenas de posts/dia)

**Nosso fórum atual é treaded (como Reddit).** Precisa refatorar pra feed-style.

### 12. `/pack-store` — Loja
Lista de items com imagem, nome, descrição, preço em SC, botão comprar.
Botão "Como pontuar?" abre modal com regras (ver seção anterior).

### 13. `/minha-ficha` — Onboarding profundo
Formulário de 5 seções pro monitor conhecer o aluno:
1. **Dados Pessoais** (nome, apelido, WhatsApp, cidade/estado, idade)
2. **Experiência no Mercado** (tempo, ativo principal, média ops/dia, mentoria prévia)
3. **Raio-X Comportamental** — 3 subseções (Disciplina Técnica, Controle Emocional, Evolução) com perguntas tipo ✅ Nunca / ⚠️ Às vezes / ❌ Com frequência
4. **Dificuldades Percebidas** (multi-select de 10 opções)
5. **Objetivos** (texto livre + mensagem pro monitor)

Barra de progresso "X de 5 seções" preenchidas.

---

## 🧑‍🏫 Área do MONITOR (10 rotas)

### 1. `/mentor/agenda` — Minha agenda (monitor)
Calendário pessoal de slots de monitoria. Botão "Abrir Horários".

### 2. `/mentor/visao-geral` — Painel de Comando
**O dashboard mais importante do monitor.**
- Filtros: período (7d/14d/30d/90d/180d/1a/tudo), ativo (Todos/WIN/WDO), alerta (Todos/Críticos/Piorando/MEN Estourado/Fora do Plano)
- **Prioridade de Intervenção** — top 5 alunos críticos com:
  - Nome, Nível, Status (CRITICO)
  - N violações de MEN
  - Score %
  - Tendência (Piorando/Melhorando/Estável)
  - Botões: **WhatsApp** + **Relatório**
- **Visão Geral do Período**: contadores Críticos/Instáveis/Estruturados + Piorando/Melhorando
- Lista de **todos os alunos** com mini-card (nome, level, trades, status, R$, score%, MEN atual/limite, delta%, ícone trend)

### 3. `/mentor/alunos` — Lista completa (140 alunos)
Filtros: período, resultado (Positivos/Zero/Negativos), status (Critico/Atencao/Estavel/Cons./Inativo), rank (🐺 todos os 6 ranks).
Card por aluno: Nome, Nível, Status, R$, **Disciplina %**, MEN pts, Trades, **SC** (moedas).

### 4. `/mentor/agenda-geral` — Agenda de todos monitores
Semana/mês. Cada slot: monitor + horário + status (Disponível / Bloqueado / Reservado / Solicitado / Concluído) + aluno se aplicável.

### 5. `/mentor/agenda-mensal` — Visão mensal
Grid do mês com counts "N livres / N ocupados" por dia.

### 6. `/mentor/relatorio-mensal` — Relatório consolidado da turma
- Turma positiva X% vs negativa Y% + Resultado total + Média/aluno
- **Top 5 melhores** + **Top 5 piores** (com toggle ocultar nomes)
- Evolução: Melhoraram/Pioraram + migrações Neg→Pos e Pos→Neg + Evolução média da turma
- Disciplina: Seguiram plano %, Com violação MEN %, Média violações, Disciplinados (>80%)
- Operacional: Taxa de acerto, Payoff, **MEN/MEP ratio**, Expectativa (R)
- Setup mais lucrativo / mais problemático

### 7. `/mentor/conteudos` — CMS de conteúdo
3 abas:
- **Carrosséis** (3 ativos: Trading Lab, Triângulo, Replays)
- **Cursos** (13 cursos total)
- **Aulas** (vídeos individuais)

Drag & drop pra reordenar. Criar/editar/ativar/desativar.

### 8. `/mentor/pack-store` — CMS da loja
Admin dos items com imagem/nome/descrição/preço/status.

### 9. `/mentor/resgates` — Pedidos de resgate
Alunos que compraram item: Nome, Item, Custo SC, Data, Status (Pendente/Entregue).

### 10. `/mentor/solicitacoes` — Solicitações de acesso
Alunos novos aguardando aprovação. Botões Aprovar/Recusar.

---

## 🔑 Métricas novas que não tinha mapeado

| Métrica | Significado |
|---|---|
| **MEN** | Máxima Exposição Negativa (em pontos, "calor" contra o trader) |
| **MEP** | Máxima Exposição Positiva (em pontos, "favor") |
| **MEN/MEP ratio** | Quão mais perdeu que ganhou em momentos extremos |
| **Score %** | Nota operacional (fórmula desconhecida — achei 75% default, não varia muito visualmente) |
| **Disciplina %** | Quantos trades seguiram o plano (melhor nome que "followed_plan_rate") |
| **Violações de MEN** | Quantas vezes estourou o limite diário de MEN |
| **Expectativa (R)** | Expectancy em R multiples (e.g. +0.16R) |
| **Payoff médio** | Razão ganho médio / perda média |
| **SC** | StarterCoins (moeda interna) |
| **Streak** | Dias consecutivos seguindo o plano |

---

## 📋 Setups operacionais (CORRIGIDOS)

| Código | Nome completo |
|---|---|
| **T.A** | Trade de Abertura |
| **T.C** | Trade de Continuação |
| **TRM** | Retorno às Médias |
| **F.Q** | Falha e Quebra |

Meu mapeamento anterior estava errado (eu tinha chutado FQ = "Fibo Quebra"). O real é **F.Q = Falha e Quebra**.

---

## 🎨 Estrutura do nav do aluno (a copiar)

Sidebar com **seções nomeadas** (não igual à minha atual):

```
(logo)
┌───────────────────────┐
│ (sem header)          │
│  Evolução             │ → /jornada
│  Minha Jornada        │ → /jornada-matilha
├─ Operacional ─────────┤
│  Diário               │ → /diario
│  Histórico            │ → /historico
│  Raio-X RP            │ → /raioxrp
├─ Aprendizado ─────────┤
│  Aulas                │ → /aulas
│  W.O.L.F AI           │ → /resumo-semanal
├─ Monitoria ───────────┤
│  Acompanhamento       │ → /agendar
│  Plano de Execução    │ → /plano-execucao
├─ Social ──────────────┤
│  Comunidade           │ → /comunidade
├─ Conta ───────────────┤
│  Pack Store           │ → /pack-store
│  Minha Ficha          │ → /minha-ficha
└───────────────────────┘
```

Topbar tem breadcrumb/título + **"StarterCoins" link + saldo** + avatar + rank pill.

---

## ✅ Ordem recomendada de porting

**Fase 1 — ajustes baratos** (corrigir dados já existentes):
1. **Rank enum** → 6 níveis corretos + thresholds em R$
2. **StarterCoins regras** → action_keys certas no `coins_earn`
3. **Setups** → TA/TC/TRM/FQ nomeados corretamente
4. **Sidebar reorganizada** com as 6 seções do aluno
5. **Nav móvel role-switch** (Aluno ↔ Monitor) se usuário tem roles múltiplos

**Fase 2 — features críticas** (maior valor pro aluno):
6. **`/diario` + `/novo-trade`** — refatorar pro form V3.0 com MEN/MEP, emoções, estratégia, parciais
7. **`/jornada` (Evolução)** — dashboard com métricas por estratégia (substitui o `/inicio` atual pra alunos)
8. **`/jornada-matilha`** — caminho dos ranks + metas + dificuldades + diagnóstico
9. **`/comunidade` feed-style** — refatorar do forum atual (threads → feed plano com categorias)
10. **`/minha-ficha` onboarding** — crítico pra monitoria funcionar

**Fase 3 — features do monitor:**
11. **`/mentor/visao-geral`** — Painel de Comando
12. **`/mentor/alunos`** — lista completa com filtros
13. **`/mentor/relatorio-mensal`** — relatório consolidado
14. **`/mentor/solicitacoes`** — aprovação de acesso (pode substituir o signup aberto)

**Fase 4 — agendamento:**
15. **`/agendar` (aluno) + `/mentor/agenda`/`agenda-geral`** — sistema completo de slots

**Fase 5 — inteligência:**
16. **W.O.L.F AI (`/resumo-semanal`)** — job semanal que gera resumo com Claude API
17. **Oráculo** (já tenho schema) — chat reativo, complementar ao W.O.L.F AI

---

## 🗃️ Schema gaps (tabelas a criar)

Mapeado contra o que já tenho em `supabase/migrations/`:

| Tabela nova | Pra que serve |
|---|---|
| `trade_accounts` | Múltiplas contas por aluno (Conta Principal + secundárias) |
| `trades` | O grande — replace da API do Lovable pela nossa |
| `day_summaries` | Resumo diário com "não cliquei hoje" |
| `weekly_summaries` (W.O.L.F AI) | Gerados pelo job |
| `goals` | Metas curto/médio/longo prazo |
| `difficulties` | Árvore de dificuldades |
| `diagnostics` | Respostas do quiz de 6 perguntas |
| `ficha_acompanhamento` | Onboarding profundo (5 seções) |
| `execution_plans` | Plano definido pelo monitor por aluno |
| `monitor_slots` | Horários disponíveis dos monitores |
| `monitor_sessions` | Sessões agendadas/concluídas |
| `community_posts` | Feed (substitui forum_threads) com categoria |
| `community_comments` | Comments dos posts + das aulas |
| `redemption_requests` | Resgates da pack store (pendente/entregue) |
| `access_requests` | Solicitações de novo aluno aguardando aprovação |
| `trader_stats_snapshot` | Cache diário de métricas por aluno (score, violações MEN, tendência) |

---

## 🚨 Observações importantes

1. **Sistema de status do aluno:**
   - `Iniciante` (nível — único que vi, mas talvez tenha mais)
   - Status operacional: `Crítico / Instável / Estruturado / Consistente / Atenção / Estável / Inativo`
   - Tendência: `Piorando / Melhorando / Estável`

2. **Stop Claude button** aparece no canto — eles usam IA tipo Claude em prod. Pode ser o que inspirou o botão flutuante.

3. **Print da operação** aceita **URL externa** (Drive/Imgur) além de upload. Útil pra gente — evita storage pesado no Supabase.

4. **Comunidade tem "Regras da Comunidade"** linkadas no topo.

5. **Aulas têm comentários** nativos — não confundir com o feed.

6. **Monitores têm tag "Monitor"** visível ao lado do nome em toda aparição pública.

7. **Sistema "Stop Claude"** — provavelmente ativa/desativa a automação IA (W.O.L.F AI).

---

## 🎯 Próximo passo concreto

Se topa, sugiro começar pela **Fase 1** em uma sessão só — tudo ajuste barato:
- Migração 0006 que corrige rank enum
- Atualiza action_keys do coins_earn
- Renomeia setups
- Refatora sidebar com as 6 seções
- Adiciona topbar com StarterCoins + avatar

Em paralelo posso começar a **Fase 2** pela `/minha-ficha` (é self-contained, não depende de muita coisa).

Me diz se esse é o caminho ou se quer atacar outra coisa primeiro.
