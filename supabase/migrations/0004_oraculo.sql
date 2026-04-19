-- ============================================================
-- MATILHA — Oráculo (RAG chat com base no conteúdo da mentoria)
-- ============================================================
-- Requer a extensão pgvector. Habilitar no dashboard:
--   Database → Extensions → "vector" → enable.
-- ============================================================

create extension if not exists vector;

-- CONVERSATIONS -----------------------------------------------
create table if not exists public.oraculo_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists oraculo_conversations_user_idx on public.oraculo_conversations(user_id);

-- MESSAGES ----------------------------------------------------
create table if not exists public.oraculo_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.oraculo_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tokens_input int,
  tokens_output int,
  sources jsonb, -- [{source_ref, chunk_index, score}, ...]
  created_at timestamptz not null default now()
);

create index if not exists oraculo_messages_conversation_idx on public.oraculo_messages(conversation_id, created_at);

-- KNOWLEDGE CHUNKS (embeddings pra RAG) -----------------------
-- source_kind: 'aula' | 'pdf' | 'mindmap' | 'transcricao' | etc.
-- source_ref: id ou slug do conteúdo original (ex: panda_video_id, material_id)
create table if not exists public.oraculo_chunks (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null,
  source_ref text not null,
  source_title text,
  chunk_index int not null default 0,
  content text not null,
  embedding vector(1536), -- compatível com voyage-3-lite / OpenAI ada-002 / text-embedding-3-small
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists oraculo_chunks_source_idx on public.oraculo_chunks(source_kind, source_ref);
-- IVFFLAT index pra busca vetorial rápida (criar após ter volume de dados)
-- create index if not exists oraculo_chunks_embedding_idx
--   on public.oraculo_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- MATCH FUNCTION ----------------------------------------------
-- Busca top-K chunks mais similares ao embedding fornecido.
create or replace function public.oraculo_match_chunks(
  query_embedding vector(1536),
  match_count int default 8,
  min_similarity float default 0.3
)
returns table (
  id uuid,
  source_kind text,
  source_ref text,
  source_title text,
  chunk_index int,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    c.id, c.source_kind, c.source_ref, c.source_title, c.chunk_index, c.content, c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.oraculo_chunks c
  where c.embedding is not null
    and (1 - (c.embedding <=> query_embedding)) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- RLS ---------------------------------------------------------
alter table public.oraculo_conversations enable row level security;
alter table public.oraculo_messages enable row level security;
alter table public.oraculo_chunks enable row level security;

drop policy if exists "oraculo_conversations_rw_own" on public.oraculo_conversations;
create policy "oraculo_conversations_rw_own"
  on public.oraculo_conversations for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "oraculo_messages_rw_via_conversation" on public.oraculo_messages;
create policy "oraculo_messages_rw_via_conversation"
  on public.oraculo_messages for all to authenticated
  using (exists (select 1 from public.oraculo_conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.oraculo_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- Chunks: todos mentorados autenticados podem ler; só service_role grava.
drop policy if exists "oraculo_chunks_read_authenticated" on public.oraculo_chunks;
create policy "oraculo_chunks_read_authenticated"
  on public.oraculo_chunks for select to authenticated
  using (true);

-- Triggers ----------------------------------------------------
drop trigger if exists oraculo_conversations_set_updated_at on public.oraculo_conversations;
create trigger oraculo_conversations_set_updated_at
  before update on public.oraculo_conversations
  for each row execute function public.set_updated_at();
