-- Faz 14: bulanık isim eşleşmesi + mahkeme/esas alanları
create extension if not exists pg_trgm;

alter table public.workspaces
  add column if not exists court text default '',
  add column if not exists esas_no text default '';

create or replace function public.check_conflict_fuzzy(
  p_full_name text,
  p_tc_no text default null,
  p_exclude_workspace_id uuid default null,
  p_threshold real default 0.45
)
returns table (
  workspace_id uuid,
  workspace_title text,
  case_type text,
  party_id uuid,
  party_role text,
  party_name text,
  match_type text,
  severity text
)
language sql
security invoker
as $$
  select
    w.id,
    w.title,
    w.case_type,
    p.id,
    p.role,
    p.full_name,
    case
      when p_tc_no is not null and p.tc_no = p_tc_no then 'tc_match'
      when lower(p.full_name) = lower(p_full_name) then 'exact_name'
      else 'fuzzy_name'
    end,
    case
      when p.role = 'karsi_taraf' then 'critical'
      when p.role = 'muvekkil' then 'warning'
      else 'info'
    end
  from public.workspace_parties p
  join public.workspaces w on w.id = p.workspace_id
  where p.user_id = auth.uid()
    and (p_exclude_workspace_id is null or p.workspace_id <> p_exclude_workspace_id)
    and (
      (p_tc_no is not null and p.tc_no = p_tc_no)
      or similarity(lower(p.full_name), lower(p_full_name)) >= p_threshold
    );
$$;

grant execute on function public.check_conflict_fuzzy(text, text, uuid, real) to authenticated;
