-- ============================================================
-- HARIS Faz 13.6 — Sprint 2: Ethical Walls / Conflict Check
-- ============================================================
-- Amaç: Yeni dava açarken müvekkil/karşı taraf ismini otomatik
-- kontrol et. Bu kişi başka bir davanızda karşı taraf ise
-- ÇIKAR ÇATIŞMASI uyarısı ver (baro etik kuralı).
--
-- Harvey pattern: warn + confirm dialog. Kullanıcı "anladım,
-- devam et" derse override edebilir, ama audit log'a düşer.
-- ============================================================

-- 1) Parties tablosu — her workspace'in müvekkil ve karşı tarafları
create table if not exists public.workspace_parties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('muvekkil', 'karsi_taraf', 'ilgili_taraf', 'taniK', 'bilirkisi')),
  full_name text not null,
  normalized_name text not null,       -- lowercase, boşluk normalize (fuzzy match için)
  tc_no text,                          -- TC kimlik (varsa, hash'lenmiş öneri)
  tax_no text,                         -- Vergi no (kurumsal)
  entity_type text default 'gercek' check (entity_type in ('gercek', 'tuzel', 'kamu')),
  contact_info jsonb default '{}'::jsonb,  -- email, telefon, adres
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) İndeksler — hızlı conflict search için
create index if not exists workspace_parties_user_normalized_idx
  on public.workspace_parties (user_id, normalized_name);
create index if not exists workspace_parties_workspace_idx
  on public.workspace_parties (workspace_id);
create index if not exists workspace_parties_tc_idx
  on public.workspace_parties (user_id, tc_no) where tc_no is not null;
create index if not exists workspace_parties_role_idx
  on public.workspace_parties (user_id, role);

-- 3) RLS — sadece sahibi görür
alter table public.workspace_parties enable row level security;

drop policy if exists "parties_select" on public.workspace_parties;
create policy "parties_select" on public.workspace_parties
  for select using (user_id = (select auth.uid()));

drop policy if exists "parties_insert" on public.workspace_parties;
create policy "parties_insert" on public.workspace_parties
  for insert with check (user_id = (select auth.uid()));

drop policy if exists "parties_update" on public.workspace_parties;
create policy "parties_update" on public.workspace_parties
  for update using (user_id = (select auth.uid()));

drop policy if exists "parties_delete" on public.workspace_parties;
create policy "parties_delete" on public.workspace_parties
  for delete using (user_id = (select auth.uid()));


-- ============================================================
-- 4) NORMALIZATION FONKSİYONU
-- ============================================================
-- "Ali Veli", "ALİ VELİ", "ali  veli" → hepsi "ali veli" olur
create or replace function public.normalize_party_name(input text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    lower(
      translate(
        coalesce(input, ''),
        'ÇĞİÖŞÜçğıöşü',
        'CGIOSUcgiosu'
      )
    ),
    '\s+', ' ', 'g'
  ));
$$;


-- ============================================================
-- 5) CONFLICT CHECK RPC
-- ============================================================
-- Verilen isim/TC için kullanıcının tüm workspace'lerini tarar.
-- Karşı taraf çakışması bulursa döner.
create or replace function public.check_conflict(
  p_full_name text,
  p_tc_no text default null,
  p_exclude_workspace_id uuid default null
)
returns table (
  workspace_id uuid,
  workspace_title text,
  case_type text,
  party_id uuid,
  party_role text,
  party_name text,
  match_type text,      -- 'exact_name' | 'tc_match' | 'fuzzy_name'
  severity text         -- 'critical' | 'warning' | 'info'
)
language plpgsql
security invoker      -- RLS aktif
set search_path = public
as $$
declare
  v_normalized text;
begin
  v_normalized := public.normalize_party_name(p_full_name);

  return query
  select
    w.id as workspace_id,
    w.title as workspace_title,
    w.case_type,
    p.id as party_id,
    p.role as party_role,
    p.full_name as party_name,
    case
      when p_tc_no is not null and p.tc_no = p_tc_no then 'tc_match'
      when p.normalized_name = v_normalized then 'exact_name'
      else 'fuzzy_name'
    end as match_type,
    case
      -- KRİTİK: Aynı kişi başka davada KARŞI TARAF ise
      when p.role = 'karsi_taraf' then 'critical'
      -- UYARI: Aynı kişi başka davada müvekkil ise (temsil sürüyor)
      when p.role = 'muvekkil' then 'warning'
      -- INFO: İlgili taraf/tanık/bilirkişi
      else 'info'
    end as severity
  from public.workspace_parties p
  join public.workspaces w on w.id = p.workspace_id
  where p.user_id = (select auth.uid())
    and (p_exclude_workspace_id is null or p.workspace_id != p_exclude_workspace_id)
    and (
      p.normalized_name = v_normalized
      or (p_tc_no is not null and p.tc_no = p_tc_no)
    )
  order by
    case
      when p.role = 'karsi_taraf' then 1
      when p.role = 'muvekkil' then 2
      else 3
    end,
    w.created_at desc;
end;
$$;

grant execute on function public.check_conflict(text, text, uuid) to authenticated;


-- ============================================================
-- 6) CONFLICT AUDIT LOG (Override kayıtları)
-- ============================================================
-- Kullanıcı "anladım, devam et" derse buraya yazılır.
-- Baro denetiminde kanıt olsun diye.
create table if not exists public.conflict_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  conflicting_workspace_id uuid references public.workspaces(id) on delete set null,
  party_name text not null,
  match_type text not null,
  severity text not null,
  justification text,   -- Kullanıcının verdiği gerekçe (opsiyonel ama önerilir)
  created_at timestamptz not null default now()
);

create index if not exists conflict_overrides_user_idx
  on public.conflict_overrides (user_id, created_at desc);

alter table public.conflict_overrides enable row level security;

drop policy if exists "conflict_overrides_select" on public.conflict_overrides;
create policy "conflict_overrides_select" on public.conflict_overrides
  for select using (user_id = (select auth.uid()));

drop policy if exists "conflict_overrides_insert" on public.conflict_overrides;
create policy "conflict_overrides_insert" on public.conflict_overrides
  for insert with check (user_id = (select auth.uid()));


-- ============================================================
-- 7) AUTO-TRIGGER: workspace_parties.normalized_name otomatik hesapla
-- ============================================================
create or replace function public.trg_normalize_party_name()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name := public.normalize_party_name(new.full_name);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_parties_normalize on public.workspace_parties;
create trigger trg_parties_normalize
  before insert or update of full_name on public.workspace_parties
  for each row execute function public.trg_normalize_party_name();


-- ============================================================
-- BİTTİ. Sonraki: RAG engine kodu + Conflict UI banner
-- ============================================================
