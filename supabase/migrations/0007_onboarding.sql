-- ============================================================
-- MATILHA — onboarding do aluno (Minha Ficha + Metas + Dificuldades + Diagnóstico)
-- ============================================================

-- Enums auxiliares --------------------------------------------
do $$ begin
  create type public.experience_level as enum ('menos_6m', '6m_1a', '1_2a', 'mais_2a');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ops_per_day as enum ('1_3', '4_6', '7_10', 'mais_10');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.main_asset as enum ('WIN', 'WDO', 'AMBOS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.behavior_freq as enum ('nunca', 'as_vezes', 'com_frequencia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.goal_range as enum ('curto', 'medio', 'longo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.goal_status as enum ('aberta', 'atingida', 'cancelada');
exception when duplicate_object then null; end $$;

-- FICHA DE ACOMPANHAMENTO -------------------------------------
create table if not exists public.ficha_acompanhamento (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- 1. Dados pessoais
  nome_completo text,
  prefere_ser_chamado text,
  whatsapp text,
  cidade text,
  estado text,
  idade int,

  -- 2. Experiência
  tempo_mercado public.experience_level,
  ativo_principal public.main_asset,
  media_ops_dia public.ops_per_day,
  mentoria_previa boolean,

  -- 3. Raio-X Comportamental — Disciplina Técnica
  aceita_stop_tecnico public.behavior_freq,
  entra_antes_gatilho public.behavior_freq,
  entra_por_comentario public.behavior_freq,

  -- 3.2. Controle Emocional
  afasta_stop public.behavior_freq,
  aumenta_posicao_apos_loss public.behavior_freq,

  -- 3.3. Evolução
  registra_erros_no_diario public.behavior_freq,

  -- 4. Dificuldades percebidas (múltiplas)
  dificuldades text[] not null default array[]::text[],

  -- 5. Objetivos
  objetivo text,
  mensagem_monitor text,

  -- Progresso e auditoria
  secoes_preenchidas int not null default 0,
  concluida boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ficha_acompanhamento enable row level security;

drop policy if exists "ficha_rw_own" on public.ficha_acompanhamento;
create policy "ficha_rw_own"
  on public.ficha_acompanhamento for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists ficha_set_updated_at on public.ficha_acompanhamento;
create trigger ficha_set_updated_at
  before update on public.ficha_acompanhamento
  for each row execute function public.set_updated_at();

-- METAS (3 buckets: curto/médio/longo prazo) ------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  range public.goal_range not null,
  title text not null,
  description text,
  target_date date,
  status public.goal_status not null default 'aberta',
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_range_idx on public.goals(user_id, range);

alter table public.goals enable row level security;

drop policy if exists "goals_rw_own" on public.goals;
create policy "goals_rw_own"
  on public.goals for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- ÁRVORE DE DIFICULDADES (self-referencing) -------------------
create table if not exists public.difficulties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.difficulties(id) on delete cascade,
  kind text not null default 'dificuldade', -- 'dificuldade' | 'causa' | 'solucao'
  title text not null,
  notes text,
  resolved boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists difficulties_user_idx on public.difficulties(user_id);
create index if not exists difficulties_parent_idx on public.difficulties(parent_id);

alter table public.difficulties enable row level security;

drop policy if exists "difficulties_rw_own" on public.difficulties;
create policy "difficulties_rw_own"
  on public.difficulties for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists difficulties_set_updated_at on public.difficulties;
create trigger difficulties_set_updated_at
  before update on public.difficulties
  for each row execute function public.set_updated_at();

-- DIAGNÓSTICOS (quiz de 6 perguntas, histórico) ---------------
create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null, -- ex: {"q1":"a","q2":"b",...}
  result_summary text,    -- conclusão gerada
  result_tags text[] not null default array[]::text[], -- ex: ['impulsivo','averso_risco']
  created_at timestamptz not null default now()
);

create index if not exists diagnostics_user_idx on public.diagnostics(user_id, created_at desc);

alter table public.diagnostics enable row level security;

drop policy if exists "diagnostics_rw_own" on public.diagnostics;
create policy "diagnostics_rw_own"
  on public.diagnostics for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recompensa: +10 SC quando completa o diagnóstico ------------
-- (acionado via RPC coins_earn('diagnostic_complete', 10) no app)
