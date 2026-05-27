-- 0016_get_dashboard_metrics.sql
-- Bug 03: replace the unbounded `listTicketsForMetrics` client query.
-- Pre-fix the dashboard pulled every ticket row on mount and on every
-- realtime change, and silently undercounted past Supabase's 1000-row
-- default. This RPC does the aggregation server-side and returns a
-- single JSONB with every KPI the dashboard needs.
-- Run in the Supabase SQL Editor after 0015. Idempotent.

create or replace function public.get_dashboard_metrics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  week_ago         timestamptz := now() - interval '7 days';
  total_count      int;
  open_count       int;
  my_open_count    int;
  unassigned_count int;
  resolved_week    int;
  avg_resolve_hr   numeric;
  avg_response_hr  numeric;
  csat_avg         numeric;
  csat_count       int;
  by_status        jsonb;
  by_priority      jsonb;
  by_sla           jsonb;
  by_agent         jsonb;
begin
  -- ---------------------------------------------------------------------
  -- Totals
  -- ---------------------------------------------------------------------
  select count(*) into total_count from public.tickets;

  select count(*) into open_count from public.tickets
    where status not in ('Resolved', 'Closed');

  select count(*) into my_open_count from public.tickets
    where status not in ('Resolved', 'Closed') and assigned_to = p_user_id;

  select count(*) into unassigned_count from public.tickets
    where status not in ('Resolved', 'Closed') and assigned_to is null;

  select count(*) into resolved_week from public.tickets
    where status in ('Resolved', 'Closed')
      and resolved_at is not null
      and resolved_at >= week_ago;

  -- ---------------------------------------------------------------------
  -- Lifetime averages (matches pre-fix client behaviour)
  -- ---------------------------------------------------------------------
  select round(avg(extract(epoch from (resolved_at - created_at)) / 3600.0)::numeric, 2)
    into avg_resolve_hr
    from public.tickets
    where resolved_at is not null;

  select round(avg(extract(epoch from (first_response_at - created_at)) / 3600.0)::numeric, 2)
    into avg_response_hr
    from public.tickets
    where first_response_at is not null;

  select round(avg(satisfaction_rating)::numeric, 2), count(satisfaction_rating)
    into csat_avg, csat_count
    from public.tickets
    where satisfaction_rating is not null;

  -- ---------------------------------------------------------------------
  -- Breakdowns
  -- ---------------------------------------------------------------------
  select coalesce(jsonb_object_agg(status, c), '{}'::jsonb) into by_status
  from (select status, count(*) c from public.tickets group by status) s;

  select coalesce(jsonb_object_agg(priority, c), '{}'::jsonb) into by_priority
  from (select priority, count(*) c from public.tickets group by priority) s;

  -- SLA state mirrors slaState() in tickets.utils.js: only non-terminal
  -- tickets with a resolution_due_at participate; at-risk threshold is
  -- 80% of (due - created) elapsed.
  select jsonb_build_object(
    'on-track', coalesce(sum(case when state = 'on-track' then 1 else 0 end), 0),
    'at-risk',  coalesce(sum(case when state = 'at-risk'  then 1 else 0 end), 0),
    'breached', coalesce(sum(case when state = 'breached' then 1 else 0 end), 0)
  ) into by_sla
  from (
    select
      case
        when now() >= resolution_due_at then 'breached'
        when (extract(epoch from (now() - created_at)) /
              nullif(extract(epoch from (resolution_due_at - created_at)), 0)) >= 0.8
             then 'at-risk'
        else 'on-track'
      end as state
    from public.tickets
    where status not in ('Resolved', 'Closed')
      and resolution_due_at is not null
  ) t;

  -- Open ticket counts per assigned agent (unassigned bucket lives in
  -- `unassigned_count` above so callers can render it separately).
  select coalesce(
           jsonb_agg(jsonb_build_object('id', assigned_to, 'count', c) order by c desc),
           '[]'::jsonb
         )
    into by_agent
    from (
      select assigned_to, count(*) c
        from public.tickets
        where status not in ('Resolved', 'Closed')
          and assigned_to is not null
        group by assigned_to
    ) t;

  return jsonb_build_object(
    'total',                 total_count,
    'open',                  open_count,
    'myOpen',                my_open_count,
    'unassigned',            unassigned_count,
    'resolvedThisWeek',      resolved_week,
    'avgResolutionHours',    avg_resolve_hr,
    'avgFirstResponseHours', avg_response_hr,
    'csatAverage',           csat_avg,
    'csatCount',             csat_count,
    'byStatus',              by_status,
    'byPriority',            by_priority,
    'bySla',                 by_sla,
    'byAgent',               by_agent
  );
end $$;

revoke all on function public.get_dashboard_metrics(uuid) from public;
grant execute on function public.get_dashboard_metrics(uuid) to authenticated;
