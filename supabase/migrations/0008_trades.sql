-- ============================================================
-- MATILHA — Diário de Trade (nativo, substitui o Lovable no futuro)
-- ============================================================

-- Enums -------------------------------------------------------
do $$ begin
  create type public.trade_direction as enum ('compra', 'venda');
exception when duplicate_object then null; end $$;

-- Contas do trader (Principal, Secundária, Simulada...) -------
create table if not exists public.trade_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists trade_accounts_user_idx on public.trade_accounts(user_id);

alter table public.trade_accounts enable row level security;

drop policy if exists "trade_accounts_rw_own" on public.trade_accounts;
create policy "trade_accounts_rw_own"
  on public.trade_accounts for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- TRADES ------------------------------------------------------
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.trade_accounts(id) on delete set null,

  -- Identificação
  date date not null,
  horario_entrada time,
  horario_saida time,
  ativo text not null,                       -- 'WIN', 'WDO', 'WINZ25', etc
  setup public.trade_setup not null,
  direction public.trade_direction not null,

  -- Execução
  contratos_iniciais int not null default 1,
  men_pts numeric,                           -- máxima exposição negativa (pontos)
  mep_pts numeric,                           -- máxima exposição positiva (pontos)
  partials jsonb not null default '[]'::jsonb, -- [{pts, contratos, horario}, ...]
  encerramento_pts numeric,                  -- pts na saída final
  media_ponderada numeric,                   -- calculado pelo frontend
  resultado_brl numeric,                     -- calculado pelo frontend

  -- Emocional
  emotions text[] not null default array[]::text[], -- máx 3 de 12 estados
  followed_plan boolean,                     -- seguiu o plano?

  -- Contexto
  leitura_tecnica text,
  print_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trades_user_date_idx on public.trades(user_id, date desc);
create index if not exists trades_account_idx on public.trades(account_id);
create index if not exists trades_setup_idx on public.trades(setup);

alter table public.trades enable row level security;

drop policy if exists "trades_rw_own" on public.trades;
create policy "trades_rw_own"
  on public.trades for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

-- RESUMOS DIÁRIOS (quando o aluno finaliza o dia) -------------
create table if not exists public.day_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.trade_accounts(id) on delete set null,
  date date not null,

  did_not_trade boolean not null default false,
  performance text,          -- "como foi o dia"
  learning text,             -- "o que aprendi"
  checklist jsonb not null default '[]'::jsonb,  -- [{item, done}]
  is_finalized boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, account_id)
);

create index if not exists day_summaries_user_date_idx on public.day_summaries(user_id, date desc);

alter table public.day_summaries enable row level security;

drop policy if exists "day_summaries_rw_own" on public.day_summaries;
create policy "day_summaries_rw_own"
  on public.day_summaries for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists day_summaries_set_updated_at on public.day_summaries;
create trigger day_summaries_set_updated_at
  before update on public.day_summaries
  for each row execute function public.set_updated_at();

-- Auto-cria conta "Principal" pra cada novo user ---------------
create or replace function public.ensure_default_account()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.trade_accounts (user_id, name, is_default, order_index)
  values (new.id, 'Conta Principal', true, 0)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists profiles_ensure_default_account on public.profiles;
create trigger profiles_ensure_default_account
  after insert on public.profiles
  for each row execute function public.ensure_default_account();
