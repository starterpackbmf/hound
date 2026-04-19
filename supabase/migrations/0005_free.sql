-- ============================================================
-- MATILHA — área free (comunidade)
-- ============================================================
-- Parcerias, social (posts curados), fórum, packstore (moedas),
-- cursos gratuitos, relatório público da comunidade.
-- ============================================================

-- COURSES: flag `is_free` -------------------------------------
alter table public.courses
  add column if not exists is_free boolean not null default false;

create index if not exists courses_is_free_idx on public.courses(is_free) where is_free;

-- PARTNERS (corretoras, fintechs, afiliados) ------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  kind text not null default 'corretora', -- corretora | fintech | curso | outros
  description text,
  logo_url text,
  cta_url text not null,
  bonus_label text,       -- "até R$ 200 de bônus"
  bonus_description text, -- texto longo explicando o bônus
  order_index int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partners enable row level security;

drop policy if exists "partners_select_public" on public.partners;
create policy "partners_select_public"
  on public.partners for select
  to authenticated
  using (published);

drop trigger if exists partners_set_updated_at on public.partners;
create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

-- SOCIAL POSTS (feed curado de Insta/YouTube/X) ---------------
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null, -- 'instagram' | 'youtube' | 'twitter' | 'other'
  post_url text not null,
  embed_url text,
  title text,
  description text,
  thumbnail_url text,
  posted_at timestamptz,
  order_index int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists social_posts_posted_at_idx on public.social_posts(posted_at desc);

alter table public.social_posts enable row level security;

drop policy if exists "social_posts_select_public" on public.social_posts;
create policy "social_posts_select_public"
  on public.social_posts for select
  to authenticated
  using (published);

-- FORUM: threads + replies ------------------------------------
do $$ begin
  create type public.forum_thread_status as enum ('open','closed','pinned');
exception when duplicate_object then null; end $$;

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  tags text[] not null default array[]::text[],
  status public.forum_thread_status not null default 'open',
  reply_count int not null default 0,
  last_reply_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_threads_last_reply_idx on public.forum_threads(last_reply_at desc nulls last);
create index if not exists forum_threads_user_idx on public.forum_threads(user_id);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_replies_thread_idx on public.forum_replies(thread_id, created_at);
create index if not exists forum_replies_user_idx on public.forum_replies(user_id);

-- Trigger: atualiza reply_count + last_reply_at da thread ao inserir reply
create or replace function public.forum_bump_thread()
returns trigger language plpgsql security definer as $$
begin
  update public.forum_threads
  set reply_count = reply_count + 1,
      last_reply_at = new.created_at,
      updated_at = new.created_at
  where id = new.thread_id;
  return new;
end $$;

drop trigger if exists forum_replies_bump_thread on public.forum_replies;
create trigger forum_replies_bump_thread
  after insert on public.forum_replies
  for each row execute function public.forum_bump_thread();

drop trigger if exists forum_threads_set_updated_at on public.forum_threads;
create trigger forum_threads_set_updated_at
  before update on public.forum_threads
  for each row execute function public.set_updated_at();

alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;

drop policy if exists "forum_threads_select" on public.forum_threads;
create policy "forum_threads_select"
  on public.forum_threads for select to authenticated using (true);

drop policy if exists "forum_threads_insert_own" on public.forum_threads;
create policy "forum_threads_insert_own"
  on public.forum_threads for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "forum_threads_update_own" on public.forum_threads;
create policy "forum_threads_update_own"
  on public.forum_threads for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "forum_threads_delete_own" on public.forum_threads;
create policy "forum_threads_delete_own"
  on public.forum_threads for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "forum_replies_select" on public.forum_replies;
create policy "forum_replies_select"
  on public.forum_replies for select to authenticated using (true);

drop policy if exists "forum_replies_insert_own" on public.forum_replies;
create policy "forum_replies_insert_own"
  on public.forum_replies for insert to authenticated
  with check (auth.uid() = user_id);

-- PACKSTORE -----------------------------------------------------
create table if not exists public.packstore_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  image_url text,
  cost_coins int not null check (cost_coins >= 0),
  stock int, -- null = ilimitado
  kind text not null default 'digital', -- digital | physical | discount | access
  payload jsonb, -- código, link, instruções pós-compra
  published boolean not null default true,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.packstore_items enable row level security;

