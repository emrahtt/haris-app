-- ============================================================
-- HARIS Faz 7 — Scraping Infrastructure
-- ============================================================
-- Yargıtay/Danıştay/AYM karar arama scraping işleri.
-- Job queue, scraped raw data, source provenance.
-- ============================================================

-- 1) scraping_jobs: işleri takip eder
create table if not exists public.scraping_jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (
    source in ('yargitay', 'danistay', 'aym', 'aihm', 'mevzuat_gov_tr', 'demo')
  ),
  query text,                              -- arama sorgusu (örn: "trafik kazası maluliyet")
  filter_court text,                       -- daire/mahkeme filtresi
  filter_date_from date,
  filter_date_to date,
  status text not null default 'queued' check (
    status in ('queued', 'running', 'done', 'failed', 'cancelled')
  ),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  total_found int default 0,
  total_scraped int default 0,
  total_indexed int default 0,             -- pgvector'a yazılan
  total_failed int default 0,
  error_message text,
  -- Cron tarafından mı manuel mi?
  trigger_type text default 'manual' check (trigger_type in ('manual', 'cron', 'api')),
  triggered_by uuid references auth.users(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scraping_jobs_status_idx on public.scraping_jobs(status);
create index if not exists scraping_jobs_source_idx on public.scraping_jobs(source);
create index if not exists scraping_jobs_scheduled_idx on public.scraping_jobs(scheduled_at desc);

-- 2) scraped_decisions: ham scrape edilen kararlar
-- (rag_documents'a transformasyon sonrası yazılır, ama orijinal burada saklanır)
create table if not exists public.scraped_decisions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.scraping_jobs(id) on delete cascade,
  source text not null,                    -- yargitay/danistay/aym/...
  source_id text,                          -- kaynaktaki orijinal id (varsa)
  source_url text,                         -- doğrudan link
  -- Karar bilgileri
  court text,                              -- "Yargıtay 17. Hukuk Dairesi"
  esas_no text,                            -- "2021/8932"
  karar_no text,                           -- "2022/4521"
  karar_date date,
  title text,
  content text not null,
  -- İşleme durumu
  is_indexed boolean default false,        -- rag_documents'a yazıldı mı
  rag_document_id text references public.rag_documents(id) on delete set null,
  fetched_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  -- Aynı karar tekrar scrape edilirse
  unique (source, source_id)
);

create index if not exists scraped_decisions_job_idx on public.scraped_decisions(job_id);
create index if not exists scraped_decisions_indexed_idx on public.scraped_decisions(is_indexed);
create index if not exists scraped_decisions_source_idx on public.scraped_decisions(source);

-- 3) RLS — admin/service role yazabilir, herkes okuyabilir
alter table public.scraping_jobs enable row level security;
alter table public.scraped_decisions enable row level security;

drop policy if exists "scraping_jobs_select_all" on public.scraping_jobs;
create policy "scraping_jobs_select_all" on public.scraping_jobs
  for select using (true);

drop policy if exists "scraped_decisions_select_all" on public.scraped_decisions;
create policy "scraped_decisions_select_all" on public.scraped_decisions
  for select using (true);

-- INSERT/UPDATE/DELETE policy yok → sadece service role

-- 4) İstatistik view
create or replace view public.scraping_stats as
select
  source,
  count(*) as total_jobs,
  count(*) filter (where status = 'done') as completed_jobs,
  count(*) filter (where status = 'running') as running_jobs,
  count(*) filter (where status = 'failed') as failed_jobs,
  sum(total_indexed) as total_decisions_indexed,
  max(finished_at) as last_run
from public.scraping_jobs
group by source;

grant select on public.scraping_stats to authenticated, anon;

-- 5) updated_at için trigger gerekmiyor (immutable rows)
