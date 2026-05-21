-- 0006_admin_log_helper.sql
-- Phase 4 (Admin/Settings): audit-log helper + lock down system_logs inserts.
-- Run this in the Supabase SQL Editor after 0005.
-- Idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- log_action(): assembles the actor's name and writes a system_logs row.
-- Client code calls this via rpc('log_action', ...) instead of inserting
-- directly, so it never has to look up its own profile name.
-- ---------------------------------------------------------------------------
create or replace function public.log_action(
  action_type text,
  details     text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  select name into uname from public.profiles where id = auth.uid();
  insert into public.system_logs (action_type, details, user_id, user_name)
  values (action_type, details, auth.uid(), uname);
end;
$$;

revoke all on function public.log_action(text, text) from public;
grant execute on function public.log_action(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Tighten the insert policy: drop the permissive Phase 1 policy so normal
-- users can no longer insert into system_logs. Only SECURITY DEFINER
-- functions (log_action) can write now. Reads stay admin-only (from 0001).
-- ---------------------------------------------------------------------------
drop policy if exists "system_logs_insert_auth" on public.system_logs;
