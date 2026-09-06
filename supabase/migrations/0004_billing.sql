-- ============================================================
-- HARIS Faz 8 — Billing + Subscriptions + Usage Tracking
-- ============================================================
-- Plan abonelikleri, ödeme provider (Stripe/iyzico) eşleştirme,
-- aylık AI kullanım sayaçları.
-- ============================================================

-- 1) subscriptions: kullanıcı plan abonelikleri
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (
    plan_id in ('free', 'starter', 'pro', 'enterprise')
  ),
  status text not null default 'active' check (
    status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')
  ),
  -- Hangi provider ile ödendi?
  provider text check (provider in ('stripe', 'iyzico', 'manual', 'none')),
  -- Provider'daki abonelik kimliği
  provider_subscription_id text,
  provider_customer_id text,
  -- Fatura periyodu
  billing_period text default 'monthly' check (
    billing_period in ('monthly', 'yearly')
  ),
  -- Aktif dönem
  current_period_start timestamptz,
  current_period_end timestamptz,
  -- Trial bitiş tarihi (varsa)
  trial_ends_at timestamptz,
  -- Cancellation
  cancel_at_period_end boolean default false,
  cancelled_at timestamptz,
  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id) -- her kullanıcı tek aktif abonelik
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx
  on public.subscriptions(status);
create index if not exists subscriptions_provider_subscription_id_idx
  on public.subscriptions(provider_subscription_id);

-- 2) usage_tracking: aylık AI/scraping/upload sayaçları
create table if not exists public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Hangi ay (YYYY-MM-01 formatında ilk gün)
  period_month date not null,
  -- Sayaçlar
  ai_calls int not null default 0,
  scraping_jobs int not null default 0,
  documents_uploaded int not null default 0,
  bytes_stored bigint not null default 0,
  -- Aşılan limit uyarıları
  ai_limit_warned boolean default false,
  ai_limit_blocked boolean default false,
  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_month)
);

create index if not exists usage_tracking_user_period_idx
  on public.usage_tracking(user_id, period_month);

-- 3) payment_events: webhook ile gelen ödeme olayları (audit)
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null,
  -- Stripe/iyzico raw event id (idempotency için)
  provider_event_id text unique,
  event_type text not null,
  -- Tutar
  amount_cents int,
  currency text,
  -- Raw payload (debug için)
  raw_payload jsonb,
  -- İşleme durumu
  processed boolean default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_user_idx on public.payment_events(user_id);
create index if not exists payment_events_provider_idx
  on public.payment_events(provider, provider_event_id);

-- 4) invoices: kullanıcıya sunulacak fatura kayıtları
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  invoice_number text unique,
  provider text not null,
  provider_invoice_id text,
  amount_cents int not null,
  currency text not null default 'TRY',
  status text not null check (
    status in ('draft', 'open', 'paid', 'uncollectible', 'void', 'refunded')
  ),
  invoice_date date not null default current_date,
  paid_at timestamptz,
  pdf_url text,
  hosted_url text, -- Stripe hosted invoice URL
  created_at timestamptz not null default now()
);

create index if not exists invoices_user_idx on public.invoices(user_id);
create index if not exists invoices_status_idx on public.invoices(status);

-- ============================================================
-- RLS
-- ============================================================
alter table public.subscriptions enable row level security;
alter table public.usage_tracking enable row level security;
alter table public.payment_events enable row level security;
alter table public.invoices enable row level security;

-- subscriptions: kullanıcı kendi aboneliğini görür, sadece service role günceller
drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE policy yok → sadece service role (webhook + admin)

-- usage_tracking: kullanıcı kendi kullanımını görür
drop policy if exists "usage_select_own" on public.usage_tracking;
create policy "usage_select_own" on public.usage_tracking
  for select using (auth.uid() = user_id);
-- INSERT/UPDATE: service role only

-- payment_events: sadece service role
drop policy if exists "pe_select_own" on public.payment_events;
create policy "pe_select_own" on public.payment_events
  for select using (auth.uid() = user_id);

-- invoices: kullanıcı kendi faturalarını görür
drop policy if exists "inv_select_own" on public.invoices;
create policy "inv_select_own" on public.invoices
  for select using (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

drop trigger if exists usage_tracking_updated_at on public.usage_tracking;
create trigger usage_tracking_updated_at
  before update on public.usage_tracking
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- AUTO-CREATE FREE SUBSCRIPTION ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan_id, status, provider)
  values (new.id, 'free', 'active', 'none')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.handle_new_user_subscription();

-- ============================================================
-- RPC: increment_usage (atomic counter)
-- ============================================================
create or replace function public.increment_usage(
  p_user_id uuid,
  p_metric text,         -- 'ai_calls' | 'scraping_jobs' | 'documents_uploaded' | 'bytes_stored'
  p_amount int default 1
)
returns table (current_value int, period_month date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', now())::date;
  v_current int;
begin
  if p_metric not in ('ai_calls', 'scraping_jobs', 'documents_uploaded', 'bytes_stored') then
    raise exception 'Invalid metric: %', p_metric;
  end if;

  -- Upsert + increment
  execute format(
    'insert into public.usage_tracking (user_id, period_month, %I)
     values ($1, $2, $3)
     on conflict (user_id, period_month)
     do update set %I = usage_tracking.%I + $3, updated_at = now()
     returning %I',
    p_metric, p_metric, p_metric, p_metric
  ) into v_current using p_user_id, v_period, p_amount;

  return query select v_current, v_period;
end;
$$;
