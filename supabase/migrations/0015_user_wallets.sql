-- Kullanıcı AI cüzdanı: satın alınan ek çağrılar (plan kotasına ek)
create table if not exists public.user_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bonus_ai_calls int not null default 0,
  lifetime_purchased_calls int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_wallets enable row level security;

drop policy if exists "wallets_select_own" on public.user_wallets;
create policy "wallets_select_own" on public.user_wallets
  for select using (auth.uid() = user_id);
