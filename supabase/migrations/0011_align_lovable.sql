-- ============================================================
-- MATILHA — alinhamento de schemas com o Lovable
-- ============================================================
-- Adiciona campos faltantes em `trades` e cria tabelas novas pra
-- bater 1:1 com o schema do Lovable (ver SCHEMAS.md).
-- ============================================================

-- TRADES — campos extras pra bater com Lovable --------------------
alter table public.trades
  add column if not exists planned_men_pts    numeric,        -- MEN planejado (diferente do realizado)
  add column if not exists planned_mep_pts    numeric,
  add column if not exists selected_rules     text[] not null default array[]::text[],
  add column if not exists selected_filters   text[] not null default array[]::text[],
  add column if not exists entry_quality      int check (entry_quality is null or entry_quality between 1 and 5),
  add column if not exists escora_tag         text,
  add column if not exists total_points       numeric;

-- USER TRADE CONFIG (stops default em pontos por ativo) -----------
create table if not exists public.user_trade_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stop_max_win_points numeric,
  stop_max_wdo_points numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_trade_config enable row level security;

drop policy if exists "user_trade_config_rw_own" on public.user_trade_config;
create policy "user_trade_config_rw_own"
  on public.user_trade_config for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists user_trade_config_set_updated_at on public.user_trade_config;
create trigger user_trade_config_set_updated_at
  before update on public.user_trade_config
  for each row execute function public.set_updated_at();

-- MONITOR AVAILABILITY (recorrência semanal) ---------------------
create table if not exists public.monitor_availability (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references auth.users(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  slot_duration int not null default 60,
  is_active boolean not null default true,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists monitor_avail_monitor_idx on public.monitor_availability(monitor_id);

alter table public.monitor_availability enable row level security;

drop policy if exists "monitor_avail_select_all" on public.monitor_availability;
create policy "monitor_avail_select_all"
  on public.monitor_availability for select to authenticated using (true);

drop policy if exists "monitor_avail_monitor_crud" on public.monitor_availability;
create policy "monitor_avail_monitor_crud"
  on public.monitor_availability for all to authenticated
  using (monitor_id = auth.uid()) with check (monitor_id = auth.uid());

drop trigger if exists monitor_avail_set_updated_at on public.monitor_availability;
create trigger monitor_avail_set_updated_at
  before update on public.monitor_availability
  for each row execute function public.set_updated_at();

-- MENTORSHIP SESSIONS (resumo pós-sessão) -------------------------
create table if not exists public.mentorship_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  mentor_id uuid references auth.users(id) on delete set null,
  session_date date not null,
  summary text,
  technical_adjustments text,
  emotional_observations text,
  suggested_strategies text,
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mentorship_sessions_student_idx on public.mentorship_sessions(student_id, session_date desc);

alter table public.mentorship_sessions enable row level security;

drop policy if exists "mentorship_sessions_read" on public.mentorship_sessions;
create policy "mentorship_sessions_read"
  on public.mentorship_sessions for select to authenticated
  using (
    student_id = auth.uid() or mentor_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[])
  );

drop policy if exists "mentorship_sessions_mod_monitor" on public.mentorship_sessions;
create policy "mentorship_sessions_mod_monitor"
  on public.mentorship_sessions for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]));

drop trigger if exists mentorship_sessions_set_updated_at on public.mentorship_sessions;
create trigger mentorship_sessions_set_updated_at
  before update on public.mentorship_sessions
  for each row execute function public.set_updated_at();

-- MENTOR FEEDBACK (diário) ----------------------------------------
create table if not exists public.mentor_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  mentor_id uuid references auth.users(id) on delete set null,
  day_date date not null,
  feedback text not null,
  tags text[] not null default array[]::text[],  -- ex: ['AJUSTAR','ELOGIAR','ALERTAR']
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mentor_feedback_student_idx on public.mentor_feedback(student_id, day_date desc);

alter table public.mentor_feedback enable row level security;

drop policy if exists "mentor_feedback_read" on public.mentor_feedback;
create policy "mentor_feedback_read"
  on public.mentor_feedback for select to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[])
  );

