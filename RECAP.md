# RECAP — sessão de construção da área de membros

Tudo que foi feito enquanto você estava fora, e o que você precisa aplicar pra destravar.

---

## 🎨 Redesign Linear-style aplicado

O handoff do Claude Design (`Matilha APP.zip`) foi totalmente implementado. Tokens, componentes e todas as 14 rotas foram refatorados:

- **Fontes:** Inter (UI) + JetBrains Mono (números/IDs/kbd) via `@fontsource`
- **Cores:** `#080808` body, `#111113` surface-1, `#18181b` surface-2, amber `#e4b528` como accent único
- **Tokens globais:** [src/styles/tokens.css](src/styles/tokens.css) — todas as CSS variables + classes utilitárias (.pill, .btn, .card, .dot, .kbd, .eyebrow, .label-muted, .skeleton)
- **Componentes novos:** [icons.jsx](src/components/icons.jsx) (40+ ícones Lucide), [Hound.jsx](src/components/Hound.jsx) (mascote pixel-art SVG), [RankBadge.jsx](src/components/RankBadge.jsx) (4 níveis + aliases Lovable)
- **Sidebar:** brand MATILHA + search bar com `⌘K` + nav com ícones + groups MATILHA/COMUNIDADE + footer com avatar-gradient + user email + logout
- **Login:** layout centrado com underline inputs, radial gradient ambient, Hound no rodapé
- **Dashboard:** hero display 36px + pills status/badge/role + banner AO VIVO gradient + 2x2 HomeCards + stats grid + Hound card
- **Páginas:** Estudo (árvore com chevrons + player Panda), Destaques (pills de período + 4 rankings com medalhas), Oráculo (chat ChatGPT-like com bubbles + empty state + sources)

---

## ✅ O que ficou pronto

