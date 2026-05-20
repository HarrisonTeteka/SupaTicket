-- 0003_tickets_storage.sql
-- Phase 2 (Tickets): attachment storage + full-text search.
-- Run this in the Supabase SQL Editor after 0002.
-- Idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- Full-text search
-- A generated tsvector column over title + description, indexed with GIN.
-- The client queries it via .textSearch('fts', query) (see useTicketSearch).
-- ---------------------------------------------------------------------------
alter table public.tickets
  add column if not exists fts tsvector
  generated always as (to_tsvector('english', title || ' ' || description)) stored;

create index if not exists tickets_search_idx
  on public.tickets using gin (fts);

-- ---------------------------------------------------------------------------
-- Storage bucket for ticket attachments (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

-- Storage RLS lives on storage.objects. Scope every policy to our bucket.
drop policy if exists "ticket_attachments_select" on storage.objects;
drop policy if exists "ticket_attachments_insert" on storage.objects;
drop policy if exists "ticket_attachments_delete_admin" on storage.objects;

-- Any authenticated user can read attachments (signed URLs are generated
-- client-side; the bucket itself stays private).
create policy "ticket_attachments_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'ticket-attachments');

-- Any authenticated user can upload into the bucket.
create policy "ticket_attachments_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ticket-attachments');

-- Only admins can delete stored objects.
create policy "ticket_attachments_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ticket-attachments' and public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Verify (no-op): comments_insert_auth from 0001 already enforces
-- author_id = auth.uid(); nothing to change here.
-- ---------------------------------------------------------------------------
