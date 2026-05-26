-- 0010_sla_escalation.sql
-- Phase 7 (Escalations): a function that escalates overdue open tickets and
-- notifies the assignee + every admin, plus a pg_cron schedule that runs it
-- every 5 minutes.
-- Run this in the Supabase SQL Editor after 0009. Idempotent.

-- ---------------------------------------------------------------------------
-- escalate_overdue_tickets()
-- For every ticket whose resolution_due_at is in the past and which is still
-- in a non-terminal, non-Escalated state: set status = 'Escalated' and fan
-- out notifications via the existing notify_user() helper. Returns the
-- number of tickets escalated this run.
-- ---------------------------------------------------------------------------
create or replace function public.escalate_overdue_tickets()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  t                record;
  admin_id         uuid;
  escalated_count  int := 0;
begin
  for t in
    select id, ticket_number, title, assigned_to
    from public.tickets
    where resolution_due_at is not null
      and resolution_due_at < now()
      and status not in ('Resolved', 'Closed', 'Escalated')
  loop
    update public.tickets
      set status = 'Escalated'
      where id = t.id;

    if t.assigned_to is not null then
      perform public.notify_user(
        t.assigned_to,
        'SLA breach: ticket #' || t.ticket_number || ' (' || t.title || ') has been escalated'
      );
    end if;

    for admin_id in select id from public.profiles where role = 'admin' loop
      perform public.notify_user(
        admin_id,
        'SLA breach escalation: ticket #' || t.ticket_number
      );
    end loop;

    escalated_count := escalated_count + 1;
  end loop;

  return escalated_count;
end $$;

revoke all on function public.escalate_overdue_tickets() from public;
grant execute on function public.escalate_overdue_tickets() to authenticated;

-- ---------------------------------------------------------------------------
-- Schedule via pg_cron, every 5 minutes. If pg_cron is not enabled on the
-- project this block is a no-op; in that case either enable pg_cron from
-- Database -> Extensions, or run escalate_overdue_tickets() from a Supabase
-- Edge Function on a cron schedule. The function itself works the same way
-- regardless of how it's triggered.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('escalate_overdue_tickets_5min');
    exception when others then null;
    end;
    perform cron.schedule(
      'escalate_overdue_tickets_5min',
      '*/5 * * * *',
      $cron$select public.escalate_overdue_tickets();$cron$
    );
  end if;
end $$;
