-- 0022_overdue.sql
-- "Overdue" lifecycle for stale tickets, modelled on the 0010 Escalated
-- pattern but driven by a flat admin-configurable day count (since the
-- ticket was created), not the per-priority SLA window.
--
-- - app_config.overdue_after_days (nullable; null OR <= 0 disables the
--   feature). Default 7.
-- - mark_overdue_tickets(): rewrites status -> 'Overdue' for any non-
--   terminal, non-Escalated, non-Overdue ticket whose age exceeds the
--   threshold. Returns the number of tickets flagged this run.
-- - pg_cron schedule every 5 minutes (same cadence as the escalate job).
--
-- Coexists with 0010's escalate_overdue_tickets():
--   - Overdue is reached first (created_at + N days).
--   - If the SLA resolution window passes later, escalate_overdue_tickets()
--     overrides Overdue -> Escalated (its WHERE clause excludes only
--     terminal + Escalated states, so Overdue is fair game to escalate).
-- Both jobs ignore Resolved / Closed.
--
-- Run this after 0021. Idempotent.

alter table public.app_config
  add column if not exists overdue_after_days int not null default 7;

create or replace function public.mark_overdue_tickets()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  threshold_days  int;
  overdue_count   int := 0;
  t               record;
begin
  select overdue_after_days into threshold_days from public.app_config where id = 1;
  if threshold_days is null or threshold_days <= 0 then
    return 0;  -- feature disabled
  end if;

  for t in
    select id, ticket_number
    from public.tickets
    where status not in ('Resolved', 'Closed', 'Escalated', 'Overdue')
      and created_at + (threshold_days || ' days')::interval < now()
  loop
    update public.tickets
      set status = 'Overdue'
      where id = t.id;
    overdue_count := overdue_count + 1;
  end loop;

  return overdue_count;
end $$;

revoke all on function public.mark_overdue_tickets() from public;
grant execute on function public.mark_overdue_tickets() to authenticated;

-- pg_cron schedule, every 5 minutes. No-op if pg_cron isn't enabled; in
-- that case enable it (Database -> Extensions) or invoke the function from
-- a Supabase Edge Function on its own schedule.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('mark_overdue_tickets_5min');
    exception when others then null;
    end;
    perform cron.schedule(
      'mark_overdue_tickets_5min',
      '*/5 * * * *',
      $cron$select public.mark_overdue_tickets();$cron$
    );
  end if;
end $$;
