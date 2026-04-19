-- ============================================================
-- MATILHA — Desafios Semanais (definidos pelo monitor, completados por aluno)
-- ============================================================

create table if not exists public.sc_weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,       -- segunda-feira da semana
  title text not null,
  description text,
  reward_sc int not null default 30,
  criteria jsonb,                 -- opcional: { min_trades: 10, min_plan_rate: 80, ... }
  created_by uuid references auth.users(id) on delete set null,  -- monitor
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sc_weekly_week_idx on public.sc_weekly_challenges(week_start desc);

alter table public.sc_weekly_challenges enable row level security;

drop policy if exists "sc_weekly_read_all" on public.sc_weekly_challenges;
create policy "sc_weekly_read_all"
  on public.sc_weekly_challenges for select to authenticated using (is_active);

drop policy if exists "sc_weekly_mod_monitor" on public.sc_weekly_challenges;
create policy "sc_weekly_mod_monitor"
  on public.sc_weekly_challenges for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]));

drop trigger if exists sc_weekly_set_updated_at on public.sc_weekly_challenges;
create trigger sc_weekly_set_updated_at
  before update on public.sc_weekly_challenges
  for each row execute function public.set_updated_at();

-- Completions por aluno
create table if not exists public.sc_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.sc_weekly_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  reward_paid boolean not null default false,
  unique (challenge_id, user_id)
);

create index if not exists sc_completions_user_idx on public.sc_challenge_completions(user_id);

alter table public.sc_challenge_completions enable row level security;

drop policy if exists "sc_completions_select_own_or_monitor" on public.sc_challenge_completions;
create policy "sc_completions_select_own_or_monitor"
  on public.sc_challenge_completions for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[])
  );

drop policy if exists "sc_completions_insert_own" on public.sc_challenge_completions;
create policy "sc_completions_insert_own"
  on public.sc_challenge_completions for insert to authenticated
  with check (user_id = auth.uid());

-- RPC: aluno marca desafio como completo (ganha SC)
create or replace function public.complete_challenge(challenge_id uuid)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare
  uid uuid := auth.uid();
  challenge public.sc_weekly_challenges;
  existing uuid;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not authenticated'); end if;
  select * into challenge from public.sc_weekly_challenges where id = challenge_id and is_active;
  if not found then return jsonb_build_object('ok', false, 'error', 'desafio não encontrado'); end if;

  select id into existing from public.sc_challenge_completions where challenge_id = challenge.id and user_id = uid;
  if found then return jsonb_build_object('ok', false, 'error', 'já completou'); end if;

  insert into public.sc_challenge_completions (challenge_id, user_id, reward_paid) values (challenge.id, uid, true);

  insert into public.user_coins (user_id, balance, total_earned)
  values (uid, challenge.reward_sc, challenge.reward_sc)
  on conflict (user_id) do update set
    balance = public.user_coins.balance + challenge.reward_sc,
    total_earned = public.user_coins.total_earned + challenge.reward_sc,
    updated_at = now();

  insert into public.coin_transactions (user_id, kind, amount, reason, reference)
  values (uid, 'earn_action', challenge.reward_sc, 'desafio: ' || challenge.title, jsonb_build_object('challenge_id', challenge.id));

  return jsonb_build_object('ok', true, 'reward', challenge.reward_sc);
end $$;
