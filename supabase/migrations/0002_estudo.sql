-- ============================================================
-- MATILHA — área de estudo (0002_estudo)
-- ============================================================
-- Cursos → módulos (aninháveis) → aulas (vêm da API do Panda)
-- Materiais anexados a módulo ou vídeo. Progresso por usuário.
-- ============================================================

-- COURSES -----------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  cover_url text,
  allowed_roles public.user_role[] not null default array['individual','monitor','imortal','admin']::public.user_role[],
  order_index int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MODULES (self-referencing tree) -----------------------------
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  parent_id uuid references public.modules(id) on delete cascade,
  title text not null,
  description text,
  panda_folder_id uuid, -- quando setado, as aulas vêm desta pasta do Panda
  allowed_roles public.user_role[], -- null = herda do curso
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists modules_course_id_idx on public.modules(course_id);
create index if not exists modules_parent_id_idx on public.modules(parent_id);
-- Único por (course_id, panda_folder_id) — permite upsert no sync
create unique index if not exists modules_course_panda_folder_uniq
  on public.modules(course_id, panda_folder_id)
  where panda_folder_id is not null;

-- LESSON META (overrides por vídeo dentro de um módulo) -------
-- Não armazena a aula em si — ela vem do Panda. Só guarda o que nós
-- queremos customizar: ordem, título, must-watch, ocultar, descrição.
create table if not exists public.lesson_meta (
  module_id uuid not null references public.modules(id) on delete cascade,
  panda_video_id text not null,
  title_override text,
  description text,
  must_watch boolean not null default false,
  order_index int,
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (module_id, panda_video_id)
);

-- MATERIALS (PDFs, mapas mentais, links) ----------------------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id) on delete cascade,
  panda_video_id text, -- opcional: material atrelado a uma aula específica
  title text not null,
  kind text not null default 'link', -- 'pdf' | 'mindmap' | 'link' | 'image'
  url text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  check (module_id is not null or panda_video_id is not null)
);

create index if not exists materials_module_id_idx on public.materials(module_id);
create index if not exists materials_panda_video_id_idx on public.materials(panda_video_id);

-- LESSON PROGRESS (por usuário, por vídeo) --------------------
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  panda_video_id text not null,
  watched_percent numeric(5,2) not null default 0,
  watched_seconds int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, panda_video_id)
);

-- RLS ---------------------------------------------------------
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lesson_meta enable row level security;
alter table public.materials enable row level security;
alter table public.lesson_progress enable row level security;

-- Helper: get user's roles ------------------------------------
create or replace function public.current_user_roles()
returns public.user_role[]
language sql stable security definer
set search_path = public
as $$
  select roles from public.profiles where id = auth.uid();
$$;

-- Courses: qualquer usuário logado vê cursos published cujo
-- allowed_roles intersecta com os roles dele
drop policy if exists "courses_select_allowed" on public.courses;
create policy "courses_select_allowed"
  on public.courses for select
  to authenticated
  using (
    published and allowed_roles && public.current_user_roles()
  );

-- Modules: vê módulo se vê o curso-pai
drop policy if exists "modules_select_via_course" on public.modules;
create policy "modules_select_via_course"
  on public.modules for select
  to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and c.published
        and c.allowed_roles && public.current_user_roles()
    )
    and (allowed_roles is null or allowed_roles && public.current_user_roles())
  );

-- Lesson meta: segue o módulo
drop policy if exists "lesson_meta_select_via_module" on public.lesson_meta;
create policy "lesson_meta_select_via_module"
  on public.lesson_meta for select
  to authenticated
  using (
    exists (select 1 from public.modules m where m.id = module_id)
  );

-- Materials: segue o módulo
drop policy if exists "materials_select_via_module" on public.materials;
create policy "materials_select_via_module"
  on public.materials for select
  to authenticated
  using (
    module_id is null or exists (select 1 from public.modules m where m.id = module_id)
  );

-- Lesson progress: só o próprio usuário
drop policy if exists "lesson_progress_rw_own" on public.lesson_progress;
create policy "lesson_progress_rw_own"
  on public.lesson_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated_at triggers -----------------------------------------
drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

drop trigger if exists modules_set_updated_at on public.modules;
create trigger modules_set_updated_at
  before update on public.modules
  for each row execute function public.set_updated_at();

drop trigger if exists lesson_meta_set_updated_at on public.lesson_meta;
create trigger lesson_meta_set_updated_at
  before update on public.lesson_meta
  for each row execute function public.set_updated_at();

drop trigger if exists lesson_progress_set_updated_at on public.lesson_progress;
create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();
