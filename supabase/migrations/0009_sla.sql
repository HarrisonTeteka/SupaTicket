-- 0009_sla.sql
-- Phase 7 (SLAs): per-priority response/resolution targets + due-date columns
-- + a trigger that computes due dates on insert and on priority change.
-- Run this in the Supabase SQL Editor after 0008. Idempotent.

-- ---------------------------------------------------------------------------
-- app_config.sla_rules — per-priority targets in minutes.
-- Seeded with reasonable defaults:
--   Low    -> 24h response / 7d  resolution
--   Medium ->  8h response / 3d  resolution
--   High   ->  2h response / 24h resolution
--   Urgent -> 30m response / 4h  resolution
-- ---------------------------------------------------------------------------
alter table public.app_config
  add column if not exists sla_rules jsonb not null default
  '{
    "Low":    {"response_mins": 1440, "resolution_mins": 10080},
    "Medium": {"response_mins": 480,  "resolution_mins": 4320},
    "High":   {"response_mins": 120,  "resolution_mins": 1440},
    "Urgent": {"response_mins": 30,   "resolution_mins": 240}
  }'::jsonb;

-- Seed the singleton row if it somehow has an empty sla_rules.
update public.app_config
  set sla_rules = '{
    "Low":    {"response_mins": 1440, "resolution_mins": 10080},
    "Medium": {"response_mins": 480,  "resolution_mins": 4320},
    "High":   {"response_mins": 120,  "resolution_mins": 1440},
    "Urgent": {"response_mins": 30,   "resolution_mins": 240}
  }'::jsonb
  where id = 1 and (sla_rules is null or sla_rules = '{}'::jsonb);

-- ---------------------------------------------------------------------------
-- Due-date columns on tickets.
-- ---------------------------------------------------------------------------
alter table public.tickets
  add column if not exists response_due_at   timestamptz,
  add column if not exists resolution_due_at timestamptz;

-- ---------------------------------------------------------------------------
-- Compute due dates from priority + sla_rules. Runs before insert and before
-- a priority change so the dues stay anchored to created_at + current rule.
-- ---------------------------------------------------------------------------
create or replace function public.tickets_compute_sla()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rules     jsonb;
  rule      jsonb;
  resp_mins int;
  res_mins  int;
  base_at   timestamptz;
begin
  select sla_rules into rules from public.app_config where id = 1;
  if rules is null then return new; end if;

  rule := rules -> new.priority;
  if rule is null then return new; end if;

  resp_mins := (rule ->> 'response_mins')::int;
  res_mins  := (rule ->> 'resolution_mins')::int;

  base_at := coalesce(new.created_at, now());
  new.response_due_at   := base_at + (resp_mins || ' minutes')::interval;
  new.resolution_due_at := base_at + (res_mins  || ' minutes')::interval;

  return new;
end $$;

drop trigger if exists tickets_compute_sla_insert on public.tickets;
create trigger tickets_compute_sla_insert
  before insert on public.tickets
  for each row execute function public.tickets_compute_sla();

drop trigger if exists tickets_compute_sla_priority on public.tickets;
create trigger tickets_compute_sla_priority
  before update of priority on public.tickets
  for each row execute function public.tickets_compute_sla();

-- ---------------------------------------------------------------------------
-- Backfill due dates on existing tickets.
-- ---------------------------------------------------------------------------
update public.tickets t
  set response_due_at =
        t.created_at + (((c.sla_rules -> t.priority ->> 'response_mins')::int || ' minutes')::interval),
      resolution_due_at =
        t.created_at + (((c.sla_rules -> t.priority ->> 'resolution_mins')::int || ' minutes')::interval)
  from public.app_config c
  where c.id = 1
    and (t.response_due_at is null or t.resolution_due_at is null)
    and c.sla_rules -> t.priority is not null;
