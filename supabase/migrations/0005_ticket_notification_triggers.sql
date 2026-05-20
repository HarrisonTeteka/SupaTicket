-- 0005_ticket_notification_triggers.sql
-- Phase 3 (Notifications): DB triggers that fan out notifications on ticket
-- assignment, status change and new comments.
-- Run this in the Supabase SQL Editor after 0004.
-- Idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- Notify the assignee when a ticket is (re)assigned.
-- ---------------------------------------------------------------------------
create or replace function public.tickets_notify_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null
     and (old.assigned_to is distinct from new.assigned_to) then
    perform public.notify_user(
      new.assigned_to,
      'You have been assigned ticket #' || new.ticket_number || ': ' || new.title
    );
  end if;
  return new;
end $$;

drop trigger if exists tickets_notify_assignment on public.tickets;
create trigger tickets_notify_assignment
  after update of assigned_to on public.tickets
  for each row execute function public.tickets_notify_assignment();

-- ---------------------------------------------------------------------------
-- Notify the creator when a ticket's status changes.
-- ---------------------------------------------------------------------------
create or replace function public.tickets_notify_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status and new.created_by is not null then
    perform public.notify_user(
      new.created_by,
      'Ticket #' || new.ticket_number || ' is now ' || new.status
    );
  end if;
  return new;
end $$;

drop trigger if exists tickets_notify_status on public.tickets;
create trigger tickets_notify_status
  after update of status on public.tickets
  for each row execute function public.tickets_notify_status();

-- ---------------------------------------------------------------------------
-- Notify the ticket creator + assignee on a new comment (skip the commenter).
-- ---------------------------------------------------------------------------
create or replace function public.comments_notify_new()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t public.tickets%rowtype;
begin
  select * into t from public.tickets where id = new.ticket_id;

  if t.created_by is not null and t.created_by <> new.author_id then
    perform public.notify_user(
      t.created_by,
      'New comment on ticket #' || t.ticket_number
    );
  end if;

  if t.assigned_to is not null
     and t.assigned_to <> new.author_id
     and t.assigned_to <> t.created_by then
    perform public.notify_user(
      t.assigned_to,
      'New comment on ticket #' || t.ticket_number
    );
  end if;

  return new;
end $$;

drop trigger if exists comments_notify_new on public.comments;
create trigger comments_notify_new
  after insert on public.comments
  for each row execute function public.comments_notify_new();
