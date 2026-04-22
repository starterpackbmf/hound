-- check-zoom-setup.sql
-- Roda no SQL Editor do Supabase pra validar o fluxo do Ao Vivo antes da primeira aula real.
-- Cada bloco mostra um "checklist item". Leia os comentários em cima pra saber
-- o que é PASS e o que é FAIL.

-- ============================================================
-- 1. MIGRATIONS RODARAM?
-- ============================================================
-- Deve retornar TRUE pras 4 linhas. Se algum retornar FALSE, a migration correspondente não foi aplicada.
select
  (exists (select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid
           where t.typname = 'user_role' and e.enumlabel = 'suporte'))       as "0027_suporte_role",
  (exists (select 1 from information_schema.tables
           where table_schema = 'public' and table_name = 'app_settings'))   as "0028_app_settings",
  (exists (select 1 from information_schema.tables
           where table_schema = 'public' and table_name = 'zoom_join_log'))  as "0028_zoom_join_log",
  (exists (select 1 from information_schema.tables
           where table_schema = 'public' and table_name = 'live_feedback'))  as "0028_live_feedback",
  (exists (select 1 from pg_proc where proname = 'materialize_live_feedback_pending')) as "0028_cron_fn",
  (exists (select 1 from cron.job where jobname = 'zoom_feedback_materialize')) as "0030_cron_scheduled";


-- ============================================================
-- 2. CONFIG DA SALA ZOOM PREENCHIDA?
-- ============================================================
-- Se vier com meeting_id vazio, a tela /mentor/config-zoom ainda não foi usada.
-- Sem isso, TODOS os alunos recebem erro NOT_CONFIGURED.
select
  value->>'meeting_id'   as meeting_id,
  value->>'passcode'     as passcode,
  value->>'base_url'     as base_url,
  value->>'duration_min' as duration_min,
  updated_at
from public.app_settings
where key = 'zoom_live';


-- ============================================================
-- 3. QUEM SÃO OS ADMIN / SUPORTE?
-- ============================================================
-- Lista quem tem acesso ao config-zoom e feedbacks.
select id, email, name, roles
from public.profiles
where roles && array['admin','suporte']::public.user_role[]
order by name;


-- ============================================================
-- 4. QUANTOS ALUNOS TÊM NOME INVÁLIDO?
-- ============================================================
-- Nome com <2 palavras = aluno é BLOQUEADO no gate NAME_REQUIRED.
-- Lista os problemáticos.
select id, email, name, status, roles,
       case
         when name is null or btrim(name) = '' then 'SEM_NOME'
         when array_length(regexp_split_to_array(btrim(name), '\s+'), 1) < 2 then 'SO_NOME'
         else 'OK'
       end as situacao
from public.profiles
where status = 'ativo'
  and (name is null or array_length(regexp_split_to_array(btrim(name), '\s+'), 1) < 2)
order by email;


-- ============================================================
-- 5. ÚLTIMOS JOINS REGISTRADOS (se já teve aula)
-- ============================================================
select zjl.joined_at, p.name, p.email,
       ls.title as aula, zjl.ip,
       substring(zjl.device_hash, 1, 12) as device_frag
from public.zoom_join_log zjl
left join public.profiles p on p.id = zjl.user_id
left join public.live_sessions ls on ls.id = zjl.live_session_id
order by zjl.joined_at desc
limit 20;


-- ============================================================
-- 6. FEEDBACKS PENDENTES NO MOMENTO
-- ============================================================
-- Alunos que estão bloqueados de entrar no próximo ao vivo até responder.
select lfp.created_at as pendente_desde,
       p.name, p.email,
       ls.title as aula
from public.live_feedback_pending lfp
left join public.profiles p on p.id = lfp.user_id
left join public.live_sessions ls on ls.id = lfp.live_session_id
order by lfp.created_at asc;


-- ============================================================
-- 7. DISTRIBUIÇÃO DE HUMOR NOS ÚLTIMOS 30 DIAS
-- ============================================================
-- Radiografia da turma. Humor médio baixo (<3) = sinal de alerta geral.
select mood,
       case mood when 1 then '😖 péssimo' when 2 then '😕 ruim' when 3 then '😐 neutro'
                when 4 then '🙂 bom' when 5 then '😄 ótimo' end as label,
       count(*) as qtd
from public.live_feedback
where created_at >= now() - interval '30 days'
group by mood
order by mood desc;


-- ============================================================
-- 8. CRON: QUANDO FOI A ÚLTIMA EXECUÇÃO?
-- ============================================================
-- Deve ter rodado há <5min. Se faz muito tempo, algo travou.
select j.jobname, j.schedule, j.active,
       jr.start_time, jr.end_time, jr.status
from cron.job j
left join cron.job_run_details jr on jr.jobid = j.jobid
where j.jobname = 'zoom_feedback_materialize'
order by jr.start_time desc nulls last
limit 5;


-- ============================================================
-- 9. DISPAROS MANUAIS RÁPIDOS (admin/suporte only)
-- ============================================================
-- Testa que o materializer funciona sem esperar cron:
--   select public.run_feedback_materializer_now();
--
-- Cria feedback pendente fake pra testar modal bloqueante:
--   insert into public.live_sessions (id, title, zoom_meeting_id, starts_at, ends_at, status)
--     values (gen_random_uuid(), 'Aula fake', '000', now() - interval '2h', now() - interval '30m', 'ended')
--     returning id;
--   insert into public.live_feedback_pending (user_id, live_session_id)
--     values ('<SEU_USER_ID>', '<LIVE_SESSION_ID_RETORNADO>');
