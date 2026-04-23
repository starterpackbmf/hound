-- Monitoria v2
-- ===============
-- 1) Contexto obrigatório ao solicitar sessão (motivo + categoria + prioridade)
-- 2) Fair-use (1 sessão ativa por vez, 1/semana, strike system)
-- 3) Notas da sessão (histórico cumulativo consultável por qualquer monitor)
-- 4) Plano de Execução v2 — período + MEN pts + max trades/dia + max stops seguidos

-- ============================================================
-- 1) Contexto nas solicitações
-- ============================================================
do $$ begin
  create type public.session_priority as enum ('rotina', 'acompanhamento', 'urgente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_category as enum (
    'tecnico', 'emocional', 'plano', 'revisar_trades', 'onboarding', 'outros'
  );
exception when duplicate_object then null; end $$;

alter table public.monitor_slots
  add column if not exists request_motivo text,
  add column if not exists request_categoria public.session_category,
  add column if not exists request_prioridade public.session_priority default 'rotina',
  add column if not exists request_attachment_url text;

-- Adiciona status 'no_show' ao enum (se ainda não existe)
do $$ begin
  alter type public.slot_status add value if not exists 'no_show';
exception when others then null; end $$;


-- ============================================================
-- 2) RPC request_monitor_slot com contexto + fair-use
-- ============================================================
create or replace function public.request_monitor_slot(
  slot_id uuid,
  p_motivo text default null,
  p_categoria public.session_category default null,
  p_prioridade public.session_priority default 'rotina',
  p_attachment_url text default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  slot public.monitor_slots;
  active_count int;
  week_count int;
  noshow_count int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED');
  end if;

  if p_motivo is null or char_length(trim(p_motivo)) < 5 then
    return jsonb_build_object('ok', false, 'error', 'MOTIVO_REQUIRED',
      'message', 'Descreva brevemente o que quer tratar (mínimo 5 caracteres).');
  end if;

  -- Lock do slot + check disponibilidade
  select * into slot from public.monitor_slots where id = slot_id for update;
  if not found or slot.status != 'disponivel' then
    return jsonb_build_object('ok', false, 'error', 'SLOT_UNAVAILABLE');
  end if;

  -- Fair-use: 1 sessão ativa por vez (solicitado ou reservado)
  select count(*) into active_count
    from public.monitor_slots
   where student_id = uid
     and status in ('solicitado', 'reservado')
     and starts_at >= now() - interval '1 hour';
  if active_count > 0 then
    return jsonb_build_object('ok', false, 'error', 'ACTIVE_SESSION_EXISTS',
      'message', 'Você já tem uma sessão ativa. Finalize-a ou cancele antes de solicitar outra.');
  end if;

  -- Fair-use: 1 sessão por semana rolante (se prioridade = rotina).
  -- Prioridade 'urgente' ou 'acompanhamento' ignora o limite (monitor decide).
  if p_prioridade = 'rotina' then
    select count(*) into week_count
      from public.monitor_slots
     where student_id = uid
       and status in ('solicitado', 'reservado', 'concluido')
       and requested_at >= now() - interval '7 days';
    if week_count >= 1 then
      return jsonb_build_object('ok', false, 'error', 'WEEK_LIMIT',
        'message', 'Você já agendou 1 sessão de rotina esta semana. Se é urgente, marque como prioridade.');
    end if;
  end if;

  -- Strike: 2 no-shows nos últimos 30 dias trava por 14d
  select count(*) into noshow_count
    from public.monitor_slots
   where student_id = uid
     and status = 'no_show'
     and starts_at >= now() - interval '30 days';
  if noshow_count >= 2 then
    return jsonb_build_object('ok', false, 'error', 'NO_SHOW_LOCKED',
      'message', 'Você faltou 2 sessões nos últimos 30 dias. Entre em contato com o suporte.');
  end if;

  -- Tudo ok → solicita
  update public.monitor_slots
     set status = 'solicitado',
         student_id = uid,
         requested_at = now(),
         request_motivo = trim(p_motivo),
         request_categoria = p_categoria,
         request_prioridade = coalesce(p_prioridade, 'rotina'),
         request_attachment_url = p_attachment_url
   where id = slot_id;

  return jsonb_build_object('ok', true);
end $$;


-- ============================================================
-- 3) Notas da sessão — histórico cumulativo
-- ============================================================
create table if not exists public.monitor_session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.monitor_slots(id) on delete set null,
  student_id uuid not null references auth.users(id) on delete cascade,
  monitor_id uuid not null references auth.users(id) on delete set null,

  summary_md text not null,        -- o que foi trabalhado
  tags text[] default array[]::text[],
  next_steps_md text,              -- próximos passos sugeridos

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists msn_student_idx on public.monitor_session_notes(student_id, created_at desc);
create index if not exists msn_session_idx on public.monitor_session_notes(session_id);

alter table public.monitor_session_notes enable row level security;

-- Aluno vê as próprias notas. Monitor/admin/imortal veem todas.
drop policy if exists "msn_select" on public.monitor_session_notes;
create policy "msn_select" on public.monitor_session_notes for select to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid()
               and p.roles && array['monitor','admin','imortal','suporte']::public.user_role[])
  );

-- Só monitor+ cria
drop policy if exists "msn_insert_monitor" on public.monitor_session_notes;
create policy "msn_insert_monitor" on public.monitor_session_notes for insert to authenticated
  with check (
    monitor_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid()
                and p.roles && array['monitor','admin','imortal']::public.user_role[])
  );

drop policy if exists "msn_update_owner" on public.monitor_session_notes;
create policy "msn_update_owner" on public.monitor_session_notes for update to authenticated
  using (monitor_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid()
    and p.roles && array['admin','imortal']::public.user_role[]
  ));


-- ============================================================
-- 4) Plano de Execução v2 — extends existing table
-- ============================================================
-- Enum de status (active/completed/paused/cancelled)
do $$ begin
  create type public.execution_plan_status as enum ('active', 'completed', 'paused', 'cancelled');
exception when duplicate_object then null; end $$;

alter table public.execution_plans
  add column if not exists status public.execution_plan_status not null default 'active',
  add column if not exists starts_at date,
  add column if not exists ends_at date,
  add column if not exists men_max_pts int,
  add column if not exists max_trades_per_day int,
  add column if not exists max_consecutive_stops int,
  add column if not exists extra_rules text[] default array[]::text[],
  add column if not exists source_session_id uuid references public.monitor_slots(id) on delete set null,
  add column if not exists title text;

-- Garante: quando um plano vira 'active', os anteriores viram 'completed'.
-- Alternativa: deixar o client gerenciar. Vou fazer trigger pra ficar blindado.
create or replace function public.ensure_single_active_execution_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' then
    update public.execution_plans
       set status = 'completed', active = false, updated_at = now()
     where user_id = new.user_id
       and id <> new.id
       and status = 'active';
  end if;
  return new;
end $$;

drop trigger if exists trg_ensure_single_active_plan on public.execution_plans;
create trigger trg_ensure_single_active_plan
  after insert or update of status on public.execution_plans
  for each row execute function public.ensure_single_active_execution_plan();


-- Helper pro aluno: pega o plano ativo atual (se algum)
create or replace function public.get_my_active_execution_plan()
returns setof public.execution_plans
language sql
stable
security definer
set search_path = public
as $$
  select * from public.execution_plans
   where user_id = auth.uid()
     and status = 'active'
   order by created_at desc
   limit 1;
$$;

grant execute on function public.get_my_active_execution_plan() to authenticated;
