-- 0008_workflow_depth.sql
-- Phase 6: expand the status enum, add tags, add internal-note flag.
-- Run this in the Supabase SQL Editor after 0007. Idempotent.

-- ---------------------------------------------------------------------------
-- Expand the ticket status enum from 3 states to the full workflow set.
-- ---------------------------------------------------------------------------
alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check
  check (status in (
    'Open', 'Pending', 'In Progress', 'Escalated', 'Resolved', 'Closed'
  ));

-- ---------------------------------------------------------------------------
-- Tags: free-form multi-tags on tickets, indexed for fast contains queries.
-- ---------------------------------------------------------------------------
alter table public.tickets
  add column if not exists tags text[] not null default '{}';

create index if not exists tickets_tags_idx
  on public.tickets using gin (tags);

-- ---------------------------------------------------------------------------
-- Internal note flag on comments. Phase 6 stores + renders this distinctly;
-- access-gating (hiding internal notes from customers) lands with the
-- customer portal in a later phase.
-- ---------------------------------------------------------------------------
alter table public.comments
  add column if not exists internal boolean not null default false;

-- ---------------------------------------------------------------------------
-- Update the 0007 resolved_at trigger so it treats both Resolved AND Closed
-- as terminal. `create or replace` overwrites the function in place; the
-- trigger already created by 0007 stays bound to it.
-- ---------------------------------------------------------------------------
create or replace function public.tickets_set_resolved_at()
returns trigger language plpgsql as $$
declare
  new_terminal boolean := new.status in ('Resolved', 'Closed');
  old_terminal boolean := old.status in ('Resolved', 'Closed');
begin
  if new_terminal and not old_terminal then
    new.resolved_at := now();
  elsif not new_terminal and old_terminal then
    new.resolved_at := null;
  end if;
  return new;
end $$;
