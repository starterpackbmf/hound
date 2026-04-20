-- Capa de módulo
alter table public.modules add column if not exists cover_url text;

-- Reusa o bucket course-covers pras capas de módulo (é público mesmo)
-- Sem policy adicional — 0024 já cobre.
