-- ============================================================
-- MATILHA PREMIUM — base schema (0001_init)
-- ============================================================
-- Rode este arquivo no Supabase SQL Editor (projeto novo) uma vez.
-- Idempotente: usa IF NOT EXISTS e DROP/CREATE com guardas.
-- ============================================================

-- ENUMS -------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('individual', 'monitor', 'imortal', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_status as enum ('pendente', 'ativo', 'bloqueado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_badge as enum ('primeiro_instinto', 'predador', 'alfa', 'imortal');
exception when duplicate_object then null; end $$;

-- PROFILES ----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  whatsapp text,
  status public.user_status not null default 'pendente',
  current_badge public.user_badge,
  roles public.user_role[] not null default array['individual']::public.user_role[],
  lovable_student_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_lovable_student_id_idx on public.profiles(lovable_student_id);
create index if not exists profiles_status_idx on public.profiles(status);

-- RLS ---------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- TRIGGER: auto-create profile on signup ---------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- TRIGGER: updated_at ----------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