drop policy if exists "mentor_feedback_mod" on public.mentor_feedback;
create policy "mentor_feedback_mod"
  on public.mentor_feedback for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]));

-- TRADE FEEDBACK (por trade individual) ---------------------------
do $$ begin
  create type public.trade_feedback_status as enum ('OK', 'AJUSTAR', 'DESTAQUE', 'ALERTAR');
exception when duplicate_object then null; end $$;

create table if not exists public.trade_feedback (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  mentor_id uuid references auth.users(id) on delete set null,
  status public.trade_feedback_status not null default 'OK',
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trade_feedback_trade_idx on public.trade_feedback(trade_id);
create index if not exists trade_feedback_student_idx on public.trade_feedback(student_id);

alter table public.trade_feedback enable row level security;

drop policy if exists "trade_feedback_read" on public.trade_feedback;
create policy "trade_feedback_read"
  on public.trade_feedback for select to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[])
  );

drop policy if exists "trade_feedback_mod" on public.trade_feedback;
create policy "trade_feedback_mod"
  on public.trade_feedback for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]));

-- WEEKLY AI REPORTS (W.O.L.F AI real) -----------------------------
create table if not exists public.weekly_ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  generated_at timestamptz not null default now(),
  model text,                          -- ex: 'claude-sonnet-4-6'
  prompt_version text,                 -- ex: 'v1'
  input_snapshot jsonb,                -- dados que alimentaram o prompt
  output_summary text,
  output_tips text[],
  output_actions text[],
  cached boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists weekly_ai_reports_user_idx on public.weekly_ai_reports(user_id, week_start desc);

alter table public.weekly_ai_reports enable row level security;

drop policy if exists "weekly_ai_reports_rw_own" on public.weekly_ai_reports;
create policy "weekly_ai_reports_rw_own"
  on public.weekly_ai_reports for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists weekly_ai_reports_set_updated_at on public.weekly_ai_reports;
create trigger weekly_ai_reports_set_updated_at
  before update on public.weekly_ai_reports
  for each row execute function public.set_updated_at();

-- SC ACHIEVEMENTS (catálogo + user progress) ----------------------
create table if not exists public.sc_achievements (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  icon text,             -- nome de ícone Lucide ou emoji
  reward_sc int not null default 50,
  threshold int,         -- valor necessário (ex: 30 dias)
  created_at timestamptz not null default now()
);

alter table public.sc_achievements enable row level security;

drop policy if exists "sc_achievements_read" on public.sc_achievements;
create policy "sc_achievements_read"
  on public.sc_achievements for select to authenticated using (true);

create table if not exists public.sc_user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null references public.sc_achievements(key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

alter table public.sc_user_achievements enable row level security;

drop policy if exists "sc_user_achievements_read_own" on public.sc_user_achievements;
create policy "sc_user_achievements_read_own"
  on public.sc_user_achievements for select to authenticated
  using (user_id = auth.uid());

-- Seed dos achievements mais comuns
insert into public.sc_achievements (key, name, description, icon, reward_sc, threshold) values
  ('first_trade',          'Primeiro trade',                'Registrou o primeiro trade no diário',             '🎯',   10,  1),
  ('first_positive_week',  'Primeira semana positiva',      'Fechou uma semana com resultado positivo',         '📈',   30,  1),
  ('30_days_discipline',   '30 dias sem quebrar regras',    'Manteve disciplina por 30 dias consecutivos',      '🛡',   200, 30),
  ('rank_predador',        'Virou Predador',                'Primeira evolução de rank (R$ 1.000 acumulado)',   '🔥',   100, 1000),
  ('rank_alpha',           'Virou Alpha',                   'Atingiu o rank máximo da matilha',                 '👑',   500, 50000),
  ('ficha_completa',       'Ficha completa',                'Preencheu toda a ficha de acompanhamento',         '📋',   20,  5),
  ('diagnostic_done',      'Auto-conhecimento',             'Completou o primeiro diagnóstico do trader',       '🩺',   10,  1),
  ('community_active',     'Matilha ativa',                 'Publicou 10 posts na comunidade',                  '🐺',   50,  10)
on conflict (key) do nothing;
