-- ============================================================
-- MATILHA — Comunidade como feed (estilo Instagram/Twitter)
-- Substitui o modelo threaded. Categorias fixas.
-- ============================================================

do $$ begin
  create type public.post_category as enum ('relato', 'trade', 'dificuldade', 'leitura', 'geral');
exception when duplicate_object then null; end $$;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.post_category not null default 'geral',
  body text not null,
  image_url text,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx on public.community_posts(created_at desc);
create index if not exists community_posts_user_idx on public.community_posts(user_id);
create index if not exists community_posts_category_idx on public.community_posts(category);

alter table public.community_posts enable row level security;

drop policy if exists "community_posts_select_all" on public.community_posts;
create policy "community_posts_select_all"
  on public.community_posts for select to authenticated using (true);

drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own"
  on public.community_posts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_posts_update_own" on public.community_posts;
create policy "community_posts_update_own"
  on public.community_posts for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "community_posts_delete_own" on public.community_posts;
create policy "community_posts_delete_own"
  on public.community_posts for delete to authenticated
  using (auth.uid() = user_id);

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

-- COMENTÁRIOS (em posts da comunidade E em aulas) --------------
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade,
  lesson_panda_id text,   -- alternativa: comentário em aula (panda_video_id)
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check (post_id is not null or lesson_panda_id is not null)
);

create index if not exists community_comments_post_idx on public.community_comments(post_id, created_at);
create index if not exists community_comments_lesson_idx on public.community_comments(lesson_panda_id, created_at);

alter table public.community_comments enable row level security;

drop policy if exists "community_comments_select_all" on public.community_comments;
create policy "community_comments_select_all"
  on public.community_comments for select to authenticated using (true);

drop policy if exists "community_comments_insert_own" on public.community_comments;
create policy "community_comments_insert_own"
  on public.community_comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_comments_delete_own" on public.community_comments;
create policy "community_comments_delete_own"
  on public.community_comments for delete to authenticated
  using (auth.uid() = user_id);

-- Trigger: mantém comments_count do post sincronizado -----------
create or replace function public.bump_post_comments()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' and new.post_id is not null then
    update public.community_posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' and old.post_id is not null then
    update public.community_posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists community_comments_bump on public.community_comments;
create trigger community_comments_bump
  after insert or delete on public.community_comments
  for each row execute function public.bump_post_comments();

-- LIKES -------------------------------------------------------
create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.community_likes enable row level security;

drop policy if exists "community_likes_select_all" on public.community_likes;
create policy "community_likes_select_all"
  on public.community_likes for select to authenticated using (true);

drop policy if exists "community_likes_insert_own" on public.community_likes;
create policy "community_likes_insert_own"
  on public.community_likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_likes_delete_own" on public.community_likes;
create policy "community_likes_delete_own"
  on public.community_likes for delete to authenticated
  using (auth.uid() = user_id);

-- Trigger: mantém likes_count do post sincronizado --------------
create or replace function public.bump_post_likes()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists community_likes_bump on public.community_likes;
create trigger community_likes_bump
  after insert or delete on public.community_likes
  for each row execute function public.bump_post_likes();
