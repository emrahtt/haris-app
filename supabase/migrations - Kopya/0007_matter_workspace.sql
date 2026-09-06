-- ============================================================
-- HARIS Migration 0007 — Matter Workspace (Faz 11)
-- ============================================================
-- Önceki: 0001-0006 (initial, pgvector, scraping, billing, kvkk, admin)
-- Bu migration: Harvey/CoCounsel/Legora benzeri "Matter Workspace" entity'si
--
-- Yeni tablolar:
--   1. workspaces           — Bir dava = bir Matter Workspace
--   2. workspace_documents  — Vault (drag-drop edilmiş belgeler)
--   3. agent_runs           — LangGraph state checkpoint + her ajan çıktısı
--   4. agent_messages       — Ajan-ajan ve şef-ajan iç diyaloglar
--   5. petition_versions    — Tiptap editor version history
--   6. user_preferences     — Slider/toggle/checkpoint mode tercihleri
--
-- İdempotent: CREATE IF NOT EXISTS + DROP/CREATE POLICY pattern.
-- ============================================================

-- ============================================================
-- 1. workspaces
-- ============================================================
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Yeni Dava Dosyası',
  case_description text default '',
  case_type text default '', -- "tazminat", "boşanma", "ceza", "iş", vb.
  status text not null default 'draft' check (status in ('draft','active','archived','completed')),

  -- Orkestrasyon durumu
  current_round smallint default 0 check (current_round between 0 and 3),
  orchestration_status text default 'idle' check (
    orchestration_status in ('idle','running','paused_for_user','completed','error')
  ),

  -- Kullanıcı tercihleri (jsonb — esnek)
  preferences jsonb default '{
    "petitionLength":"standard",
    "qualityMode":"strict",
    "checkpointMode":"ask_on_conflict",
    "showInternalDialogs":false,
    "showRawResponses":false,
    "enabledAgents":[]
  }'::jsonb,

  -- Maliyet takibi
  total_cost_usd numeric(10,4) default 0,
  total_tokens_input integer default 0,
  total_tokens_output integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists workspaces_user_idx on public.workspaces(user_id);
create index if not exists workspaces_status_idx on public.workspaces(status) where status != 'archived';
create index if not exists workspaces_updated_idx on public.workspaces(updated_at desc);

-- ============================================================
-- 2. workspace_documents (Vault)
-- ============================================================
create table if not exists public.workspace_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text, -- Supabase Storage bucket path

  -- AI sınıflandırma sonuçları (Vaka Alıcısı doldurur)
  category text, -- "şikayet_dilekçesi", "bilirkişi_raporu", vb.
  summary text,
  parties text[], -- davacı/davalı isimleri
  document_date date,
  keywords text[],

  -- İçerik
  extracted_text text, -- OCR/parse sonucu
  page_count integer,

  status text not null default 'uploading' check (
    status in ('uploading','extracting','classifying','ready','error')
  ),
  error_message text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists workspace_documents_workspace_idx
  on public.workspace_documents(workspace_id);
create index if not exists workspace_documents_status_idx
  on public.workspace_documents(workspace_id, status);

-- ============================================================
-- 3. agent_runs (LangGraph state + her ajan çıktısı)
-- ============================================================
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  agent_id text not null, -- "orchestrator", "maddi_hukuk", vb. (enum'a bağlanmaz, esneklik için text)
  round_number smallint not null check (round_number between 1 and 3),

  model_provider text not null, -- "anthropic" | "openai"
  model_id text not null, -- "claude-4-6-opus", vb.

  status text not null default 'pending' check (
    status in ('pending','running','done','error','cancelled')
  ),

  -- Çıktılar
  content text, -- Markdown
  raw_response jsonb, -- "Ham yanıtı gör" butonu için
  system_prompt text, -- "Promptu gör" butonu için

  -- Telemetri
  tokens_input integer default 0,
  tokens_output integer default 0,
  cost_usd numeric(10,6) default 0,
  duration_ms integer,

  started_at timestamptz default now(),
  finished_at timestamptz,
  error_message text
);

create index if not exists agent_runs_workspace_idx
  on public.agent_runs(workspace_id, round_number);
create index if not exists agent_runs_status_idx
  on public.agent_runs(workspace_id, status) where status in ('pending','running');

-- ============================================================
-- 4. agent_messages (iç diyaloglar)
-- ============================================================
create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  from_agent text not null, -- "orchestrator", "user", "maddi_hukuk", vb.
  to_agent text not null, -- "broadcast" veya agent_id
  round_number smallint check (round_number between 1 and 3),

  message_type text not null check (
    message_type in ('question','answer','directive','critique','synthesis','user_chat','agent_chat')
  ),
  content text not null,

  -- Metadata
  references_run_id uuid references public.agent_runs(id) on delete set null,
  metadata jsonb default '{}'::jsonb,

  created_at timestamptz default now()
);

create index if not exists agent_messages_workspace_idx
  on public.agent_messages(workspace_id, created_at desc);
create index if not exists agent_messages_type_idx
  on public.agent_messages(workspace_id, message_type);

