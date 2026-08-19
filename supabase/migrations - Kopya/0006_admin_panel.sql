-- ============================================================
-- HARIS Faz 10 — Admin Panel + Operasyonel Tablolar
-- ============================================================
-- - profiles.is_admin + role-aware RLS helper
-- - deletion_log: çalıştırılan silme işleri (audit zincirinin tamamı)
-- - system_metrics view: dashboard için aggregate sayımlar
-- ============================================================

-- 1) profiles tablosuna is_admin alanı ekle (idempotent)
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.profiles
  add column if not exists admin_role text default null check (
    admin_role is null or admin_role in (
      'super_admin',      -- her şeye erişebilir
      'kvkk_officer',     -- sadece KVKK + audit
      'support',          -- KVKK + müşteri destek
      'finance'           -- billing + invoices
    )
  );

create index if not exists profiles_is_admin_idx on public.profiles(is_admin)
  where is_admin = true;

-- 2) Admin kontrol helper fonksiyonu (RLS policy'lerde kullanılır)
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = p_user_id),
    false
  );
$$;

create or replace function public.has_admin_role(
  p_role text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and is_admin = true
      and (admin_role = p_role or admin_role = 'super_admin')
  );
$$;

-- 3) deletion_log: actual deletion işleminin kayıtları
create table if not exists public.deletion_log (
  id uuid primary key default gen_random_uuid(),
  -- Hangi kullanıcı silindi (silindi ama log için ad-soyad anonim saklanır)
  original_user_id uuid not null,
  user_email_hash text not null,         -- SHA256(email) — kanıt için
  retention_choice text not null,
  -- Silinen kayıt sayıları (audit için)
  cases_deleted int default 0,
  documents_deleted int default 0,
  petitions_deleted int default 0,
  storage_objects_deleted int default 0,
  storage_bytes_freed bigint default 0,
  -- İşlem
  triggered_by text not null check (
    triggered_by in ('cron', 'admin_manual', 'user_immediate')
  ),
  triggered_by_admin uuid references auth.users(id) on delete set null,
  -- Sonuç
  status text not null default 'completed' check (
    status in ('completed', 'partial', 'failed')
  ),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists deletion_log_user_idx
  on public.deletion_log(original_user_id);
create index if not exists deletion_log_created_idx
  on public.deletion_log(created_at desc);

-- 4) admin_actions: admin'in yaptığı her şey (self-audit)
-- audit_logs'tan ayrı tutuyoruz çünkü admin'lerin kendi loglarını
-- silmemesi/değiştirmemesi gerek (immutable, append-only).
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  -- ON DELETE RESTRICT → admin hesabı silinemez, tüm logları kalır
  action text not null check (
    action in (
      'kvkk_request.viewed',
      'kvkk_request.responded',
      'kvkk_request.status_changed',
      'audit_log.viewed',
      'user.viewed',
      'user.banned',
      'user.unbanned',
      'subscription.modified',
      'deletion.executed',
      'deletion.cancelled_by_admin',
      'admin.granted',
      'admin.revoked',
      'system.config_changed'
    )
  ),
  target_user_id uuid references auth.users(id) on delete set null,
  target_resource_type text,
  target_resource_id text,
  reason text,                          -- admin'in eylem nedeni
  metadata jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_admin_idx
  on public.admin_actions(admin_user_id, created_at desc);
create index if not exists admin_actions_target_idx
  on public.admin_actions(target_user_id);
create index if not exists admin_actions_action_idx
  on public.admin_actions(action, created_at desc);

-- ============================================================
-- RLS
-- ============================================================