### 1. Infra / Auth
- **Supabase novo** (`ezkvddgqrmpiegwaapwe`) conectado como auth principal
- **Login/Signup** em [/login](http://localhost:5173/login) — email+senha, toggle "criar conta de teste"
- **Gate de rota** `/app/*` — redireciona pra login se não autenticado
- Conta de teste: `teste+smoke@matilha.app` / `matilha123`

### 2. Sidebar com 2 grupos
- **MATILHA** (premium, 8 itens): início, estudo, ao vivo, imersões, monitoria, diário, oráculo, destaques
- **COMUNIDADE** (free, 6 itens): fórum, social, cursos grátis, relatório, packstore, parcerias

### 3. Área MATILHA (premium)
| rota | o que faz |
|---|---|
| `/app/inicio` | Dashboard rico — hero, banner AO VIVO, quick stats, 4 HomeCards, performance do diário |
| `/app/estudo` | Grid de cursos (filtra por role via RLS) |
| `/app/estudo/:slug` | Árvore expand/collapse + player Panda + lista de aulas + materiais + progresso |
| `/app/aulas` | Aulas ao vivo: agora / próximas / replays (Zoom link ou YouTube embed) |
| `/app/imersoes` | Mesma base, filtra `kind=imersao` |
| `/app/monitoria` | placeholder |
| `/app/diario` | Redirect pro app Lovable |
| `/app/oraculo` | Chat com sidebar de conversas + stub funcional (sem custo de API) |
| `/app/destaques` | **Ranking real** do diário — resultado, win rate, disciplina, consistência |

### 4. Área COMUNIDADE (free) ← NOVO
| rota | o que faz |
|---|---|
| `/app/comunidade` | Fórum: lista de threads + form "nova thread" + badges dos autores |
| `/app/comunidade/:id` | Detalhe da thread + respostas + form reply |
| `/app/social` | Feed de posts curados (Insta/YouTube/Twitter) |
| `/app/cursos-gratis` | Grid de cursos com `is_free=true` — aponta pro mesmo player do estudo |
| `/app/relatorio` | Relatório público da matilha: métricas agregadas + top 5 anônimo |
| `/app/packstore` | Loja de moedas: saldo + catálogo + botão comprar + histórico |
| `/app/parcerias` | Corretoras/fintechs com link de afiliado + bônus destacado |

### 5. Integrações externas
- **Matilha diário API** (Lovable) — `/api/matilha` proxy, read-only
- **Panda Video API** — `/api/panda` — folders, videos, video details
- **Oráculo** — `/api/oraculo` — respostas stub enquanto `ORACULO_ENABLED !== 'true'`

### 6. Mobile responsive
- Hamburger + sidebar drawer
- Course page com tree colapsável no mobile
- Grids se adaptam

### 7. Sistema de moedas (Packstore)
- Todo novo user ganha **50 moedas** de boas-vindas (via trigger no insert de profile)
- RPC `coins_earn(action_key, amount)` — dá moedas com anti-dupla (por 24h)
- RPC `packstore_purchase(item_id)` — debita saldo, registra transação, decrementa estoque
- Histórico de transações por usuário, com RLS

### 8. Arquivos principais
```
src/
  main.jsx                       → rotas completas
  lib/
    supabase.js, matilha.js, panda.js
    courses.js                   → cursos/módulos/progresso
    events.js                    → partitionEvents, YouTube embed
    oraculo.js                   → conversations/messages
    profile.js                   → getMyProfile + labels
    free.js ← NOVO                → partners, social, forum, packstore
    useMedia.js                  → hook isMobile
  auth/AuthContext.jsx, ProtectedRoute.jsx
  pages/
    Login.jsx
    member/
      MemberLayout.jsx           → sidebar com 2 grupos
      Inicio.jsx, Estudo.jsx, Course.jsx, PandaPlayer.jsx
      Aulas.jsx, Imersoes.jsx, Monitoria.jsx
      Diario.jsx, Oraculo.jsx, Destaques.jsx
      Comunidade.jsx ← NOVO
      Thread.jsx ← NOVO
      Social.jsx ← NOVO
      CursosGratis.jsx ← NOVO
      Relatorio.jsx ← NOVO
      Packstore.jsx ← NOVO
      Parcerias.jsx ← NOVO
      ui.jsx                     → Card/Section/Placeholder
api/
  matilha.js, panda.js, oraculo.js
proxy.js                         → dev server com todos proxies
supabase/migrations/
  0001_init.sql                  ✅ APLICADA
  0002_estudo.sql                ⏳ pendente
  0003_events.sql                ⏳ pendente
  0004_oraculo.sql               ⏳ pendente (precisa pgvector antes)
  0005_free.sql ← NOVO            ⏳ pendente
scripts/
  sync-panda.js                  → importa Panda → courses/modules
RECAP.md                         → este arquivo
```

---

## ⏳ O QUE VOCÊ PRECISA APLICAR

### A. Rodar as migrations no Supabase (em ordem)

[SQL Editor](https://supabase.com/dashboard/project/ezkvddgqrmpiegwaapwe/sql/new) — todas idempotentes.

1. [0002_estudo.sql](supabase/migrations/0002_estudo.sql) — cursos/módulos
2. [0003_events.sql](supabase/migrations/0003_events.sql) — aulas ao vivo/imersões
3. Habilitar extensão `vector` em [Database → Extensions](https://supabase.com/dashboard/project/ezkvddgqrmpiegwaapwe/database/extensions)
4. [0004_oraculo.sql](supabase/migrations/0004_oraculo.sql) — oráculo/RAG
5. [0005_free.sql](supabase/migrations/0005_free.sql) — comunidade/free

### B. Se tornar admin + ativar conta

```sql
update public.profiles
set status = 'ativo',
    roles = array['individual','admin']::user_role[]
where email = 'seu-email@aqui';
```

### C. Importar cursos do Panda (opcional)

```bash
node scripts/sync-panda.js --dry-run  # preview
node scripts/sync-panda.js             # aplica
```

### D. Seeds rápidos pra testar a área free

Depois de aplicar 0005, cole no SQL Editor pra popular dados de exemplo:

```sql
-- Parcerias de exemplo
insert into public.partners (slug, name, kind, description, cta_url, bonus_label, bonus_description, order_index) values
  ('clear', 'Clear Corretora', 'corretora',
   'A corretora que o Mateus usa pra operar mini-índice e mini-dólar. Zero corretagem, execução confiável.',
   'https://www.clear.com.br/?ref=matilha', 'R$ 100 em corretagem',
   'Abrir conta pelo link libera bônus de R$100 em corretagem pros primeiros trades.', 0),
  ('doo-prime', 'Doo Prime', 'corretora',
   'Corretora internacional pra quem quer operar forex, commodities e índices globais.',
   'https://www.dooprime.com/?ref=matilha', 'Spreads reduzidos',
   'Condições exclusivas de spread pra quem vem da matilha.', 1);

-- Items da packstore de exemplo
insert into public.packstore_items (slug, name, description, cost_coins, kind, payload, order_index) values
  ('desconto-mentoria-10', '10% OFF mentoria premium', 'Cupom de desconto pra renovar ou upgrade da mentoria.', 200, 'discount', '{"code":"MATILHA10"}'::jsonb, 0),
  ('ebook-starter', 'E-book Starter (PDF)', 'PDF exclusivo sobre as 4 estratégias do Tradesystem.', 80, 'digital', '{"url":"https://example.com/ebook.pdf"}'::jsonb, 1),
  ('camiseta-matilha', 'Camiseta Matilha (P/M/G)', 'Camiseta oficial do pack. Envio em até 15 dias úteis.', 500, 'physical', '{"instructions":"vamos te mandar email pedindo endereço"}'::jsonb, 2),
  ('consultoria-30min', 'Consultoria 30min com Mateus', 'Agende uma call individual pra revisar teus trades.', 2000, 'access', '{"instructions":"te mando o link do Cal.com"}'::jsonb, 3);

-- Social posts de exemplo
insert into public.social_posts (platform, post_url, title, description, posted_at) values
  ('instagram', 'https://instagram.com/p/exemplo', 'Análise pré-mercado de hoje', 'Olha o que eu tô vendo no índice pra abertura.', now() - interval '2 hours'),
  ('youtube', 'https://youtube.com/watch?v=abc', 'Como eu identifico o setup FQ', 'Aula rápida de 10min explicando o Fibo Quebra.', now() - interval '1 day');
```

### E. Cadastrar aulas ao vivo / imersões

```sql
insert into public.events (kind, title, description, starts_at, live_url, host_name) values
  ('ao_vivo', 'Sala ao vivo sábado', 'Análise da semana + Q&A',
   '2026-04-26 09:00-03', 'https://zoom.us/j/...', 'Mateus Schwartz');
```

### F. Ativar o Oráculo (quando quiser — gasta API)

- `ORACULO_ENABLED=true` no `.env` + implementar pipeline RAG (projeto à parte)

---

## 🎯 Decisões em aberto (pra quando voltar)

1. **Monitoria** — Cal.com / Jitsi / Daily / Meet?
2. **Badge enum** — seu diário usa `alpha`/`cacador`/`aprendiz` (além de `primeiro_instinto`/`predador`). Meu enum: `primeiro_instinto`/`predador`/`alfa`/`imortal`. Qual é o conjunto canônico?
3. **RLS por status** — hoje qualquer `individual` vê cursos/eventos. Quer bloquear status='pendente'?
4. **Free vs Premium** — hoje a área free e premium tão no mesmo `/app/*` (qualquer logado vê tudo). Quer separar acesso? (Ex: só status='ativo' + roles='admin/monitor/imortal/individual' vê /app/inicio; `pendente` só vê /app/comunidade+social+parcerias)
5. **Acesso mentorado** — signup aberto hoje. Pra produção: fechar + webhook Hotmart/Kiwify?
6. **Redesign Linear-style** — tem o prompt pronto no chat, posso refatorar tudo pra tokens amber/surface-layered/Inter quando quiser

---

## 🐛 Conhecidos / dívidas

- **Diário do Lovable URL** — placeholder em `.env` (`VITE_DIARIO_URL`). Me passa a real
- **Moedas no UI** — a Inicio poderia mostrar o saldo atual. Não incluí ainda
- **Admin UI** — tudo é cadastrado direto no Supabase Table Editor. UI de admin é projeto à parte
- **No Vercel**, precisa adicionar env vars: `MATILHA_API_KEY`, `PANDA_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_PANDA_PLAYER_HOST`, `VITE_DIARIO_URL`, (`ORACULO_ENABLED` se ativar)

---

## 🧪 Como testar tudo rápido

1. `npm run dev` + `node proxy.js` em terminais separados
2. http://localhost:5173/login → loga com `teste+smoke@matilha.app` / `matilha123`
3. Aplica migrations 0002..0005 no Supabase
4. Se promove a admin+ativo (SQL do passo B)
5. Roda o seed de dados do passo D
6. Recarrega e navega por TODAS rotas:
   - **MATILHA:** início (dashboard), estudo (vazio até sync-panda), ao vivo/imersões (vazio até events), monitoria (placeholder), diário (redirect Lovable), oráculo (chat stub), destaques (dados reais ✨)
   - **COMUNIDADE:** fórum (posta uma thread de teste), social (feed vazio até seed), cursos grátis, relatório (dados reais ✨), packstore (50 moedas de boas-vindas + catálogo do seed), parcerias (seed do passo D)
