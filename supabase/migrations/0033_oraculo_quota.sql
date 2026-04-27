-- Quota diária do Oráculo por aluno.
-- Default: 20 perguntas/dia pra mentorado, 0 pra free.
-- Reseta meia-noite local (date BR via timezone).

create table if not exists public.oraculo_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists oraculo_usage_user_idx on public.oraculo_usage(user_id, date desc);

alter table public.oraculo_usage enable row level security;

-- Aluno lê só o próprio. Admin/suporte vê todos (futuro dashboard CS)
drop policy if exists "oraculo_usage_read_own" on public.oraculo_usage;
create policy "oraculo_usage_read_own"
  on public.oraculo_usage for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid()
               and p.roles && array['admin','suporte']::public.user_role[])
  );

-- Insert/update vão via RPC (security definer), aluno não escreve direto.

-- ============================================================
-- RPC: increment + retorna { ok, used, limit, remaining }
-- ============================================================
create or replace function public.oraculo_consume_quota(p_limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (current_timestamp at time zone 'America/Sao_Paulo')::date;
  used int;
  is_premium boolean;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHENTICATED');
  end if;

  -- Premium check (mentorado vs free)
  select coalesce(p.status = 'ativo' and (
    p.roles && array['individual','monitor','imortal','admin','suporte']::public.user_role[]
  ), false)
    into is_premium
    from public.profiles p where p.id = uid;

  if not is_premium then
    return jsonb_build_object('ok', false, 'error', 'PREMIUM_ONLY',
      'message', 'O Oráculo é exclusivo pra mentorados.');
  end if;

  -- Upsert + incremento atômico
  insert into public.oraculo_usage(user_id, date, count)
    values (uid, today, 1)
  on conflict (user_id, date) do update
    set count = oraculo_usage.count + 1,
        updated_at = now()
  returning count into used;

  if used > p_limit then
    -- Estourou — decrementa pra não contar
    update public.oraculo_usage
       set count = count - 1, updated_at = now()
     where user_id = uid and date = today;
    return jsonb_build_object('ok', false, 'error', 'QUOTA_EXCEEDED',
      'used', p_limit, 'limit', p_limit, 'remaining', 0,
      'message', 'Você bateu ' || p_limit || ' perguntas hoje. Volta amanhã ou conversa com seu monitor.');
  end if;

  return jsonb_build_object('ok', true, 'used', used, 'limit', p_limit, 'remaining', p_limit - used);
end $$;

grant execute on function public.oraculo_consume_quota(int) to authenticated;


-- ============================================================
-- Helper read-only: quanto ainda tenho hoje?
-- ============================================================
create or replace function public.oraculo_quota_status(p_limit int default 20)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'used', coalesce(u.count, 0),
    'limit', p_limit,
    'remaining', greatest(0, p_limit - coalesce(u.count, 0))
  )
  from (select 1) _
  left join public.oraculo_usage u
    on u.user_id = auth.uid()
   and u.date = (current_timestamp at time zone 'America/Sao_Paulo')::date;
$$;

grant execute on function public.oraculo_quota_status(int) to authenticated;
