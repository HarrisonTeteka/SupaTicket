-- 0002_profiles_self_update_guard.sql
-- Phase 1 hardening (HANDOVER.md Fix 7 + Fix 8).
-- Run this in the Supabase SQL Editor after 0001_init.sql.

-- ---------------------------------------------------------------------------
-- Fix 7 — Prevent non-admins from changing their own role / status / department.
-- profiles_update_self lets a user update their own row, but a column-level
-- guard is needed because Postgres RLS doesn't support per-column UPDATE
-- policies cleanly.
-- ---------------------------------------------------------------------------

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admins can change anything.
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  -- Non-admins editing their own row may not change these fields.
  if new.id = auth.uid() then
    if new.role is distinct from old.role then
      raise exception 'You cannot change your own role';
    end if;
    if new.status is distinct from old.status then
      raise exception 'You cannot change your own status';
    end if;
    if new.department is distinct from old.department then
      raise exception 'Only admins can change department';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_self_update on public.profiles;
create trigger profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();

-- ---------------------------------------------------------------------------
-- Fix 8 — Tighten loose insert policies.
-- ---------------------------------------------------------------------------

-- tickets: prevent creating tickets attributed to another user
drop policy if exists "tickets_insert_auth" on public.tickets;
create policy "tickets_insert_auth" on public.tickets
  for insert to authenticated
  with check (created_by is null or created_by = auth.uid());

-- system_logs: prevent forging audit entries for another user
drop policy if exists "system_logs_insert_auth" on public.system_logs;
create policy "system_logs_insert_auth" on public.system_logs
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

-- Note: notifications_insert_auth is intentionally left permissive for now
-- (so user A can notify user B). It moves to a SECURITY DEFINER notify_user()
-- function in Phase 3 — see PHASES.md migration 0004.