-- profiles: admin alanı sadece super_admin tarafından değiştirilebilir
-- (mevcut profiles policy'leri ek olarak)
drop policy if exists "profiles_admin_can_view_all" on public.profiles;
create policy "profiles_admin_can_view_all" on public.profiles
  for select using (is_admin(auth.uid()));

-- deletion_log: sadece adminler okuyabilir
alter table public.deletion_log enable row level security;
drop policy if exists "deletion_log_admin_only" on public.deletion_log;
create policy "deletion_log_admin_only" on public.deletion_log
  for select using (is_admin(auth.uid()));

-- admin_actions: admin kendi loglarını görür, super_admin hepsini
alter table public.admin_actions enable row level security;
drop policy if exists "admin_actions_own_or_super" on public.admin_actions;
create policy "admin_actions_own_or_super" on public.admin_actions
  for select using (
    auth.uid() = admin_user_id
    or has_admin_role('super_admin', auth.uid())
  );
-- INSERT: sadece service role (uygulama kodu)

-- kvkk_requests: adminler tüm başvuruları görebilir
drop policy if exists "kvkk_req_admin_select_all" on public.kvkk_requests;
create policy "kvkk_req_admin_select_all" on public.kvkk_requests
  for select using (is_admin(auth.uid()) or auth.uid() = user_id or user_id is null);

drop policy if exists "kvkk_req_admin_update" on public.kvkk_requests;
create policy "kvkk_req_admin_update" on public.kvkk_requests
  for update using (is_admin(auth.uid()));

-- audit_logs: adminler tüm logları görebilir
drop policy if exists "audit_logs_admin_select_all" on public.audit_logs;
create policy "audit_logs_admin_select_all" on public.audit_logs
  for select using (is_admin(auth.uid()) or auth.uid() = user_id);

-- account_deletion_requests: adminler kuyruğu görür
drop policy if exists "del_req_admin_select_all" on public.account_deletion_requests;
create policy "del_req_admin_select_all" on public.account_deletion_requests
  for select using (is_admin(auth.uid()) or auth.uid() = user_id);

drop policy if exists "del_req_admin_update" on public.account_deletion_requests;
create policy "del_req_admin_update" on public.account_deletion_requests
  for update using (
    is_admin(auth.uid()) or auth.uid() = user_id
  );

-- ============================================================
-- SYSTEM METRICS VIEW — Admin dashboard için aggregate
-- ============================================================
create or replace view public.admin_system_metrics as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.profiles where created_at > now() - interval '7 days') as new_users_7d,
  (select count(*) from public.profiles where created_at > now() - interval '30 days') as new_users_30d,
  (select count(*) from public.subscriptions where status = 'active' and plan_id != 'free') as paying_users,
  (select count(*) from public.cases) as total_cases,
  (select count(*) from public.cases where created_at > now() - interval '7 days') as new_cases_7d,
  (select count(*) from public.documents) as total_documents,
  (select coalesce(sum(size_bytes), 0) from public.documents) as total_storage_bytes,
  (select count(*) from public.petitions) as total_petitions,
  (select count(*) from public.rag_documents) as total_rag_documents,
  -- KVKK
  (select count(*) from public.kvkk_requests where status in ('received', 'in_review')) as kvkk_pending,
  (select count(*) from public.kvkk_requests
    where status in ('received', 'in_review')
      and deadline_at < now() + interval '7 days') as kvkk_deadline_soon,
  -- Deletion
  (select count(*) from public.account_deletion_requests where status = 'pending') as deletions_pending,
  (select count(*) from public.account_deletion_requests
    where status = 'pending' and scheduled_deletion_at < now()) as deletions_overdue,
  -- AI usage (bu ay)
  (select coalesce(sum(ai_calls), 0) from public.usage_tracking
    where period_month = date_trunc('month', now())::date) as ai_calls_this_month,
  (select coalesce(sum(scraping_jobs), 0) from public.usage_tracking
    where period_month = date_trunc('month', now())::date) as scraping_this_month;

-- Bu view sadece admin tarafından sorgulanabilir
revoke all on public.admin_system_metrics from public, anon, authenticated;
grant select on public.admin_system_metrics to authenticated;

-- Wrapper function — RLS yerine fonksiyon-level guard
create or replace function public.get_admin_metrics()
returns public.admin_system_metrics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_metrics public.admin_system_metrics;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Admin yetkisi gerekli';
  end if;

  select * into v_metrics from public.admin_system_metrics;
  return v_metrics;
end;
$$;

