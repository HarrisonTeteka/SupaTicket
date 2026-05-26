-- 0012_email_prefs.sql
-- Phase 9 (Email Notifications): per-user opt-out and admin-editable sender.
-- Run this in the Supabase SQL Editor after 0011. Idempotent.
--
-- (Note: PHASES-8-10.md spec references this as "0013_email_prefs.sql" —
-- corrected to 0012 here for sequential numbering.)

-- ---------------------------------------------------------------------------
-- Per-user email opt-out, defaults to opted-in.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email_notifications boolean not null default true;

-- ---------------------------------------------------------------------------
-- Admin-editable sender identity for outgoing notification emails.
-- The Edge Function reads this row to construct the From / Reply-To.
-- ---------------------------------------------------------------------------
alter table public.app_config
  add column if not exists email_sender jsonb not null default
  '{
    "from_name":  "SupaTicket",
    "from_email": "noreply@example.com",
    "reply_to":   null
  }'::jsonb;

-- Seed the singleton if email_sender is somehow empty.
update public.app_config
  set email_sender = '{
    "from_name":  "SupaTicket",
    "from_email": "noreply@example.com",
    "reply_to":   null
  }'::jsonb
  where id = 1 and (email_sender is null or email_sender = '{}'::jsonb);
