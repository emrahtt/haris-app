-- ============================================================
-- HARIS Migration 0009 — Workspace Documents Metadata
-- ============================================================
-- Faz 13.1: PDF Vision OCR + retry pipeline için ek metadata
--
-- Yeni alanlar:
--   error_message    — Kullanıcı dostu hata mesajı
--   extraction_meta  — jsonb (method, model, cost, duration)
--   (page_count zaten 0007'de var)
-- ============================================================

alter table public.workspace_documents
  add column if not exists error_message text,
  add column if not exists extraction_meta jsonb default '{}'::jsonb;

create index if not exists workspace_documents_status_error_idx
  on public.workspace_documents(status)
  where status = 'error';

-- ============================================================
-- DONE
-- ============================================================
