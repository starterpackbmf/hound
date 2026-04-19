-- ============================================================
-- MATILHA — correção do enum de ranks + tabela de setups
-- ============================================================
-- Valida corrige o enum user_badge pros 6 níveis reais do Lovable:
-- Primeiro Instinto → Predador → Aprendiz de Caçador → Caçador → Killer → Alpha
-- Também formaliza os setups operacionais (TA/TC/TRM/FQ)
-- ============================================================

-- Novo enum com 6 níveis --------------------------------------
do $$ begin
  create type public.user_rank as enum (
    'primeiro_instinto',
    'predador',
    'aprendiz_cacador',
    'cacador',
    'killer',
    'alpha'
  );
exception when duplicate_object then null; end $$;

-- Migra a coluna current_badge pro novo enum
-- (como é nullable e ainda não tem dados reais, simplesmente recria)
alter table public.profiles
  alter column current_badge drop default;

alter table public.profiles
  alter column current_badge type public.user_rank
  using (
    case current_badge::text
      when 'primeiro_instinto' then 'primeiro_instinto'::public.user_rank
      when 'predador'          then 'predador'::public.user_rank
      when 'alfa'              then 'alpha'::public.user_rank
      when 'imortal'           then 'alpha'::public.user_rank
      else null
    end
  );

-- Remove o enum antigo se ninguém mais usar
do $$ begin
  drop type if exists public.user_badge cascade;
exception when others then null; end $$;

-- Tabela de thresholds (auditável + editável sem migration) ----
create table if not exists public.rank_thresholds (
  rank public.user_rank primary key,
  label text not null,
  min_result_brl numeric not null,
  order_index int not null,
  color_hex text
);

-- Seed dos thresholds
insert into public.rank_thresholds (rank, label, min_result_brl, order_index, color_hex) values
  ('primeiro_instinto',  'Primeiro Instinto',   0,      1, '#71717a'),
  ('predador',           'Predador',            1000,   2, '#f97316'),
  ('aprendiz_cacador',   'Aprendiz de Caçador', 5000,   3, '#22c55e'),
  ('cacador',            'Caçador',             10000,  4, '#3b82f6'),
  ('killer',             'Killer',              20000,  5, '#ef4444'),
  ('alpha',              'Alpha',               50000,  6, '#e4b528')
on conflict (rank) do update set
  label = excluded.label,
  min_result_brl = excluded.min_result_brl,
  order_index = excluded.order_index,
  color_hex = excluded.color_hex;

alter table public.rank_thresholds enable row level security;

drop policy if exists "rank_thresholds_select_all" on public.rank_thresholds;
create policy "rank_thresholds_select_all"
  on public.rank_thresholds for select
  to authenticated
  using (true);

-- Função pra calcular o rank atual baseado no resultado acumulado
create or replace function public.compute_rank(result_brl numeric)
returns public.user_rank
language sql stable
as $$
  select rank
  from public.rank_thresholds
  where min_result_brl <= coalesce(result_brl, 0)
  order by order_index desc
  limit 1;
$$;

-- ENUM DE SETUPS ----------------------------------------------
do $$ begin
  create type public.trade_setup as enum ('TA', 'TC', 'TRM', 'FQ');
exception when duplicate_object then null; end $$;

create table if not exists public.setups (
  code public.trade_setup primary key,
  name text not null,
  description text,
  order_index int not null
);

insert into public.setups (code, name, description, order_index) values
  ('TA',  'Trade de Abertura',    'Operação nos primeiros 15-30min do pregão, explorando a volatilidade inicial.', 1),
  ('TC',  'Trade de Continuação', 'Continuação de tendência já estabelecida após consolidação.',                   2),
  ('TRM', 'Retorno às Médias',    'Pullback pras médias móveis em tendência clara.',                               3),
  ('FQ',  'Falha e Quebra',       'Rompimento após falha num nível relevante (Fibo, suporte/resistência).',        4)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  order_index = excluded.order_index;

alter table public.setups enable row level security;

drop policy if exists "setups_select_all" on public.setups;
create policy "setups_select_all"
  on public.setups for select
  to authenticated
  using (true);