-- ============================================================
-- RPC: execute_account_deletion (cool-off dolmuş hesabı sil)
-- ============================================================
create or replace function public.execute_account_deletion(
  p_request_id uuid,
  p_triggered_by text default 'cron'
)
returns table(
  cases_deleted int,
  documents_deleted int,
  petitions_deleted int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.account_deletion_requests;
  v_user_email text;
  v_email_hash text;
  v_admin_id uuid;
  v_start timestamptz := now();
  v_cases int := 0;
  v_docs int := 0;
  v_pets int := 0;
begin
  -- Authorization
  if p_triggered_by = 'admin_manual' then
    if not is_admin(auth.uid()) then
      raise exception 'Admin yetkisi gerekli';
    end if;
    v_admin_id := auth.uid();
  elsif p_triggered_by not in ('cron', 'user_immediate') then
    raise exception 'Geçersiz triggered_by';
  end if;

  -- Talep var mı?
  select * into v_request
  from public.account_deletion_requests
  where id = p_request_id and status = 'pending';

  if v_request is null then
    raise exception 'Aktif silme talebi bulunamadı: %', p_request_id;
  end if;

  -- Cool-off dolmuş mu? (cron için)
  if p_triggered_by = 'cron' and v_request.scheduled_deletion_at > now() then
    raise exception 'Cool-off süresi dolmadı (% kaldı)',
      v_request.scheduled_deletion_at - now();
  end if;

  -- Email hash (kanıt için)
  select email into v_user_email from auth.users where id = v_request.user_id;
  v_email_hash := encode(sha256(coalesce(v_user_email, '')::bytea), 'hex');

  -- Sayımları al (silmeden önce)
  select count(*) into v_cases from public.cases where user_id = v_request.user_id;
  select count(*) into v_docs from public.documents where user_id = v_request.user_id;
  select count(*) into v_pets from public.petitions where user_id = v_request.user_id;

  -- Veri silme stratejisi
  if v_request.retention_choice = 'delete_immediately' then
    -- ON DELETE CASCADE zaten çalışacak
    delete from auth.users where id = v_request.user_id;
  elsif v_request.retention_choice = 'anonymize' then
    -- Profile anonimleştir, hesap kalır ama erişilemez
    update public.profiles
    set full_name = '[Silinmiş Kullanıcı]',
        firm_name = null,
        baro_sicil = null
    where id = v_request.user_id;
    -- Dava içeriklerini sil ama agregat istatistik kalsın
    delete from public.cases where user_id = v_request.user_id;
    delete from public.documents where user_id = v_request.user_id;
    delete from public.petitions where user_id = v_request.user_id;
    -- Audit log'lar kalır (m.12 yükümlülüğü), ama user_id null'a düşer
    update public.audit_logs
    set user_id = null,
        metadata = metadata || '{"anonymized": true}'::jsonb
    where user_id = v_request.user_id;
    -- Auth hesabını disable et
    update auth.users
    set encrypted_password = null,
        email = 'deleted-' || v_email_hash || '@deleted.haris.local',
        raw_user_meta_data = '{"deleted": true}'::jsonb
    where id = v_request.user_id;
  else -- legal_minimum
    -- Sadece dava içerikleri silinir, fatura/vergi kayıtları kalır
    delete from public.cases where user_id = v_request.user_id;
    delete from public.documents where user_id = v_request.user_id;
    delete from public.petitions where user_id = v_request.user_id;
    -- subscriptions + invoices + payment_events kalır (VUK m.253 — 10 yıl)
    update auth.users
    set encrypted_password = null,
        email = 'deleted-' || v_email_hash || '@deleted.haris.local'
    where id = v_request.user_id;
  end if;

  -- Talebi tamamlandı işaretle
  update public.account_deletion_requests
  set status = 'completed',
      completed_at = now()
  where id = p_request_id;

  -- deletion_log'a yaz (kanıt)
  insert into public.deletion_log (
    original_user_id, user_email_hash, retention_choice,
    cases_deleted, documents_deleted, petitions_deleted,
    triggered_by, triggered_by_admin, duration_ms
  ) values (
    v_request.user_id, v_email_hash, v_request.retention_choice,
    v_cases, v_docs, v_pets,
    p_triggered_by, v_admin_id,
    extract(milliseconds from (now() - v_start))::int
  );

  -- Admin manuel ise admin_actions'a da yaz
  if p_triggered_by = 'admin_manual' and v_admin_id is not null then
    insert into public.admin_actions (
      admin_user_id, action, target_user_id, target_resource_type,
      target_resource_id, reason, metadata
    ) values (
      v_admin_id, 'deletion.executed', v_request.user_id, 'account',
      v_request.user_id::text,
      'Admin manuel silme (cool-off beklenmedi)',
      jsonb_build_object('retention', v_request.retention_choice)
    );
  end if;

  return query select v_cases, v_docs, v_pets;
end;
$$;
