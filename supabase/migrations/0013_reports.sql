-- 0013_reports.sql
-- Phase 10 (Reporting & Exports): get_weekly_stats() — a SECURITY DEFINER
-- aggregate the weekly-digest Edge Function reads to build its email.
-- Run this in the Supabase SQL Editor after 0012. Idempotent.
--
-- (Note: PHASES-8-10.md references this as "0014_reports.sql" — corrected
-- to 0013 here for sequential numbering.)

-- ---------------------------------------------------------------------------
-- Returns a JSON roll-up of activity over the last 7 days plus a
-- "currently breached" SLA count (point-in-time, not week-bounded).
-- Granted to any authenticated user; the function itself reads via definer
-- so it bypasses RLS — there is no sensitive per-row data in the output.
-- ---------------------------------------------------------------------------
create or replace function public.get_weekly_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  week_ago               timestamptz := now() - interval '7 days';
  total_created          int;
  total_resolved         int;
  by_status              jsonb;
  by_priority            jsonb;
  top_categories         jsonb;
  currently_breached     int;
  avg_resolution_hours   numeric;
  avg_first_response_hr  numeric;
  csat_avg               numeric;
  csat_count             int;
begin
  select count(*) into total_created
    from public.tickets
    where created_at >= week_ago;

  select count(*) into total_resolved
    from public.tickets
    where status in ('Resolved', 'Closed')
      and resolved_at is not null
      and resolved_at >= week_ago;

  select coalesce(jsonb_object_agg(status, c), '{}'::jsonb) into by_status
  from (
    select status, count(*) c
      from public.tickets
      where created_at >= week_ago
      group by status
  ) s;

  select coalesce(jsonb_object_agg(priority, c), '{}'::jsonb) into by_priority
  from (
    select priority, count(*) c
      from public.tickets
      where created_at >= week_ago
      group by priority
  ) s;

  select coalesce(
    jsonb_agg(jsonb_build_object('category', category, 'count', c) order by c desc),
    '[]'::jsonb
  ) into top_categories
  from (
    select category, count(*) c
      from public.tickets
      where created_at >= week_ago
      group by category
      order by count(*) desc
      limit 5
  ) s;

  select count(*) into currently_breached
    from public.tickets
    where resolution_due_at is not null
      and resolution_due_at < now()
      and status not in ('Resolved', 'Closed');

  select round(avg(extract(epoch from (resolved_at - created_at)) / 3600.0)::numeric, 2)
    into avg_resolution_hours
    from public.tickets
    where resolved_at is not null and resolved_at >= week_ago;

  select round(avg(extract(epoch from (first_response_at - created_at)) / 3600.0)::numeric, 2)
    into avg_first_response_hr
    from public.tickets
    where first_response_at is not null and first_response_at >= week_ago;

  select round(avg(satisfaction_rating)::numeric, 2), count(satisfaction_rating)
    into csat_avg, csat_count
    from public.tickets
    where resolved_at is not null
      and resolved_at >= week_ago
      and satisfaction_rating is not null;

  return jsonb_build_object(
    'week_start',              week_ago,
    'week_end',                now(),
    'total_created',           total_created,
    'total_resolved',          total_resolved,
    'by_status',               by_status,
    'by_priority',             by_priority,
    'top_categories',          top_categories,
    'currently_breached',      currently_breached,
    'avg_resolution_hours',    avg_resolution_hours,
    'avg_first_response_hours', avg_first_response_hr,
    'csat_avg',                csat_avg,
    'csat_count',              csat_count
  );
end $$;

revoke all on function public.get_weekly_stats() from public;
grant execute on function public.get_weekly_stats() to authenticated;
