-- Live sessions (aulas ao vivo via Zoom Meeting SDK)
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  host_name text,
  host_user_id uuid references auth.users(id) on delete set null,
  zoom_meeting_id text not null,
  zoom_passcode text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  replay_url text,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','canceled')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_sessions_starts_idx on public.live_sessions(starts_at desc);

alter table public.live_sessions enable row level security;

drop policy if exists "live_sessions_read_all" on public.live_sessions;
create policy "live_sessions_read_all"
  on public.live_sessions for select to authenticated
  using (true);

drop policy if exists "live_sessions_write_monitor" on public.live_sessions;
create policy "live_sessions_write_monitor"
  on public.live_sessions for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );
