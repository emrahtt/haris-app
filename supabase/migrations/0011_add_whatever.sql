-- ============================================================
-- Migration 0011: Supabase Security Advisor Düzeltmeleri
-- ============================================================

-- BÖLÜM 1: SECURITY DEFINER VIEW'LARI DÜZELT (CRITICAL)
alter view public.admin_system_metrics set (security_invoker = true);
alter view public.scraping_stats set (security_invoker = true);

-- BÖLÜM 2: RLS INIT PLAN OPTİMİZASYONU (WARNING → Performans)

-- profiles
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_admin_can_view_all" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "profiles_update" on public.profiles
  for update using ((select auth.uid()) = id);
create policy "profiles_insert" on public.profiles
  for insert with check ((select auth.uid()) = id);
create policy "profiles_admin_can_view_all" on public.profiles
  for select using (public.is_admin((select auth.uid())));

-- cases
drop policy if exists "cases_select" on public.cases;
drop policy if exists "cases_insert" on public.cases;
drop policy if exists "cases_update" on public.cases;
drop policy if exists "cases_delete" on public.cases;

create policy "cases_select" on public.cases
  for select using ((select auth.uid()) = user_id);
create policy "cases_insert" on public.cases
  for insert with check ((select auth.uid()) = user_id);
create policy "cases_update" on public.cases
  for update using ((select auth.uid()) = user_id);
create policy "cases_delete" on public.cases
  for delete using ((select auth.uid()) = user_id);

-- documents
drop policy if exists "docs_select" on public.documents;
drop policy if exists "docs_insert" on public.documents;
drop policy if exists "docs_update" on public.documents;
drop policy if exists "docs_delete" on public.documents;

create policy "docs_select" on public.documents
  for select using ((select auth.uid()) = user_id);
create policy "docs_insert" on public.documents
  for insert with check ((select auth.uid()) = user_id);
create policy "docs_update" on public.documents
  for update using ((select auth.uid()) = user_id);
create policy "docs_delete" on public.documents
  for delete using ((select auth.uid()) = user_id);

-- petitions
drop policy if exists "pet_select" on public.petitions;
drop policy if exists "pet_insert" on public.petitions;
drop policy if exists "pet_update" on public.petitions;
drop policy if exists "pet_delete" on public.petitions;

create policy "pet_select" on public.petitions
  for select using ((select auth.uid()) = user_id);
create policy "pet_insert" on public.petitions
  for insert with check ((select auth.uid()) = user_id);
create policy "pet_update" on public.petitions
  for update using ((select auth.uid()) = user_id);
create policy "pet_delete" on public.petitions
  for delete using ((select auth.uid()) = user_id);

-- agent_activities
drop policy if exists "act_select" on public.agent_activities;
drop policy if exists "act_insert" on public.agent_activities;

create policy "act_select" on public.agent_activities
  for select using ((select auth.uid()) = user_id);
create policy "act_insert" on public.agent_activities
  for insert with check ((select auth.uid()) = user_id);

-- deadlines
drop policy if exists "dl_select" on public.deadlines;
drop policy if exists "dl_insert" on public.deadlines;
drop policy if exists "dl_update" on public.deadlines;
drop policy if exists "dl_delete" on public.deadlines;

create policy "dl_select" on public.deadlines
  for select using ((select auth.uid()) = user_id);
create policy "dl_insert" on public.deadlines
  for insert with check ((select auth.uid()) = user_id);
create policy "dl_update" on public.deadlines
  for update using ((select auth.uid()) = user_id);
create policy "dl_delete" on public.deadlines
  for delete using ((select auth.uid()) = user_id);