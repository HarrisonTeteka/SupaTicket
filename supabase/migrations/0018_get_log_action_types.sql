-- 0018_get_log_action_types.sql
-- Bug 04: replace the client-side `listActionTypes` full-table read.
-- Pre-fix, the admin Logs tab and the Reports log-export panel each
-- pulled the `action_type` column from every system_logs row just to
-- build a small filter dropdown. system_logs is append-only so this
-- query grows monotonically with audit activity.
-- Run in the Supabase SQL Editor after 0017. Idempotent.

-- ---------------------------------------------------------------------------
-- Returns distinct action_type values sorted alphabetically. The btree
-- index `system_logs_action_idx` (0001_init.sql) covers the DISTINCT scan.
-- Admin-only by RLS; the function checks the caller is an admin so the
-- SECURITY DEFINER bypass cannot be used to leak action types to staff
-- or customers.
-- ---------------------------------------------------------------------------
create or replace function public.get_log_action_types()
returns text[]
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result text[];
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin only';
  end if;

  select coalesce(array_agg(action_type order by action_type), '{}'::text[])
    into result
    from (select distinct action_type from public.system_logs) t;

  return result;
end $$;

revoke all on function public.get_log_action_types() from public;
grant execute on function public.get_log_action_types() to authenticated;
