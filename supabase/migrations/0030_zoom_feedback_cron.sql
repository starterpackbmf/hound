-- Cron: a cada 5 minutos roda materialize_live_feedback_pending()
-- pra criar pendências dos alunos que participaram de aulas que já acabaram.
-- Requer: extensão pg_cron habilitada no projeto Supabase.
--
-- Se falhar em `create extension`, habilite manualmente em:
--   Dashboard → Database → Extensions → pg_cron → Enable
-- Depois rode este arquivo de novo.

create extension if not exists pg_cron with schema extensions;

-- Remove agendamento antigo (se existir) pra ser idempotente
do $$
declare
  j_id bigint;
begin
  select jobid into j_id from cron.job
   where jobname = 'zoom_feedback_materialize';
  if j_id is not null then
    perform cron.unschedule(j_id);
  end if;
end$$;

-- Agenda: */5 * * * * = a cada 5 minutos
select cron.schedule(
  'zoom_feedback_materialize',
  '*/5 * * * *',
  $cron$select public.materialize_live_feedback_pending();$cron$
);

-- Bônus: função admin pra disparar o materializador na hora
-- (útil pra testar sem esperar o cron)
create or replace function public.run_feedback_materializer_now()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.roles && array['admin','suporte']::public.user_role[]
  ) then
    raise exception 'forbidden: admin/suporte only';
  end if;
  select public.materialize_live_feedback_pending() into v_count;
  return v_count;
end;
$$;

grant execute on function public.run_feedback_materializer_now() to authenticated;
