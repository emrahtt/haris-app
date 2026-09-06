-- ============================================================
-- HARIS Migration 0010 — Memory System (Harvey-style)
-- ============================================================
-- Faz 13.4: Matter-scoped persistent memory
--
-- 3 yeni tablo:
--   1. matter_memory        — Entity/fact/preference blockları (jsonb)
--   2. agent_scratchpad     — Ajanlar arası paylaşımlı çalışma alanı (TUR'lar arası)
--   3. chat_summaries       — Rolling summary (uzun chat'ler için)
--
-- Idempotent: CREATE IF NOT EXISTS + DROP/CREATE POLICY.
-- ============================================================

-- ============================================================
-- 1. matter_memory — Entity ve fact bloklarını tutar
-- ============================================================
-- Örnek row:
--   type='entity', key='davaci', value={"name":"Ahmet Yılmaz", "tc":"12345"}
--   type='fact', key='kusur_orani', value={"davaci":25, "davali":75, "source":"tutanak"}
--   type='decision', key='tur_1_karar', value={"choice":"KTK 91", "at":"2026-06-25T..."}
--   type='user_note', key='ton', value={"note":"Müvekkil stresli, yumuşak ton"}
--   type='preference', key='dilekce_uzunlugu', value={"length":"standard"}
create table if not exists public.matter_memory (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Kategori: entity | fact | decision | user_note | preference | insight
  memory_type text not null check (
    memory_type in ('entity', 'fact', 'decision', 'user_note', 'preference', 'insight')
  ),
  memory_key text not null, -- 'davaci', 'kusur_orani', 'tur_1_karar', vb.
  value jsonb not null default '{}'::jsonb,

  -- Kaynak takibi
  source text, -- 'auto_extract', 'user_manual', 'agent_ictihat_tarama', 'checkpoint_1', vb.
  source_document_id uuid references public.workspace_documents(id) on delete set null,
  source_agent text, -- agent_id (varsa)

  -- Meta
  confidence real default 1.0 check (confidence >= 0 and confidence <= 1),
  priority smallint default 5 check (priority between 1 and 10),
  is_pinned boolean default false, -- kullanıcı sabitledi (silinmez)
  is_hidden boolean default false, -- soft-delete

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Aynı key aynı workspace'te tek satır olsun (upsert)
  unique(workspace_id, memory_type, memory_key)
);

create index if not exists matter_memory_workspace_idx
  on public.matter_memory(workspace_id) where is_hidden = false;
create index if not exists matter_memory_type_idx
  on public.matter_memory(workspace_id, memory_type) where is_hidden = false;
create index if not exists matter_memory_priority_idx
  on public.matter_memory(workspace_id, priority desc);

-- ============================================================
-- 2. agent_scratchpad — Ajanlar arası shared board
-- ============================================================
-- Ajanların TUR'lar boyunca birbirinin çıkardığı bilgiyi görebileceği yer.
-- Her ajan çıktısı bittiğinde "önemli tespitleri" buraya yazar.
create table if not exists public.agent_scratchpad (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  written_by text not null, -- agent_id
  round_number smallint check (round_number between 1 and 3),

  topic text not null, -- 'zayif_argumanlar', 'kritik_atif', 'usul_riski', vb.
  content text not null,
  metadata jsonb default '{}'::jsonb,

  created_at timestamptz default now()
);

create index if not exists agent_scratchpad_workspace_idx
  on public.agent_scratchpad(workspace_id, created_at desc);
create index if not exists agent_scratchpad_topic_idx
  on public.agent_scratchpad(workspace_id, topic);

-- ============================================================
-- 3. chat_summaries — Rolling summary (uzun chat'ler için)
-- ============================================================
-- 20 mesajı aşan chat'lerde eski mesajlar özet olur, DB'de tutulur.
create table if not exists public.chat_summaries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  summary_text text not null,
  covers_message_count integer not null, -- Kaç mesajı özetliyor
  covers_until_timestamp timestamptz not null, -- Bu zamana kadarki tüm mesajlar

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tek workspace için tek özet (upsert)
create unique index if not exists chat_summaries_workspace_unique
  on public.chat_summaries(workspace_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================
alter table public.matter_memory enable row level security;
alter table public.agent_scratchpad enable row level security;
alter table public.chat_summaries enable row level security;

drop policy if exists "matter_memory_owner_all" on public.matter_memory;
create policy "matter_memory_owner_all" on public.matter_memory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "agent_scratchpad_owner_all" on public.agent_scratchpad;
create policy "agent_scratchpad_owner_all" on public.agent_scratchpad
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_summaries_owner_all" on public.chat_summaries;
create policy "chat_summaries_owner_all" on public.chat_summaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
drop trigger if exists matter_memory_touch on public.matter_memory;
create trigger matter_memory_touch before update on public.matter_memory
  for each row execute function public.touch_updated_at();

drop trigger if exists chat_summaries_touch on public.chat_summaries;
create trigger chat_summaries_touch before update on public.chat_summaries
  for each row execute function public.touch_updated_at();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
-- Bir workspace için tüm memory'i getir (chat prompt'a inject için)
create or replace function public.get_matter_memory_summary(p_workspace_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'entities', coalesce(
      jsonb_agg(m order by m.priority desc, m.updated_at desc)
        filter (where m.memory_type = 'entity' and m.is_hidden = false),
      '[]'::jsonb
    ),
    'facts', coalesce(
      jsonb_agg(m order by m.priority desc, m.updated_at desc)
        filter (where m.memory_type = 'fact' and m.is_hidden = false),
      '[]'::jsonb
    ),
    'decisions', coalesce(
      jsonb_agg(m order by m.updated_at desc)
        filter (where m.memory_type = 'decision' and m.is_hidden = false),
      '[]'::jsonb
    ),
    'user_notes', coalesce(
      jsonb_agg(m order by m.priority desc, m.updated_at desc)
        filter (where m.memory_type = 'user_note' and m.is_hidden = false),
      '[]'::jsonb
    ),
    'preferences', coalesce(
      jsonb_agg(m order by m.updated_at desc)
        filter (where m.memory_type = 'preference' and m.is_hidden = false),
      '[]'::jsonb
    ),
    'insights', coalesce(
      jsonb_agg(m order by m.priority desc, m.updated_at desc)
        filter (where m.memory_type = 'insight' and m.is_hidden = false),
      '[]'::jsonb
    )
  ) into result
  from public.matter_memory m
  where m.workspace_id = p_workspace_id;
  return coalesce(result, '{}'::jsonb);
end;
$$;

-- ============================================================
-- DONE
-- ============================================================
