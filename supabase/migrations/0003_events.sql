-- ============================================================
-- MATILHA — eventos (aulas ao vivo, open class, imersões, replays)
-- ============================================================

do $$ begin
  create type public.event_kind as enum ('ao_vivo', 'open_class', 'imersao', 'replay');
exception when duplicate_object then null; end $$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  kind public.event_kind not null default 'ao_vivo',
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  live_url text,        -- Zoom meeting, YouTube live, etc
  cover_url text,
  recording_url text,   -- pra replay depois do evento
  host_name text,
  allowed_roles public.user_role[] not null default array['individual','monitor','imortal','admin']::public.user_role[],
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists events_kind_idx on public.events(kind);

alter table public.events enable row level security;

drop policy if exists "events_select_allowed" on public.events;
create policy "events_select_allowed"
  on public.events for select
  to authenticated
  using (published and allowed_roles && public.current_user_roles());

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();
