-- Adiciona role 'suporte' no enum user_role (CS / Carla)
-- Precisa estar em migration separada porque Postgres não deixa
-- usar um valor de enum recém-adicionado na mesma transaction.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'user_role' and e.enumlabel = 'suporte'
  ) then
    alter type public.user_role add value 'suporte';
  end if;
end$$;
