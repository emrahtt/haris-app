-- ============================================================
-- HARIS Faz 9 — KVKK Uyumluluk Altyapısı
-- ============================================================
-- 6698 sayılı Kişisel Verilerin Korunması Kanunu yükümlülükleri:
-- - m.10  Aydınlatma yükümlülüğü        → consent_records
-- - m.11  İlgili kişinin hakları         → kvkk_requests, data_export_requests
-- - m.7   Unutulma hakkı                 → account_deletion_requests
-- - m.12  Veri sorumlusu yükümlülüğü    → audit_logs
-- ============================================================

-- 1) consent_records: aydınlatma + açık rıza kayıtları
-- Kullanıcının hangi tarihte hangi metni onayladığı (versiyon dahil)
create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (
    consent_type in (
      'kvkk_aydinlatma',     -- Aydınlatma metni okuduğunu onayladı
      'terms_of_service',     -- Kullanım şartlarını kabul etti
      'privacy_policy',       -- Gizlilik politikası
      'cookie_essential',     -- Zorunlu çerezler (otomatik)
      'cookie_analytics',     -- Analitik çerezler (opsiyonel)
      'cookie_marketing',     -- Pazarlama çerezleri (opsiyonel)
      'marketing_emails',     -- Pazarlama e-postaları
      'data_processing'       -- Genel veri işleme onayı
    )
  ),
  granted boolean not null,
  -- Hangi metin versiyonu? (örn: "v1.0.0-2026-06-06")
  document_version text not null,
  -- IP adresi (m.12 yükümlülüğü — log)
  ip_address inet,
  user_agent text,
  -- Onay süresi (sürelendirilmiş rızalar için)
  expires_at timestamptz,
  -- Geri çekme
  withdrawn_at timestamptz,
  withdrawal_reason text,
  -- Audit
  created_at timestamptz not null default now()
);

create index if not exists consent_records_user_idx
  on public.consent_records(user_id, consent_type);
create index if not exists consent_records_type_idx
  on public.consent_records(consent_type);

-- 2) kvkk_requests: KVKK m.11 ilgili kişi başvuruları
-- "Verilerim ne için kullanılıyor?", "Düzeltin", "Silin" vb.
create table if not exists public.kvkk_requests (
  id uuid primary key default gen_random_uuid(),
  -- Başvuran kullanıcı (oturum açıksa) veya null (kayıtsız başvuru)
  user_id uuid references auth.users(id) on delete set null,
  request_type text not null check (
    request_type in (
      'access',          -- Verilerin işlenip işlenmediğini öğrenme (m.11/a)
      'information',     -- Hangi amaçla işlendiği bilgisi (m.11/b)
      'transfer_info',   -- Aktarıldığı üçüncü kişileri öğrenme (m.11/c)
      'correction',      -- Düzeltme (m.11/d)
      'deletion',        -- Silme/yok etme (m.11/e)
      'portability',     -- Verileri taşıma (m.11/d)
      'objection',       -- Otomatik karar verme aleyhine itiraz (m.11/g)
      'damage_compensation' -- Zararın giderilmesi (m.11/h)
    )
  ),
  -- Başvuran bilgileri (kullanıcı bilgileri ile çakışabilir, ama yasal arşiv)
  applicant_name text not null,
  applicant_email text not null,
  applicant_tc text,              -- T.C. kimlik (opsiyonel)
  applicant_phone text,
  -- Başvuru içeriği
  subject text not null,
  description text not null,
  -- Sürec
  status text not null default 'received' check (
    status in ('received', 'in_review', 'approved', 'rejected', 'completed', 'cancelled')
  ),
  response text,
  responded_at timestamptz,
  responded_by uuid references auth.users(id) on delete set null,
  -- KVKK m.13: 30 gün içinde yanıt zorunlu
  deadline_at timestamptz default (now() + interval '30 days'),
  -- Audit
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kvkk_requests_user_idx on public.kvkk_requests(user_id);
create index if not exists kvkk_requests_status_idx on public.kvkk_requests(status);
create index if not exists kvkk_requests_deadline_idx on public.kvkk_requests(deadline_at);

-- 3) data_export_requests: veri export işleri (asenkron — büyük dosyalar)
create table if not exists public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'ready', 'expired', 'failed')
  ),
  -- İndirilebilir dosya URL'i (presigned, kısa ömürlü)
  download_url text,
  download_expires_at timestamptz,
  file_size_bytes bigint,
  -- Audit
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

create index if not exists data_export_requests_user_idx
  on public.data_export_requests(user_id, status);

-- 4) account_deletion_requests: hesap silme talepleri (cool-off + geri alma)
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 30 günlük cool-off — kullanıcı fikir değiştirebilir
  scheduled_deletion_at timestamptz not null
    default (now() + interval '30 days'),
  reason text,
  -- Yasal saklama (vergi/dava arşivi) öncesi/sonrası seçim
  retention_choice text default 'anonymize' check (
    retention_choice in ('anonymize', 'delete_immediately', 'legal_minimum')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'cancelled', 'completed')
  ),
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id) -- aynı kullanıcı için tek aktif talep
);

