-- 0007_ticket_metrics.sql
-- Phase 5 (Dashboards & Metrics): timestamps + CSAT for KPI reporting.
-- Run this in the Supabase SQL Editor after 0006.
-- Idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------
alter table public.tickets
  add column if not exists resolved_at        timestamptz,
  add column if not exists first_response_at  timestamptz,
  add column if not exists satisfaction_rating int
    check (satisfaction_rating between 1 and 5);

-- Backfill resolved_at for tickets already Resolved (approximated as updated_at).
update public.tickets
  set resolved_at = updated_at
  where status = 'Resolved' and resolved_at is null;

-- No new RLS: tickets_update_auth already lets an authenticated user write
-- satisfaction_rating; the dashboard only reads these columns.

-- ---------------------------------------------------------------------------
-- resolved_at: stamped when a ticket enters 'Resolved', cleared when it leaves.
-- ---------------------------------------------------------------------------
create or replace function public.tickets_set_resolved_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'Resolved' and old.status is distinct from 'Resolved' then
    new.resolved_at := now();
  elsif new.status <> 'Resolved' and old.status = 'Resolved' then
    new.resolved_at := null;
  end if;
  return new;
end $$;

drop trigger if exists tickets_set_resolved_at on public.tickets;
create trigger tickets_set_resolved_at
  before update of status on public.tickets
  for each row execute function public.tickets_set_resolved_at();

-- ---------------------------------------------------------------------------
-- first_response_at: stamped on the first comment authored by someone other
-- than the ticket creator.
-- ---------------------------------------------------------------------------
create or replace function public.comments_stamp_first_response()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t public.tickets%rowtype;
begin
  select * into t from public.tickets where id = new.ticket_id;
  if t.first_response_at is null
     and t.created_by is not null
     and new.author_id is distinct from t.created_by then
    update public.tickets
      set first_response_at = new.created_at
      where id = new.ticket_id;
  end if;
  return new;
end $$;

drop trigger if exists comments_stamp_first_response on public.comments;
create trigger comments_stamp_first_response
  after insert on public.comments
  for each row execute function public.comments_stamp_first_response();
