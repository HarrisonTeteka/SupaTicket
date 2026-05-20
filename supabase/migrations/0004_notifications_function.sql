-- 0004_notifications_function.sql
-- Phase 3 (Notifications): controlled insert path + lock down the policy.
-- Run this in the Supabase SQL Editor after 0003.
-- Idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER notify helper. Lets any authenticated user send a
-- notification to any other user, but only via this controlled path
-- (it is wired into the DB triggers added in 0005).
-- ---------------------------------------------------------------------------
create or replace function public.notify_user(
  target_user uuid,
  msg         text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, message)
  values (target_user, msg);
end;
$$;

revoke all on function public.notify_user(uuid, text) from public;
grant execute on function public.notify_user(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Replace the permissive Phase 1 insert policy with a restrictive one.
-- After this, a user can only insert notifications for themselves directly;
-- notifications for other users flow exclusively through notify_user()
-- (which runs as definer and bypasses RLS).
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_insert_auth" on public.notifications;
drop policy if exists "notifications_insert_self" on public.notifications;

create policy "notifications_insert_self" on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid());