create index if not exists deletion_requests_scheduled_idx
  on public.account_deletion_requests(scheduled_deletion_at)
  where status = 'pending';

-- 5) audit_logs: kim, ne zaman, neyi yaptı (KVKK m.12 yükümlülüğü)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  -- Hangi tür eylem
  action text not null,
  -- Hangi kaynak/kayıt etkilendi
  resource_type text,
  resource_id text,
  -- Ek bağlam
  metadata jsonb default '{}'::jsonb,
  -- KVKK m.12 — IP + UA loglaması zorunlu
  ip_address inet,
  user_agent text,
  -- Audit
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_idx on public.audit_logs(user_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action, created_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.consent_records enable row level security;
alter table public.kvkk_requests enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.audit_logs enable row level security;

-- consent_records: kullanıcı kendi onaylarını görür
drop policy if exists "consent_select_own" on public.consent_records;
drop policy if exists "consent_insert_own" on public.consent_records;
create policy "consent_select_own" on public.consent_records
  for select using (auth.uid() = user_id);
create policy "consent_insert_own" on public.consent_records
  for insert with check (auth.uid() = user_id);
-- UPDATE/DELETE yok — consent kayıtları immutable (yasal kanıt)

-- kvkk_requests: kullanıcı kendi başvurularını görür
drop policy if exists "kvkk_req_select_own" on public.kvkk_requests;
drop policy if exists "kvkk_req_insert_any" on public.kvkk_requests;
create policy "kvkk_req_select_own" on public.kvkk_requests
  for select using (auth.uid() = user_id OR user_id is null);
-- Anonim başvuru için INSERT herkese açık (rate-limit edilmeli — app katmanında)
create policy "kvkk_req_insert_any" on public.kvkk_requests
  for insert with check (true);

-- data_export_requests: kullanıcı kendi taleplerini görür
drop policy if exists "export_select_own" on public.data_export_requests;
drop policy if exists "export_insert_own" on public.data_export_requests;
create policy "export_select_own" on public.data_export_requests
  for select using (auth.uid() = user_id);
create policy "export_insert_own" on public.data_export_requests
  for insert with check (auth.uid() = user_id);

-- account_deletion_requests: kullanıcı kendi taleplerini görür/oluşturur/iptal eder
drop policy if exists "del_select_own" on public.account_deletion_requests;
drop policy if exists "del_insert_own" on public.account_deletion_requests;
drop policy if exists "del_update_own" on public.account_deletion_requests;
create policy "del_select_own" on public.account_deletion_requests
  for select using (auth.uid() = user_id);
create policy "del_insert_own" on public.account_deletion_requests
  for insert with check (auth.uid() = user_id);
create policy "del_update_own" on public.account_deletion_requests
  for update using (auth.uid() = user_id);

-- audit_logs: kullanıcı kendi loglarını görebilir (m.11 erişim hakkı)
drop policy if exists "audit_select_own" on public.audit_logs;
create policy "audit_select_own" on public.audit_logs
  for select using (auth.uid() = user_id);
-- INSERT sadece service role

-- ============================================================
-- TRIGGERS
-- ============================================================
drop trigger if exists kvkk_requests_updated_at on public.kvkk_requests;
create trigger kvkk_requests_updated_at
  before update on public.kvkk_requests
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- RPC: hesap silme akışı
-- Kullanıcı silme talebi gönderir → 30 gün cool-off → cron silmesini yapar
-- ============================================================
create or replace function public.request_account_deletion(
  p_reason text default null,
  p_retention text default 'anonymize'
)
returns table(scheduled_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_scheduled timestamptz;
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  if p_retention not in ('anonymize', 'delete_immediately', 'legal_minimum') then
    raise exception 'Geçersiz retention_choice';
  end if;

  -- Mevcut talep varsa onun scheduled tarihini döndür
  select scheduled_deletion_at into v_scheduled
  from public.account_deletion_requests
  where user_id = v_user_id and status = 'pending';

  if v_scheduled is not null then
    return query select v_scheduled;
    return;
  end if;

  insert into public.account_deletion_requests (
    user_id, reason, retention_choice
  ) values (v_user_id, p_reason, p_retention)
  returning scheduled_deletion_at into v_scheduled;

  -- Audit log
  insert into public.audit_logs (user_id, action, resource_type, metadata)
  values (
    v_user_id,
    'account.deletion_requested',
    'user',
    jsonb_build_object('retention', p_retention, 'scheduled_at', v_scheduled)
  );

  return query select v_scheduled;
end;
$$;

-- Kullanıcı vazgeçerse
create or replace function public.cancel_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated int;
begin
  if v_user_id is null then
    raise exception 'Oturum gerekli';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled', cancelled_at = now()
  where user_id = v_user_id and status = 'pending';

  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    insert into public.audit_logs (user_id, action, resource_type)
    values (v_user_id, 'account.deletion_cancelled', 'user');
  end if;

  return v_updated > 0;
end;
$$;
