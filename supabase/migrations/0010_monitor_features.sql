-- ============================================================
-- MATILHA — Plano de Execução + Agenda de Monitoria + Resgates
-- ============================================================

-- PLANO DE EXECUÇÃO -------------------------------------------
-- Monitor define o plano operacional do aluno (stops, regras, contratos).
create table if not exists public.execution_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  defined_by uuid references auth.users(id) on delete set null, -- monitor
  active boolean not null default true,

  -- Regras operacionais
  stop_diario_brl numeric,             -- stop máx de perda no dia (R$)
  stop_mensal_brl numeric,             -- stop máx de perda no mês (R$)
  stop_por_trade_brl numeric,          -- risco máx por trade (R$)
  contratos_maximos int,               -- contratos máx por trade
  setups_permitidos public.trade_setup[] not null default array['TA','TC','TRM','FQ']::public.trade_setup[],
  ativos_permitidos text[] not null default array['WIN','WDO']::text[],
  horario_limite time,                 -- não operar depois deste horário
  melhor_de_3 boolean not null default false,  -- regra "melhor de 3 trades"
  melhor_de_5 boolean not null default false,  -- regra "melhor de 5 trades"

  -- Contexto qualitativo
  observacoes text,
  objetivos_semana text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists execution_plans_user_active_idx on public.execution_plans(user_id, active) where active;

alter table public.execution_plans enable row level security;

-- Aluno vê seu próprio plano
drop policy if exists "execution_plans_select_own" on public.execution_plans;
create policy "execution_plans_select_own"
  on public.execution_plans for select to authenticated
  using (auth.uid() = user_id);

-- Monitor (role monitor/admin) pode ver/escrever qualquer plano
drop policy if exists "execution_plans_mod_monitors" on public.execution_plans;
create policy "execution_plans_mod_monitors"
  on public.execution_plans for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.roles && array['monitor','admin']::public.user_role[]
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.roles && array['monitor','admin']::public.user_role[]
    )
  );

drop trigger if exists execution_plans_set_updated_at on public.execution_plans;
create trigger execution_plans_set_updated_at
  before update on public.execution_plans
  for each row execute function public.set_updated_at();

-- AGENDA DE MONITORIA -----------------------------------------
do $$ begin
  create type public.slot_status as enum ('disponivel', 'solicitado', 'reservado', 'concluido', 'cancelado', 'bloqueado');
exception when duplicate_object then null; end $$;

create table if not exists public.monitor_slots (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  duration_min int not null default 60,
  status public.slot_status not null default 'disponivel',
  student_id uuid references auth.users(id) on delete set null,
  requested_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  meeting_url text,          -- link da call (Jitsi / Daily / Meet)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists monitor_slots_monitor_starts_idx on public.monitor_slots(monitor_id, starts_at);
create index if not exists monitor_slots_student_idx on public.monitor_slots(student_id);
create index if not exists monitor_slots_status_idx on public.monitor_slots(status);

alter table public.monitor_slots enable row level security;

-- Todos os autenticados veem slots disponíveis e seus próprios (aluno ou monitor)
drop policy if exists "monitor_slots_select_relevant" on public.monitor_slots;
create policy "monitor_slots_select_relevant"
  on public.monitor_slots for select to authenticated
  using (
    status = 'disponivel'
    or monitor_id = auth.uid()
    or student_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]
    )
  );

-- Monitor cria/gerencia seus slots; alunos podem requisitar
drop policy if exists "monitor_slots_monitor_crud" on public.monitor_slots;
create policy "monitor_slots_monitor_crud"
  on public.monitor_slots for all to authenticated
  using (monitor_id = auth.uid())
  with check (monitor_id = auth.uid());

-- RPC pra aluno requisitar um slot disponível
create or replace function public.request_monitor_slot(slot_id uuid)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare
  uid uuid := auth.uid();
  slot public.monitor_slots;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not authenticated'); end if;
  select * into slot from public.monitor_slots where id = slot_id for update;
  if not found or slot.status != 'disponivel' then
    return jsonb_build_object('ok', false, 'error', 'slot indisponível');
  end if;
  update public.monitor_slots
  set status = 'solicitado',
      student_id = uid,
      requested_at = now()
  where id = slot_id;
  return jsonb_build_object('ok', true);
end $$;

-- RPC pra monitor confirmar uma solicitação
create or replace function public.confirm_monitor_slot(slot_id uuid, meeting_url_arg text default null)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare
  uid uuid := auth.uid();
  slot public.monitor_slots;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not authenticated'); end if;
  select * into slot from public.monitor_slots where id = slot_id for update;
  if not found or slot.monitor_id != uid then
    return jsonb_build_object('ok', false, 'error', 'slot não é seu');
  end if;
  if slot.status not in ('solicitado', 'reservado') then
    return jsonb_build_object('ok', false, 'error', 'slot não pode ser confirmado');
  end if;
  update public.monitor_slots
  set status = 'reservado',
      confirmed_at = now(),
      meeting_url = coalesce(meeting_url_arg, meeting_url)
  where id = slot_id;
  return jsonb_build_object('ok', true);
end $$;

drop trigger if exists monitor_slots_set_updated_at on public.monitor_slots;
create trigger monitor_slots_set_updated_at
  before update on public.monitor_slots
  for each row execute function public.set_updated_at();

-- RESGATES DA PACK STORE (aprovação do monitor) ---------------
do $$ begin
  create type public.redemption_status as enum ('pendente', 'entregue', 'cancelado');
exception when duplicate_object then null; end $$;

-- Recria redemption_requests com estrutura completa
create table if not exists public.redemption_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.packstore_items(id) on delete restrict,
  cost_coins int not null,
  status public.redemption_status not null default 'pendente',
  shipping_info jsonb,           -- endereço, tamanho, etc.
  delivered_at timestamptz,
  delivered_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists redemption_user_idx on public.redemption_requests(user_id, created_at desc);
create index if not exists redemption_status_idx on public.redemption_requests(status);

alter table public.redemption_requests enable row level security;

drop policy if exists "redemption_select_own_or_monitor" on public.redemption_requests;
create policy "redemption_select_own_or_monitor"
  on public.redemption_requests for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[])
  );

drop policy if exists "redemption_insert_own" on public.redemption_requests;
create policy "redemption_insert_own"
  on public.redemption_requests for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "redemption_update_monitor" on public.redemption_requests;
create policy "redemption_update_monitor"
  on public.redemption_requests for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['monitor','admin']::public.user_role[]))
  with check (true);

drop trigger if exists redemption_requests_set_updated_at on public.redemption_requests;
create trigger redemption_requests_set_updated_at
  before update on public.redemption_requests
  for each row execute function public.set_updated_at();

-- Hook: a RPC packstore_purchase já existente vai criar um redemption_request
-- pendente além da transação de moedas (update em 0011 se necessário).
