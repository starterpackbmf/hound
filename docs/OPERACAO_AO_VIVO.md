# Operação do Ao Vivo — Runbook

Guia prático pra admin (Mateus) e suporte (Carla) operarem o fluxo de aulas ao vivo gated.

---

## 🎯 Arquitetura resumida

```
aluno clica "entrar no ao vivo"
        ↓
POST /api/zoom/join  (valida: auth, nome, feedback pendente, rate, ip+device)
        ↓
GET /api/zoom/go?t=<token 60s>
        ↓
302 → zoom.us/j/<meeting_id>?pwd=...&uname=<Nome Sobrenome>
```

**Pontos chave:**
- Link do Zoom **nunca** sai do backend (só o server-side conhece)
- Token HMAC de 60s entre `/join` e `/go` evita reuso
- Nome+sobrenome vai prefilled no Zoom → sua automação de presença bate pelo nome
- Pós-aula: cron a cada 5min marca quem entrou mas não respondeu feedback; aluno fica **bloqueado** no próximo ao vivo até responder

---

## 🔧 Setup inicial (1x)

### 1. Migrations
No SQL Editor do Supabase, rode nesta ordem:
- `0027_add_suporte_role.sql`
- `0028_zoom_gated_join.sql`
- `0029_seed_admin_suporte.sql`
- `0030_zoom_feedback_cron.sql`

Se a 0030 reclamar de permissão: **Dashboard → Database → Extensions → pg_cron → Enable** e rode de novo.

### 2. Env vars (Vercel)
- `ZOOM_JOIN_SECRET` — HMAC secret, 32+ chars
- `SUPABASE_SERVICE_ROLE_KEY` — crítico pro backend
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- (Zoom SDK, Panda, etc. se já estavam)

### 3. Sala Zoom recorrente
1. zoom.us → Meetings → Schedule
2. **Recurring meeting → No fixed time** (sala fixa)
3. Passcode fixo
4. **Waiting Room OFF**
5. **Allow participants to join anytime ON**
6. Anota Meeting ID + Passcode

### 4. Preenche no Matilha
1. Login admin → sidebar **"↔ trocar para monitor"**
2. Menu lateral → **"config do ao vivo"**
3. Meeting ID + Passcode → salva

### 5. Sanity check
Roda `scripts/check-zoom-setup.sql` no SQL Editor. Todas as linhas da query #1 devem retornar `true`.

---

## 🎥 Rotina antes de cada aula

1. **10min antes** abre a sala no cliente Zoom (mesma sala fixa, só clica "Start")
2. Deixa mic/vídeo ativos como host
3. Opcional: cria a `live_session` do dia pra amarrar feedbacks a ela:
   ```sql
   insert into public.live_sessions (title, zoom_meeting_id, starts_at, ends_at, status)
   values ('Aula 22/04 — Abertura', '<meu_meeting_id>', now(), now() + interval '90 minutes', 'live');
   ```
4. Alunos vão entrando pelo app (`/cursos/aulas` → "entrar no ao vivo")

---

## 🚨 Diagnóstico — o que fazer quando

### Aluno diz: "clico em entrar e diz que preciso completar o nome"
**Erro:** `NAME_REQUIRED`. O profile dele tem <2 palavras em `name`.
**Fix:** manda ele em `/app/minha-ficha` completar. Ou resolve no SQL:
```sql
update public.profiles set name = 'Fulano Silva' where email = 'fulano@x.com';
```

### Aluno diz: "fica pedindo feedback mas eu não fiz aula"
**Causa:** alguém (ele mesmo em outro dia? fake test?) entrou numa live_session que depois terminou e o cron marcou pendência.
**Debug:**
```sql
select * from public.live_feedback_pending lfp
join public.profiles p on p.id = lfp.user_id
where p.email = 'fulano@x.com';
```
**Fix:** pode deletar a linha manualmente se for falso positivo:
```sql
delete from public.live_feedback_pending
 where user_id = '<uid>' and live_session_id = '<lsid>';
```

### Aluno diz: "aparece 'login suspeito em outro dispositivo'"
**Erro:** `SESSION_CONFLICT`. Detectamos tentativa com IP **e** device hash diferentes em <2h.
**Debug:**
```sql
select joined_at, ip, substring(device_hash, 1, 12) as dev
from public.zoom_join_log
where user_id = '<uid>'
order by joined_at desc limit 10;
```
Se for legítimo (cara mudou de wifi pra 4g + trocou de device), tem que esperar 2h OU limpar:
```sql
delete from public.zoom_join_log
where user_id = '<uid>' and joined_at > now() - interval '2 hours';
```

