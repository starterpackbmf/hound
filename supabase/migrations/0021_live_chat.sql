-- Chat das aulas ao vivo + geral
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('live_session', 'general')),
  live_session_id uuid references public.live_sessions(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists chat_rooms_live_idx on public.chat_rooms(live_session_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  reply_to uuid references public.chat_messages(id) on delete set null,
  pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx on public.chat_messages(room_id, created_at desc);

-- Reações (emoji)
create table if not exists public.chat_reactions (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- Presença em sala (quem entrou, quando)
create table if not exists public.chat_attendance (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, user_id, joined_at)
);

create index if not exists chat_attendance_room_idx on public.chat_attendance(room_id, joined_at desc);

-- RLS
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;
alter table public.chat_attendance enable row level security;

drop policy if exists "chat_rooms_read_all" on public.chat_rooms;
create policy "chat_rooms_read_all" on public.chat_rooms for select to authenticated using (true);

drop policy if exists "chat_rooms_write_monitor" on public.chat_rooms;
create policy "chat_rooms_write_monitor" on public.chat_rooms for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[]));

drop policy if exists "chat_messages_read_all" on public.chat_messages;
create policy "chat_messages_read_all" on public.chat_messages for select to authenticated using (deleted_at is null);

drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own" on public.chat_messages for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "chat_messages_update_own_or_monitor" on public.chat_messages;
create policy "chat_messages_update_own_or_monitor" on public.chat_messages for update to authenticated
  using (
    user_id = auth.uid() OR
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );

drop policy if exists "chat_reactions_rw_own" on public.chat_reactions;
create policy "chat_reactions_rw_own" on public.chat_reactions for all to authenticated
  using (user_id = auth.uid() OR true)
  with check (user_id = auth.uid());

drop policy if exists "chat_attendance_rw_own" on public.chat_attendance;
create policy "chat_attendance_rw_own" on public.chat_attendance for all to authenticated
  using (user_id = auth.uid() OR true)
  with check (user_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_reactions;
