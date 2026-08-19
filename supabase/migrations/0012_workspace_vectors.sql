-- ============================================================
-- HARIS Faz 13.6 — Sprint 1: Per-Workspace Vector RAG
-- ============================================================
-- Amaç: Her matter/dava kendi vektör namespace'ine sahip olsun.
-- Semantic search 2 katmanlı çalışsın:
--   1) Matter-scoped: workspace_document_chunks (bu davanın belgeleri)
--   2) Global:        rag_documents (mevzuat + Yargıtay içtihat)
--
-- Böylece "boşanma davasında geçici tedbir" araması sadece
-- o davanın belgelerinde + global mevzuatta yapılır, başka
-- müvekkilin dosyasına asla sızıntı olmaz.
-- ============================================================

-- 1) Chunk tablosu — her belge küçük parçalara bölünüp embed edilir
create table if not exists public.workspace_document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.workspace_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  content_hash text not null,          -- SHA256 (dedup için)
  token_count int,
  page_number int,                     -- PDF sayfası (varsa)
  section_title text,                  -- Bölüm başlığı (varsa)
  embedding vector(1536),              -- text-embedding-3-large (1536-dim truncated)
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

-- 2) HNSW index — hızlı semantic search
create index if not exists workspace_chunks_embedding_hnsw
  on public.workspace_document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 3) Yardımcı indeksler
create index if not exists workspace_chunks_workspace_idx
  on public.workspace_document_chunks (workspace_id);
create index if not exists workspace_chunks_document_idx
  on public.workspace_document_chunks (document_id);
create index if not exists workspace_chunks_hash_idx
  on public.workspace_document_chunks (content_hash);

-- 4) RLS — sadece workspace sahibi + shared user'lar görür
alter table public.workspace_document_chunks enable row level security;

drop policy if exists "workspace_chunks_select" on public.workspace_document_chunks;
create policy "workspace_chunks_select" on public.workspace_document_chunks
  for select using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_document_chunks.workspace_id
        and (
          w.user_id = (select auth.uid())
          or exists (
            select 1 from public.workspace_shares s
            where s.workspace_id = w.id
              and s.shared_with_user_id = (select auth.uid())
          )
        )
    )
  );

drop policy if exists "workspace_chunks_insert" on public.workspace_document_chunks;
create policy "workspace_chunks_insert" on public.workspace_document_chunks
  for insert with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_document_chunks.workspace_id
        and w.user_id = (select auth.uid())
    )
  );

drop policy if exists "workspace_chunks_delete" on public.workspace_document_chunks;
create policy "workspace_chunks_delete" on public.workspace_document_chunks
  for delete using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_document_chunks.workspace_id
        and w.user_id = (select auth.uid())
    )
  );


-- ============================================================
-- 5) MATTER-SCOPED SEARCH RPC
-- ============================================================
-- Bu RPC RLS altında çalışır — kullanıcı sadece erişimi olan
-- workspace'lerin chunk'larını görebilir.
create or replace function public.search_workspace_chunks(
  p_workspace_id uuid,
  query_embedding vector(1536),
  match_count int default 8,
  min_similarity float default 0.5
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  page_number int,
  section_title text,
  similarity float,
  metadata jsonb
)
language plpgsql
security invoker              -- ÖNEMLİ: RLS aktif kalsın (user context)
set search_path = public
as $$
begin
  return query
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.page_number,
    c.section_title,
    (1 - (c.embedding <=> query_embedding))::float as similarity,
    c.metadata
  from public.workspace_document_chunks c
  where c.workspace_id = p_workspace_id
    and c.embedding is not null
    and (1 - (c.embedding <=> query_embedding)) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.search_workspace_chunks(uuid, vector, int, float)
  to authenticated;


-- ============================================================
-- 6) GLOBAL LEGAL SEARCH RPC (existing rag_documents üzerinde)
-- ============================================================
-- Zaten search_rag_documents var (0002), fakat 13.6'da matter'a
-- ek olarak paralel çağrılacak — helper wrapper ekliyoruz ki
-- app tarafı tek arayüzden çağırsın.
create or replace function public.search_global_law(
  query_embedding vector(1536),
  match_count int default 5,
  filter_categories text[] default null,
  filter_areas text[] default null
)
returns table (
  id text,
  category text,
  title text,
  content text,
  court text,
  case_no text,
  date text,
  article_no text,
  law_name text,
  url text,
  similarity float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id,
    r.category,
    r.title,
    r.content,
    r.court,
    r.case_no,
    r.date,
    r.article_no,
    r.law_name,
    r.url,
    (1 - (r.embedding <=> query_embedding))::float as similarity
  from public.rag_documents r
  where r.embedding is not null
    and (filter_categories is null or r.category = any (filter_categories))
    and (filter_areas is null or r.areas && filter_areas)
  order by r.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.search_global_law(vector, int, text[], text[])
  to authenticated, anon;


-- ============================================================
-- 7) İSTATİSTİK VIEW — Workspace başına chunk sayısı
-- ============================================================
create or replace view public.workspace_rag_stats
with (security_invoker = true) as
select
  w.id as workspace_id,
  w.title as workspace_title,
  w.user_id,
  count(distinct c.document_id) as documents_indexed,
  count(c.id) as total_chunks,
  sum(c.token_count) as total_tokens,
  max(c.created_at) as last_indexed_at
from public.workspaces w
left join public.workspace_document_chunks c on c.workspace_id = w.id
group by w.id, w.title, w.user_id;

grant select on public.workspace_rag_stats to authenticated;

-- ============================================================
-- BİTTİ. Sonraki migration (0013) → parties + conflict_checks
-- ============================================================
