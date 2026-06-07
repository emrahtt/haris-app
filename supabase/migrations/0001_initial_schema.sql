-- ============================================================
-- HARIS — İlk Şema (Faz 2 + Faz 6.5 düzeltmeleri)
-- ============================================================
-- Row Level Security tüm tablolarda aktif.
-- Faz 6.5 değişiklikleri:
--   - documents.id: text → uuid (uygulama randomUUID() üretir)
--   - documents.storage_path: zorunlu (RLS path uyumu için)
-- ============================================================

-- profiles: auth.users'ı genişletir
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  firm_name text,
  baro_sicil text,
  plan text not null default 'starter',
  initials text generated always as (
    upper(substring(coalesce(full_name, '?') from 1 for 1))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cases: davalar
create table if not exists public.cases (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  case_type text not null check (
    case_type in ('tazminat','is','ticari','aile','ceza','icra','idari','gayri')
  ),
  status text not null default 'active' check (
    status in ('active','pending','urgent','closed')
  ),
  court text,
  esas_no text,
  client_name text not null,
  opponent_name text,
  next_event text,
  next_date date,
  success_prob int check (success_prob between 0 and 100),
  summary text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cases_user_id_idx on public.cases(user_id);
create index if not exists cases_status_idx on public.cases(status);

-- documents: dava dosyaları (Faz 6.5: id uuid)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  tag text,
  size_bytes bigint,
  storage_path text not null,
  is_critical boolean default false,
  ocr_text text,
  created_at timestamptz not null default now()
);

create index if not exists documents_case_id_idx on public.documents(case_id);
create index if not exists documents_user_id_idx on public.documents(user_id);

-- petitions
create table if not exists public.petitions (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  title text not null,
  content text not null,
  version int not null default 1,
  status text not null default 'draft' check (
    status in ('draft','reviewing','final','submitted')
  ),
  ai_metadata jsonb default '{}'::jsonb,
  citations jsonb default '[]'::jsonb,
  adversarial_attacks jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists petitions_case_id_idx on public.petitions(case_id);

-- agent_activities: audit trail
create table if not exists public.agent_activities (
  id uuid primary key default gen_random_uuid(),
  case_id text references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id int not null,
  agent_name text not null,
  task text not null,
  status text not null check (status in ('working','done','failed','idle')),
  progress int default 0,
  input jsonb,
  output jsonb,
  duration_ms int,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists agent_activities_user_id_idx
  on public.agent_activities(user_id);
create index if not exists agent_activities_case_id_idx
  on public.agent_activities(case_id);

-- deadlines
create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_date date not null,
  legal_basis text,
  level text not null default 'normal' check (level in ('urgent','warn','normal')),
  completed boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists deadlines_due_date_idx on public.deadlines(due_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.petitions enable row level security;
alter table public.agent_activities enable row level security;
alter table public.deadlines enable row level security;

-- profiles
drop policy if exists "Kullanıcılar kendi profilini görür" on public.profiles;
drop policy if exists "Kullanıcılar kendi profilini günceller" on public.profiles;
drop policy if exists "Yeni profil eklenebilir" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- cases
drop policy if exists "Kullanıcılar kendi davalarını görür" on public.cases;
drop policy if exists "Kullanıcılar kendi davalarını oluşturur" on public.cases;
drop policy if exists "Kullanıcılar kendi davalarını günceller" on public.cases;
drop policy if exists "Kullanıcılar kendi davalarını siler" on public.cases;
create policy "cases_select" on public.cases for select using (auth.uid() = user_id);
create policy "cases_insert" on public.cases for insert with check (auth.uid() = user_id);
create policy "cases_update" on public.cases for update using (auth.uid() = user_id);
create policy "cases_delete" on public.cases for delete using (auth.uid() = user_id);

-- documents
drop policy if exists "docs_select" on public.documents;
drop policy if exists "docs_insert" on public.documents;
drop policy if exists "docs_update" on public.documents;
drop policy if exists "docs_delete" on public.documents;
create policy "docs_select" on public.documents for select using (auth.uid() = user_id);
create policy "docs_insert" on public.documents for insert with check (auth.uid() = user_id);
create policy "docs_update" on public.documents for update using (auth.uid() = user_id);
create policy "docs_delete" on public.documents for delete using (auth.uid() = user_id);

-- petitions
drop policy if exists "pet_select" on public.petitions;
drop policy if exists "pet_insert" on public.petitions;
drop policy if exists "pet_update" on public.petitions;
drop policy if exists "pet_delete" on public.petitions;
create policy "pet_select" on public.petitions for select using (auth.uid() = user_id);
create policy "pet_insert" on public.petitions for insert with check (auth.uid() = user_id);
create policy "pet_update" on public.petitions for update using (auth.uid() = user_id);
create policy "pet_delete" on public.petitions for delete using (auth.uid() = user_id);

-- agent_activities
drop policy if exists "act_select" on public.agent_activities;
drop policy if exists "act_insert" on public.agent_activities;
create policy "act_select" on public.agent_activities for select using (auth.uid() = user_id);
create policy "act_insert" on public.agent_activities for insert with check (auth.uid() = user_id);

-- deadlines
drop policy if exists "dl_select" on public.deadlines;
drop policy if exists "dl_insert" on public.deadlines;
drop policy if exists "dl_update" on public.deadlines;
drop policy if exists "dl_delete" on public.deadlines;
create policy "dl_select" on public.deadlines for select using (auth.uid() = user_id);
create policy "dl_insert" on public.deadlines for insert with check (auth.uid() = user_id);
create policy "dl_update" on public.deadlines for update using (auth.uid() = user_id);
create policy "dl_delete" on public.deadlines for delete using (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cases_updated_at on public.cases;
create trigger cases_updated_at before update on public.cases
  for each row execute procedure public.set_updated_at();

drop trigger if exists petitions_updated_at on public.petitions;
create trigger petitions_updated_at before update on public.petitions
  for each row execute procedure public.set_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
