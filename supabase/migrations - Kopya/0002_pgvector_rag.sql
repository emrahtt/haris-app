-- ============================================================
-- HARIS Faz 6 — pgvector RAG + Storage (Faz 6.5 düzeltmesi)
-- ============================================================

-- 1) pgvector extension
create extension if not exists vector;

-- 2) RAG documents tablosu
create table if not exists public.rag_documents (
  id text primary key,
  category text not null check (
    category in ('yargitay', 'danistay', 'aym', 'aihm', 'mevzuat', 'doktrin')
  ),
  areas text[] not null default '{}',
  court text,
  case_no text,
  date text,
  article_no text,
  law_name text,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  url text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) HNSW index
create index if not exists rag_documents_embedding_hnsw
  on public.rag_documents
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4) Yardımcı indeksler
create index if not exists rag_documents_category_idx
  on public.rag_documents (category);
create index if not exists rag_documents_areas_gin
  on public.rag_documents using gin (areas);
create index if not exists rag_documents_tags_gin
  on public.rag_documents using gin (tags);

-- 5) RLS — herkes okuyabilir, sadece service role yazabilir
alter table public.rag_documents enable row level security;

drop policy if exists "rag_documents_select_all" on public.rag_documents;
create policy "rag_documents_select_all" on public.rag_documents
  for select using (true);

-- ============================================================
-- 6) ARAMA RPC — search_rag_documents
-- ============================================================
create or replace function public.search_rag_documents(
  query_embedding vector(1536),
  match_count int default 10,
  filter_categories text[] default null,
  filter_areas text[] default null
)
returns table (
  id text,
  category text,
  areas text[],
  court text,
  case_no text,
  date text,
  article_no text,
  law_name text,
  title text,
  content text,
  tags text[],
  url text,
  distance float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    d.id,
    d.category,
    d.areas,
    d.court,
    d.case_no,
    d.date,
    d.article_no,
    d.law_name,
    d.title,
    d.content,
    d.tags,
    d.url,
    (d.embedding <=> query_embedding)::float as distance
  from public.rag_documents d
  where (filter_categories is null or d.category = any(filter_categories))
    and (filter_areas is null or d.areas && filter_areas)
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 7) Updated_at trigger (set_updated_at fonksiyonu 0001'de tanımlı)
drop trigger if exists rag_documents_updated_at on public.rag_documents;
create trigger rag_documents_updated_at
  before update on public.rag_documents
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- 8) STORAGE BUCKET — case-documents
-- ============================================================
insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false)
on conflict (id) do nothing;

-- Storage RLS — Faz 6.5: path = userId/caseId/docId-fileName
-- İlk klasör (foldername[1]) = auth.uid() — kullanıcı sadece kendi klasörü
drop policy if exists "case_docs_select" on storage.objects;
drop policy if exists "case_docs_insert" on storage.objects;
drop policy if exists "case_docs_update" on storage.objects;
drop policy if exists "case_docs_delete" on storage.objects;

create policy "case_docs_select" on storage.objects
  for select using (
    bucket_id = 'case-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "case_docs_insert" on storage.objects
  for insert with check (
    bucket_id = 'case-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "case_docs_update" on storage.objects
  for update using (
    bucket_id = 'case-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "case_docs_delete" on storage.objects
  for delete using (
    bucket_id = 'case-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
