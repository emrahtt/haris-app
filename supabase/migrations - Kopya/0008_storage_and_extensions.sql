-- ============================================================
-- HARIS Migration 0008 — Faz 13: Storage Bucket + Sharing + Tabular Review
-- ============================================================
-- Önceki: 0001-0007
-- Bu migration:
--   1. workspace-documents Storage bucket (Vault için)
--   2. workspace_shares tablosu (multi-user collaboration)
--   3. tabular_reviews tablosu (Legora benzeri matris)
--   4. petition_versions için ek alanlar (Tiptap JSON snapshot)
-- ============================================================

-- ============================================================
-- 1. STORAGE BUCKET — workspace-documents
-- ============================================================
-- NOT: Bucket'lar Supabase Dashboard'dan veya storage.objects'e
-- doğrudan insert ile oluşturulur. Aşağıdaki INSERT idempotent:

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-documents',
  'workspace-documents',
  false, -- private bucket
  52428800, -- 50 MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/octet-stream', -- UDF için
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS — sadece sahibi yükler/okur
-- ÖNEMLİ: storage.objects RLS politikası

drop policy if exists "workspace_documents_owner_select" on storage.objects;
create policy "workspace_documents_owner_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'workspace-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "workspace_documents_owner_insert" on storage.objects;
create policy "workspace_documents_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'workspace-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "workspace_documents_owner_delete" on storage.objects;
create policy "workspace_documents_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'workspace-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 2. workspace_documents — storage_path zaten 0007'de tanımlı, sadece index ekle
-- ============================================================
create index if not exists workspace_documents_storage_path_idx
  on public.workspace_documents(storage_path)
  where storage_path is not null;

-- ============================================================
-- 3. workspace_shares — multi-user collaboration (hafif sürüm)
-- ============================================================
create table if not exists public.workspace_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_email text not null, -- email ile davet, kullanıcı yoksa pending kalır
  shared_with_user_id uuid references auth.users(id) on delete cascade, -- davet kabul edilince doldurulur
  role text not null default 'viewer' check (role in ('viewer','editor','admin')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  
  unique(workspace_id, shared_with_email)
);

create index if not exists workspace_shares_workspace_idx
  on public.workspace_shares(workspace_id);
create index if not exists workspace_shares_email_idx
  on public.workspace_shares(shared_with_email);
create index if not exists workspace_shares_user_idx
  on public.workspace_shares(shared_with_user_id) where shared_with_user_id is not null;

alter table public.workspace_shares enable row level security;

drop policy if exists "workspace_shares_owner_all" on public.workspace_shares;
create policy "workspace_shares_owner_all"
on public.workspace_shares for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "workspace_shares_recipient_select" on public.workspace_shares;
create policy "workspace_shares_recipient_select"
on public.workspace_shares for select
using (
  shared_with_user_id = auth.uid()
  or (
    shared_with_email = (auth.jwt()->>'email')
    and status = 'pending'
  )
);

-- ============================================================
-- 4. tabular_reviews — Legora benzeri belge matrisi
-- ============================================================
create table if not exists public.tabular_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  title text not null default 'Belge Matrisi',
  -- Sütunlar: kullanıcı tanımlı sorular (örn. "Tarih?", "Tutar?", "İmza var mı?")
  columns jsonb not null default '[]'::jsonb,
  -- Satırlar: doc_id -> {column_id: value_with_source_ref} eşlemesi
  rows jsonb not null default '{}'::jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tabular_reviews_workspace_idx
  on public.tabular_reviews(workspace_id);

alter table public.tabular_reviews enable row level security;

drop policy if exists "tabular_reviews_owner_all" on public.tabular_reviews;
create policy "tabular_reviews_owner_all"
on public.tabular_reviews for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists tabular_reviews_touch on public.tabular_reviews;
create trigger tabular_reviews_touch before update on public.tabular_reviews
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 5. petition_versions — Tiptap için ek alanlar zaten 0007'de var (content_json jsonb)
-- ============================================================
-- ek index — son versiyon hızlı erişim
create index if not exists petition_versions_latest_idx
  on public.petition_versions(workspace_id, version_number desc);

-- ============================================================
-- 6. workspaces RLS güncellemesi — paylaşılan workspace erişimi
-- ============================================================
-- Mevcut: workspaces_owner_all (auth.uid = user_id)
-- Yeni: kabul edilmiş share varsa SELECT erişimi
drop policy if exists "workspaces_shared_select" on public.workspaces;
create policy "workspaces_shared_select"
on public.workspaces for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.workspace_shares ws
    where ws.workspace_id = workspaces.id
      and ws.shared_with_user_id = auth.uid()
      and ws.status = 'accepted'
  )
);

-- Editor rolü için workspace_documents update erişimi
drop policy if exists "workspace_documents_editor_update" on public.workspace_documents;
create policy "workspace_documents_editor_update"
on public.workspace_documents for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.workspace_shares ws
    where ws.workspace_id = workspace_documents.workspace_id
      and ws.shared_with_user_id = auth.uid()
      and ws.status = 'accepted'
      and ws.role in ('editor', 'admin')
  )
);

-- ============================================================
-- DONE
-- ============================================================
-- Bu migration'ı Supabase Dashboard → SQL Editor'da çalıştırın.
-- Bucket otomatik oluşacaktır.
-- ============================================================
