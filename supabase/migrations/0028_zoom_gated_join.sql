-- Zoom Ao Vivo — fluxo gated
-- Opção 1: link fixo do Zoom, backend faz os 3 gates (nome / ip+device / rate),
-- redirect 302 com nome prefilled. Link nunca vai pro client.
-- Depois da aula: cron marca pendência de feedback → modal bloqueia próximo ao vivo.

-- (Role 'suporte' é adicionada em 0027_add_suporte_role.sql — migration separada
--  porque Postgres não permite usar enum recém-adicionado na mesma transaction.)

-- 1) app_settings — key/value JSON (guarda config global do Zoom aqui, server-side only)
create table if not exists public.app_settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_settings enable row level security;

-- SELECT/UPDATE só admin + suporte. Monitor/imortal/aluno NUNCA leem
-- (nem pra ver, nem pra editar). Link do Zoom fica travado nessa sala.
drop policy if exists "app_settings_admin_rw" on public.app_settings;
create policy "app_settings_admin_rw"
  on public.app_settings for all to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.roles && array['admin','suporte']::public.user_role[])
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.roles && array['admin','suporte']::public.user_role[])
  );

-- Seed do registro de config do Zoom (fica vazio até o monitor preencher)
insert into public.app_settings(key, value) values
  ('zoom_live', '{"meeting_id":"","passcode":"","base_url":"https://zoom.us/j/","duration_min":90}'::jsonb)
on conflict (key) do nothing;


-- 2) zoom_join_log — histórico de joins (usado p/ IP+device lock de 2h)
create table if not exists public.zoom_join_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  live_session_id uuid references public.live_sessions(id) on delete set null,
  ip inet,
  device_hash text,                  -- sha256(user_agent + accept-language + screen hint)
  joined_at timestamptz not null default now()
);

create index if not exists zoom_join_log_user_recent_idx
  on public.zoom_join_log(user_id, joined_at desc);

alter table public.zoom_join_log enable row level security;

-- Aluno lê o próprio histórico. Insert só via service role (backend).
drop policy if exists "zoom_join_log_read_own" on public.zoom_join_log;
create policy "zoom_join_log_read_own"
  on public.zoom_join_log for select to authenticated
  using (
    user_id = auth.uid()
    OR exists (select 1 from public.profiles p
               where p.id = auth.uid()
                 and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );


-- 3) live_feedback — resposta do "como foi seu dia?"
create table if not exists public.live_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  mood smallint check (mood between 1 and 5), -- 1=péssimo, 5=excelente
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, live_session_id)
);

create index if not exists live_feedback_session_idx on public.live_feedback(live_session_id);
create index if not exists live_feedback_user_idx on public.live_feedback(user_id, created_at desc);

alter table public.live_feedback enable row level security;

drop policy if exists "live_feedback_insert_own" on public.live_feedback;
create policy "live_feedback_insert_own"
  on public.live_feedback for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "live_feedback_read_own_or_monitor" on public.live_feedback;
create policy "live_feedback_read_own_or_monitor"
  on public.live_feedback for select to authenticated
  using (
    user_id = auth.uid()
    OR exists (select 1 from public.profiles p
               where p.id = auth.uid()
                 and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );


-- 4) live_feedback_pending — quem participou de aula e ainda deve feedback
-- Populado pelo cron pós-aula. Se tem linha aqui p/ user → bloqueia próximo join.
create table if not exists public.live_feedback_pending (
  user_id uuid not null references auth.users(id) on delete cascade,
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, live_session_id)
);

create index if not exists live_feedback_pending_user_idx on public.live_feedback_pending(user_id);

alter table public.live_feedback_pending enable row level security;

drop policy if exists "live_feedback_pending_read_own_or_monitor" on public.live_feedback_pending;
create policy "live_feedback_pending_read_own_or_monitor"
  on public.live_feedback_pending for select to authenticated
  using (
    user_id = auth.uid()
    OR exists (select 1 from public.profiles p
               where p.id = auth.uid()
                 and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );


-- 5) Trigger: quando user insere live_feedback → remove de live_feedback_pending
create or replace function public.resolve_live_feedback_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.live_feedback_pending
   where user_id = new.user_id
     and live_session_id = new.live_session_id;
  return new;
end;
$$;

drop trigger if exists trg_resolve_live_feedback on public.live_feedback;
create trigger trg_resolve_live_feedback
  after insert on public.live_feedback
  for each row execute function public.resolve_live_feedback_pending();


-- 6) Função helper: checa se user tem feedback pendente (usada no join + no modal)
create or replace function public.user_has_pending_live_feedback(p_user uuid)
returns table (live_session_id uuid, session_title text, session_ended_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select lfp.live_session_id, ls.title, coalesce(ls.ends_at, ls.starts_at + interval '90 minutes')
    from public.live_feedback_pending lfp
    join public.live_sessions ls on ls.id = lfp.live_session_id
   where lfp.user_id = p_user
   order by lfp.created_at asc
   limit 1;
$$;

grant execute on function public.user_has_pending_live_feedback(uuid) to authenticated;


-- 7) Função cron: materializa pendências pós-aula
-- Chamar via pg_cron a cada 5min OU via edge function agendada.
-- Marca TODOS que fizeram join_log de aulas que já terminaram nas últimas 24h
-- e ainda não responderam feedback.
create or replace function public.materialize_live_feedback_pending()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  insert into public.live_feedback_pending(user_id, live_session_id)
  select distinct zjl.user_id, zjl.live_session_id
    from public.zoom_join_log zjl
    join public.live_sessions ls on ls.id = zjl.live_session_id
   where zjl.live_session_id is not null
     and coalesce(ls.ends_at, ls.starts_at + interval '90 minutes') < now()
     and coalesce(ls.ends_at, ls.starts_at + interval '90 minutes') > now() - interval '24 hours'
     and not exists (
       select 1 from public.live_feedback lf
        where lf.user_id = zjl.user_id
          and lf.live_session_id = zjl.live_session_id
     )
  on conflict (user_id, live_session_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.materialize_live_feedback_pending() to service_role;