drop policy if exists "packstore_items_select_public" on public.packstore_items;
create policy "packstore_items_select_public"
  on public.packstore_items for select to authenticated using (published);

-- Saldo de moedas por usuário (snapshot)
create table if not exists public.user_coins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 0,
  total_earned int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_coins enable row level security;

drop policy if exists "user_coins_select_own" on public.user_coins;
create policy "user_coins_select_own"
  on public.user_coins for select to authenticated
  using (auth.uid() = user_id);

-- Transações (histórico)
do $$ begin
  create type public.coin_tx_kind as enum ('earn_action', 'spend_purchase', 'admin_adjust', 'welcome_bonus');
exception when duplicate_object then null; end $$;

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.coin_tx_kind not null,
  amount int not null, -- positivo pra earn, negativo pra spend
  reason text,
  reference jsonb,
  created_at timestamptz not null default now()
);

create index if not exists coin_transactions_user_idx on public.coin_transactions(user_id, created_at desc);

alter table public.coin_transactions enable row level security;

drop policy if exists "coin_transactions_select_own" on public.coin_transactions;
create policy "coin_transactions_select_own"
  on public.coin_transactions for select to authenticated
  using (auth.uid() = user_id);

-- RPC: comprar item (debita moedas, cria transação)
create or replace function public.packstore_purchase(item_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  item public.packstore_items;
  bal int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not authenticated');
  end if;

  select * into item from public.packstore_items where id = item_id and published;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item não encontrado');
  end if;

  if item.stock is not null and item.stock <= 0 then
    return jsonb_build_object('ok', false, 'error', 'esgotado');
  end if;

  select balance into bal from public.user_coins where user_id = uid for update;
  if bal is null then bal := 0; end if;

  if bal < item.cost_coins then
    return jsonb_build_object('ok', false, 'error', 'saldo insuficiente', 'balance', bal, 'cost', item.cost_coins);
  end if;

  insert into public.user_coins(user_id, balance, total_earned)
  values (uid, bal - item.cost_coins, 0)
  on conflict (user_id) do update set
    balance = public.user_coins.balance - item.cost_coins,
    updated_at = now();

  insert into public.coin_transactions(user_id, kind, amount, reason, reference)
  values (uid, 'spend_purchase', -item.cost_coins, 'compra: ' || item.name, jsonb_build_object('item_id', item.id, 'slug', item.slug));

  if item.stock is not null then
    update public.packstore_items set stock = stock - 1 where id = item.id;
  end if;

  return jsonb_build_object('ok', true, 'item', jsonb_build_object('name', item.name, 'payload', item.payload), 'new_balance', bal - item.cost_coins);
end $$;

-- RPC: registrar ação que dá moedas (anti-abuso: limite por ação/dia via reason_key)
create or replace function public.coins_earn(action_key text, amount int, reason text default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  already_earned boolean;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not authenticated');
  end if;

  if amount <= 0 or amount > 100 then
    return jsonb_build_object('ok', false, 'error', 'amount fora do range');
  end if;

  -- Bloqueia dupla contabilização por dia pra mesma action_key
  select exists(
    select 1 from public.coin_transactions
    where user_id = uid
      and reference->>'action_key' = action_key
      and created_at > now() - interval '24 hours'
  ) into already_earned;

  if already_earned then
    return jsonb_build_object('ok', false, 'error', 'já ganhou moedas por essa ação hoje');
  end if;

  insert into public.user_coins(user_id, balance, total_earned)
  values (uid, amount, amount)
  on conflict (user_id) do update set
    balance = public.user_coins.balance + amount,
    total_earned = public.user_coins.total_earned + amount,
    updated_at = now();

  insert into public.coin_transactions(user_id, kind, amount, reason, reference)
  values (uid, 'earn_action', amount, reason, jsonb_build_object('action_key', action_key));

  return jsonb_build_object('ok', true, 'amount', amount);
end $$;

-- Trigger: bonus de boas-vindas ao criar profile (50 moedas)
create or replace function public.grant_welcome_coins()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_coins(user_id, balance, total_earned)
  values (new.id, 50, 50)
  on conflict (user_id) do nothing;

  insert into public.coin_transactions(user_id, kind, amount, reason)
  values (new.id, 'welcome_bonus', 50, 'bônus de boas-vindas')
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists profiles_welcome_coins on public.profiles;
create trigger profiles_welcome_coins
  after insert on public.profiles
  for each row execute function public.grant_welcome_coins();