-- ============================================================
-- 5. petition_versions (Tiptap version history)
-- ============================================================
create table if not exists public.petition_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  version_number integer not null,
  title text default 'Dilekçe',
  content_markdown text not null,
  content_json jsonb, -- Tiptap JSON snapshot

  -- Kalite raporu (Kalite Kontrol Ajanı çıktısı)
  quality_report jsonb default null,
  quality_score smallint check (quality_score between 0 and 100),

  -- Kaynak: AI mi user mı yazdı?
  author text not null default 'ai' check (author in ('ai','user','hybrid')),
  created_by_agent text, -- "dilekce_editoru" vs

  -- Atıflar (parsed inline citations)
  citations jsonb default '[]'::jsonb,

  created_at timestamptz default now(),

  unique(workspace_id, version_number)
);

create index if not exists petition_versions_workspace_idx
  on public.petition_versions(workspace_id, version_number desc);

-- ============================================================
-- 6. user_preferences (global ayarlar — workspace dışı)
-- ============================================================
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- UI tercihleri
  default_petition_length text default 'standard'
    check (default_petition_length in ('short','standard','comprehensive')),
  default_quality_mode text default 'strict'
    check (default_quality_mode in ('strict','flexible')),
  default_checkpoint_mode text default 'ask_on_conflict'
    check (default_checkpoint_mode in ('always_ask','ask_on_conflict','auto_continue')),
  show_internal_dialogs boolean default false,
  show_raw_responses boolean default false,

  -- Ajan tercihleri
  preferred_agents text[] default array[]::text[], -- default enabled
  disabled_agents text[] default array[]::text[],

  -- Bildirim tercihleri
  notify_on_checkpoint boolean default true,
  notify_on_complete boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
alter table public.workspaces enable row level security;
alter table public.workspace_documents enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_messages enable row level security;
alter table public.petition_versions enable row level security;
alter table public.user_preferences enable row level security;

-- workspaces
drop policy if exists "workspaces_owner_all" on public.workspaces;
create policy "workspaces_owner_all" on public.workspaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- workspace_documents
drop policy if exists "workspace_documents_owner_all" on public.workspace_documents;
create policy "workspace_documents_owner_all" on public.workspace_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- agent_runs
drop policy if exists "agent_runs_owner_select" on public.agent_runs;
create policy "agent_runs_owner_select" on public.agent_runs
  for select using (auth.uid() = user_id);

drop policy if exists "agent_runs_owner_insert" on public.agent_runs;
create policy "agent_runs_owner_insert" on public.agent_runs
  for insert with check (auth.uid() = user_id);

drop policy if exists "agent_runs_owner_update" on public.agent_runs;
create policy "agent_runs_owner_update" on public.agent_runs
  for update using (auth.uid() = user_id);

-- agent_messages
drop policy if exists "agent_messages_owner_all" on public.agent_messages;
create policy "agent_messages_owner_all" on public.agent_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- petition_versions
drop policy if exists "petition_versions_owner_all" on public.petition_versions;
create policy "petition_versions_owner_all" on public.petition_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_preferences
drop policy if exists "user_preferences_owner_all" on public.user_preferences;
create policy "user_preferences_owner_all" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS — updated_at auto
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists workspaces_touch on public.workspaces;
create trigger workspaces_touch before update on public.workspaces
  for each row execute function public.touch_updated_at();

drop trigger if exists workspace_documents_touch on public.workspace_documents;
create trigger workspace_documents_touch before update on public.workspace_documents
  for each row execute function public.touch_updated_at();

drop trigger if exists user_preferences_touch on public.user_preferences;
create trigger user_preferences_touch before update on public.user_preferences
  for each row execute function public.touch_updated_at();

-- ============================================================
-- VIEW — workspace özet (UI için)
-- ============================================================
create or replace view public.workspace_summary
with (security_invoker = on) as
select
  w.id,
  w.user_id,
  w.title,
  w.case_type,
  w.status,
  w.orchestration_status,
  w.current_round,
  w.total_cost_usd,
  w.created_at,
  w.updated_at,
  (select count(*) from public.workspace_documents d where d.workspace_id = w.id) as document_count,
  (select count(*) from public.agent_runs ar where ar.workspace_id = w.id and ar.status='done') as completed_runs,
  (select max(version_number) from public.petition_versions pv where pv.workspace_id = w.id) as latest_petition_version
from public.workspaces w;

-- ============================================================
-- SEED — yeni kullanıcı için default preferences (opsiyonel)
-- ============================================================
-- Trigger: kullanıcı kayıt olunca user_preferences satırı oluştur
create or replace function public.create_default_preferences()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_preferences on auth.users;
create trigger on_auth_user_created_preferences
  after insert on auth.users
  for each row execute function public.create_default_preferences();

-- ============================================================
-- DONE
-- ============================================================
-- Bu migration'ı Supabase Dashboard → SQL Editor'da çalıştırın.
-- Veya psql: psql $DATABASE_URL -f 0007_matter_workspace.sql
-- ============================================================
