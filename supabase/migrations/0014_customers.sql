-- 0014_customers.sql
-- Phase 11 (Customer Records): introduce a `customers` table for CRM-imported
-- contacts who don't log in, plus a `tickets.customer_id` FK so staff can
-- attribute a ticket to one. Coexists with the Phase 8 customer portal —
-- portal-signup customers still live in `profiles` with role='customer' and
-- attach to tickets via `created_by`; CRM customers attach via `customer_id`.
-- Run in the Supabase SQL Editor after 0013. Idempotent.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id             uuid primary key default gen_random_uuid(),
  external_id    text not null,                 -- stable CRM id; dedupe key
  name           text not null,
  email          text,
  phone          text,
  company        text,
  address_line1  text,
  address_line2  text,
  city           text,
  state          text,
  postal_code    text,
  country        text,
  notes          text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Unique CRM id (case-insensitive). Treat empty as null elsewhere; the column
-- is NOT NULL so the import path must coerce blanks to a meaningful id.
create unique index if not exists customers_external_id_uniq
  on public.customers (lower(external_id));

create index if not exists customers_name_idx    on public.customers (lower(name));
create index if not exists customers_email_idx   on public.customers (lower(email));
create index if not exists customers_company_idx on public.customers (lower(company));

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tickets: link to a CRM customer record (optional, separate from created_by)
-- ---------------------------------------------------------------------------
alter table public.tickets
  add column if not exists customer_id uuid
  references public.customers(id) on delete set null;

create index if not exists tickets_customer_idx on public.tickets(customer_id);

-- ---------------------------------------------------------------------------
-- RLS — admins + staff can read and write; portal customers have no access.
-- DELETE stays admin-only so a misclicked staff member cannot wipe records.
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;

drop policy if exists "customers_select_staff" on public.customers;
drop policy if exists "customers_insert_staff" on public.customers;
drop policy if exists "customers_update_staff" on public.customers;
drop policy if exists "customers_delete_admin" on public.customers;

create policy "customers_select_staff" on public.customers
  for select to authenticated
  using (not public.is_customer(auth.uid()));

create policy "customers_insert_staff" on public.customers
  for insert to authenticated
  with check (not public.is_customer(auth.uid()));

create policy "customers_update_staff" on public.customers
  for update to authenticated
  using (not public.is_customer(auth.uid()))
  with check (not public.is_customer(auth.uid()));

create policy "customers_delete_admin" on public.customers
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime: publish customers so the admin list updates live across browsers.
-- ---------------------------------------------------------------------------
do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin alter publication supabase_realtime add table public.customers;
      exception when duplicate_object then null; end;
  end if;
end $$;
