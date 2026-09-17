-- ============================================================
-- HARIS · Migration 0016 — Model Stratejileri (Faz 16)
--
-- Amaç: Rol bazında model seçimini Vercel env'inden çıkarıp
--       veritabanına taşımak. Böylece kullanıcı panelden
--       değiştirip KAYDEDEBİLİR (env değişkenleri runtime'da
--       değiştirilemez, build anında sabitlenir).
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run
-- Idempotent: IF NOT EXISTS kullanıldı, tekrar çalıştırmak güvenlidir.
-- ============================================================

create table if not exists public.model_strategies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  -- { "orchestrator": {"provider":"anthropic","modelId":"claude-opus-5","effort":"high"}, ... }
  config        jsonb not null default '{}'::jsonb,
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint model_strategies_name_unique unique (user_id, name)
);

comment on table public.model_strategies is
  'HARIS Faz 16: Kullanıcının rol bazlı model seçim düzenleri (strateji/preset).';

-- Kullanıcı başına en fazla bir aktif strateji
create unique index if not exists model_strategies_one_active_per_user
  on public.model_strategies (user_id)
  where is_active;

create index if not exists model_strategies_user_idx
  on public.model_strategies (user_id, created_at desc);

-- updated_at otomatik güncellensin
create or replace function public.touch_model_strategies_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists model_strategies_touch on public.model_strategies;
create trigger model_strategies_touch
  before update on public.model_strategies
  for each row execute function public.touch_model_strategies_updated_at();

-- ============================================================
-- RLS — her kullanıcı yalnızca kendi stratejilerini görür
-- (matter-level isolation prensibiyle aynı)
-- ============================================================
alter table public.model_strategies enable row level security;

drop policy if exists "model_strategies_select_own" on public.model_strategies;
create policy "model_strategies_select_own"
  on public.model_strategies for select
  using (auth.uid() = user_id);

drop policy if exists "model_strategies_insert_own" on public.model_strategies;
create policy "model_strategies_insert_own"
  on public.model_strategies for insert
  with check (auth.uid() = user_id);

drop policy if exists "model_strategies_update_own" on public.model_strategies;
create policy "model_strategies_update_own"
  on public.model_strategies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "model_strategies_delete_own" on public.model_strategies;
create policy "model_strategies_delete_own"
  on public.model_strategies for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Varsayılan strateji (yeni kullanıcı için örnek şablon)
-- Not: Bu satır kayıt OLUŞTURMAZ; panel "Default"a dön dediğinde
--      kod tarafındaki DEFAULT_STRATEGY kullanılır.
-- ============================================================