### Aluno diz: "botão fica carregando pra sempre"
1. Abre F12 (Console) → vê o erro
2. Checa `SUPABASE_SERVICE_ROLE_KEY` em prod (Vercel)
3. Olha logs do Vercel: Deployments → último → Runtime Logs
4. Se erro for `NOT_CONFIGURED`, o `app_settings.zoom_live` tá vazio

### Todo mundo diz "sala não configurada"
`app_settings.zoom_live.meeting_id` vazio. Volta em `/mentor/config-zoom` e salva.

### Cron não tá rodando
```sql
-- última execução:
select jr.start_time, jr.status, jr.return_message
from cron.job j
join cron.job_run_details jr on jr.jobid = j.jobid
where j.jobname = 'zoom_feedback_materialize'
order by jr.start_time desc limit 5;

-- forçar agora (só admin/suporte):
select public.run_feedback_materializer_now();
```

Se `active = false` ou sumiu, re-rode a migration `0030`.

---

## 💬 Dashboard de CS (`/mentor/feedbacks`)

Três tabs:
- **Urgente** (default) — humor 1-2 (😖😕) nos últimos 30 dias
- **Todos** — todos os feedbacks 30 dias
- **Pendentes** — quem ainda não respondeu a aula anterior

**Rotina sugerida pra Carla:**
- Manhã: abre tab urgente → manda WhatsApp pra cada aluno vermelho
- Durante o dia: tab pendentes → lembra quem tá travado

---

## 🌐 URL do app em produção

A URL atual é `https://hound-omega.vercel.app` — nome feio herdado do projeto Vercel antigo.

**Pra ter uma URL melhor, 3 opções:**

### Opção A — Renomear projeto Vercel
1. Dashboard Vercel → projeto `hound` → Settings → General
2. Project Name → troca pra `matilha-app` → Save
3. URL vira `matilha-app-mateusgschwartz-....vercel.app` (ainda feia) ou `matilha-app.vercel.app` se estiver livre
4. Requer redeploy

### Opção B — Custom domain (recomendado)
1. Compra/usa um domínio (ex: `app.matilha.com.br`)
2. Dashboard Vercel → projeto → Settings → Domains → Add
3. Configura DNS (Vercel guia os registros)
4. URL fica `app.matilha.com.br` — memorável e brandable

### Opção C — Aceitar hound-omega
Funciona perfeitamente. Só bookmark e vida que segue.

> Nota: tentei adicionar alias `matilha-app.vercel.app` via CLI mas o Vercel aplicou **SSO protection** nele (exige login Vercel), porque ele não é um alias "de produção". Tem que ser via dashboard (opção A) ou custom domain (opção B) pra bypass.

---

## 🔒 Segurança — o que o gate protege contra

| Ataque | Defesa |
|---|---|
| Aluno copia link do Zoom e manda pro amigo | Link nunca sai do servidor; cada request gera token de 60s |
| Aluno compartilha conta (outra pessoa entra) | IP+device lock de 2h (só bloqueia se **ambos** diferirem) |
| Aluno entra 10x seguidas pra bagunçar | Rate limit de 5min entre joins |
| Aluno entra com nome falso pra despistar presença | Nome vem do `profiles.name`, gate de 2+ palavras |
| Aluno "não pode" responder feedback mas quer entrar | Gate FEEDBACK_REQUIRED bloqueia próximo join |

**O que NÃO protege:**
- Cara grava a tela com OBS (não tem como)
- Cara usa 2 devices reais e mesma conta (se IPs forem diferentes): detecta, bloqueia depois do primeiro
- Se o Zoom meeting permitir "Join before host" sem passcode, aluno pode descobrir o Meeting ID pelo log do próprio Zoom dele (limitação do Zoom, não do app)

---

## 📋 Checklist antes da primeira aula real

- [ ] Rodar `scripts/check-zoom-setup.sql` — item 1 todo TRUE
- [ ] `app_settings.zoom_live` preenchido (item 2 com meeting_id)
- [ ] Você (admin) e Carla (admin+suporte) nas roles (item 3)
- [ ] Alunos com nome inválido resolvidos (item 4 vazio)
- [ ] Cron rodou pelo menos 1x nos últimos 10min (item 8)
- [ ] Sala Zoom criada como recorrente, Waiting Room OFF
- [ ] Env vars em prod: ZOOM_JOIN_SECRET, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_*

Tudo OK? Bora.
