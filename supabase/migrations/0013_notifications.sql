-- ============================================================
-- MATILHA — Notificações in-app
-- ============================================================

do $$ begin
  create type public.notification_kind as enum (
    'trade_feedback',        -- monitor deu feedback num trade
    'daily_feedback',        -- monitor postou feedback do dia
    'session_saved',         -- monitor registrou resumo de sessão
    'slot_confirmed',        -- monitor confirmou agendamento de monitoria
    'slot_requested',        -- aluno pediu horário (pro monitor)
    'challenge_new',         -- desafio novo da semana
    'challenge_completed',   -- aluno completou desafio
    'rank_up',               -- subiu de rank
    'achievement_unlocked',  -- desbloqueou conquista
    'plan_updated',          -- monitor definiu/atualizou plano
    'live_starting',         -- aula ao vivo começou
    'redemption_status',     -- status do resgate mudou
    'generic'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.notification_kind not null default 'generic',
  title text not null,
  body text,
  link text,                    -- rota in-app (ex: /app/trade/UUID)
  meta jsonb,                   -- dados extras (ex: trade_id, challenge_id)
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Usuário só vê/marca as próprias. Monitor pode inserir pra qualquer aluno.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_insert_monitor_or_self" on public.notifications;
create policy "notifications_insert_monitor_or_self"
  on public.notifications for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[])
  );

-- ======= Triggers que auto-criam notificações =======

-- Trade feedback novo → notifica o aluno
create or replace function public.notify_trade_feedback()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  meta_json jsonb;
begin
  meta_json := jsonb_build_object('trade_id', new.trade_id, 'status', new.status);
  insert into public.notifications (user_id, kind, title, body, link, meta)
  values (
    new.student_id,
    'trade_feedback',
    '✎ Monitor comentou um trade seu',
    coalesce(left(new.feedback, 120), 'Status: ' || new.status),
    '/app/trade/' || new.trade_id,
    meta_json
  );
  return new;
end $$;

drop trigger if exists notify_on_trade_feedback on public.trade_feedback;
create trigger notify_on_trade_feedback
  after insert on public.trade_feedback
  for each row execute function public.notify_trade_feedback();

-- Mentor feedback diário → notifica aluno
create or replace function public.notify_daily_feedback()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, title, body, link)
  values (
    new.student_id,
    'daily_feedback',
    '🧭 Novo feedback do monitor',
    coalesce(left(new.feedback, 120), ''),
    '/app/inicio'
  );
  return new;
end $$;

drop trigger if exists notify_on_daily_feedback on public.mentor_feedback;
create trigger notify_on_daily_feedback
  after insert on public.mentor_feedback
  for each row execute function public.notify_daily_feedback();

-- Mentorship session → notifica aluno
create or replace function public.notify_session_saved()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, title, body, link)
  values (
    new.student_id,
    'session_saved',
    '🎓 Resumo de sessão publicado',
    coalesce(left(new.summary, 120), ''),
    '/app/sessoes'
  );
  return new;
end $$;

drop trigger if exists notify_on_session on public.mentorship_sessions;
create trigger notify_on_session
  after insert on public.mentorship_sessions
  for each row execute function public.notify_session_saved();

-- Slot confirmado → notifica aluno (inserido on update)
create or replace function public.notify_slot_confirmed()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.status = 'reservado' and (old.status is distinct from 'reservado') and new.student_id is not null then
    insert into public.notifications (user_id, kind, title, body, link)
    values (
      new.student_id,
      'slot_confirmed',
      '📅 Sua monitoria foi confirmada',
      'Horário: ' || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'),
      '/app/monitoria'
    );
  end if;
  return new;
end $$;

drop trigger if exists notify_on_slot_confirm on public.monitor_slots;
create trigger notify_on_slot_confirm
  after update on public.monitor_slots
  for each row execute function public.notify_slot_confirmed();

-- Slot requested → notifica monitor
create or replace function public.notify_slot_requested()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  student_name text;
begin
  if new.status = 'solicitado' and (old.status is distinct from 'solicitado') then
    select name into student_name from public.profiles where id = new.student_id;
    insert into public.notifications (user_id, kind, title, body, link)
    values (
      new.monitor_id,
      'slot_requested',
      '🔔 Nova solicitação de monitoria',
      coalesce(student_name, 'aluno') || ' pediu o horário ' || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'),
      '/mentor/agenda'
    );
  end if;
  return new;
end $$;

drop trigger if exists notify_on_slot_request on public.monitor_slots;
create trigger notify_on_slot_request
  after update on public.monitor_slots
  for each row execute function public.notify_slot_requested();

-- Plano atualizado → notifica aluno
create or replace function public.notify_plan_updated()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, title, body, link)
  values (
    new.user_id,
    'plan_updated',
    '🎯 Plano de execução atualizado',
    'Seu monitor definiu novas diretrizes.',
    '/app/plano-execucao'
  );
  return new;
end $$;

drop trigger if exists notify_on_plan_change on public.execution_plans;
create trigger notify_on_plan_change
  after insert or update on public.execution_plans
  for each row when (new.active) execute function public.notify_plan_updated();
