-- Signup com pre-approval
-- =======================
-- Fluxo:
-- 1) Admin seeda emails autorizados em `pre_approved_emails` (um por aluno migrado)
-- 2) Aluno vai em /signup → cria conta (nome/email/senha/whatsapp)
-- 3) Trigger em auth.users/profiles checa pre_approved_emails pelo email:
--    - Se achou → status='ativo', herda lovable_student_id
--    - Senão   → status='pendente' (fica em /mentor/solicitacoes)

create table if not exists public.pre_approved_emails (
  email text primary key,                     -- lower-cased
  name_hint text,                              -- nome esperado (pré-preenchido via sync Lovable)
  whatsapp_hint text,
  lovable_student_id uuid,                    -- pra sync automático
  roles public.user_role[] default array['individual']::public.user_role[],
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  consumed_at timestamptz,                     -- quando foi usada no signup
  consumed_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists pae_email_idx on public.pre_approved_emails(email);

alter table public.pre_approved_emails enable row level security;

-- Só admin/suporte leem/editam. Aluno não precisa ver.
drop policy if exists "pae_admin_rw" on public.pre_approved_emails;
create policy "pae_admin_rw" on public.pre_approved_emails for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()
                 and p.roles && array['admin','suporte']::public.user_role[]))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
                      and p.roles && array['admin','suporte']::public.user_role[]));


-- ============================================================
-- Trigger: quando um profile é criado, verifica pre_approved_emails
-- ============================================================
-- A app pode já estar criando profile via handler de signup em outro lugar.
-- Pra ficar blindado, o trigger olha pelo email (disponível via auth.users).
create or replace function public.apply_pre_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ua record;
  preap record;
begin
  -- Busca email via auth.users
  select email into ua from auth.users where id = new.id;
  if ua.email is null then
    return new;
  end if;

  select * into preap from public.pre_approved_emails
   where lower(email) = lower(ua.email);

  if found then
    -- Auto-aprova
    new.status := 'ativo';
    if new.roles is null or array_length(new.roles, 1) is null then
      new.roles := coalesce(preap.roles, array['individual']::public.user_role[]);
    end if;
    if preap.lovable_student_id is not null and new.lovable_student_id is null then
      new.lovable_student_id := preap.lovable_student_id;
    end if;
    if preap.name_hint is not null and (new.name is null or new.name = '') then
      new.name := preap.name_hint;
    end if;
    if preap.whatsapp_hint is not null and (new.whatsapp is null or new.whatsapp = '') then
      new.whatsapp := preap.whatsapp_hint;
    end if;

    -- Marca como consumido
    update public.pre_approved_emails
       set consumed_at = now(), consumed_by_user_id = new.id
     where email = preap.email;
  end if;

  return new;
end $$;

drop trigger if exists trg_apply_pre_approval on public.profiles;
create trigger trg_apply_pre_approval
  before insert on public.profiles
  for each row execute function public.apply_pre_approval();


-- ============================================================
-- Handler pós-signup: garante que existe profile pro user
-- ============================================================
-- Se o fluxo atual do app não cria profile automaticamente,
-- esse trigger em auth.users resolve.
create or replace function public.ensure_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_name text;
  new_whatsapp text;
begin
  -- name pode vir em raw_user_meta_data.name
  new_name := coalesce(new.raw_user_meta_data->>'name', '');
  new_whatsapp := coalesce(new.raw_user_meta_data->>'whatsapp', '');

  insert into public.profiles(id, email, name, whatsapp)
    values (new.id, new.email, nullif(new_name, ''), nullif(new_whatsapp, ''))
  on conflict (id) do nothing;

  return new;
end $$;

drop trigger if exists trg_ensure_profile_on_signup on auth.users;
create trigger trg_ensure_profile_on_signup
  after insert on auth.users
  for each row execute function public.ensure_profile_on_signup();
