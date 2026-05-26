-- 0011_customer_portal.sql
-- Phase 8 (Customer Portal): introduce 'customer' role, denormalised
-- creator_role on tickets, role-aware RLS and a customer column guard.
-- Run this in the Supabase SQL Editor after 0010. Idempotent.

-- ---------------------------------------------------------------------------
-- Role enum: add 'customer' alongside admin / staff
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'staff', 'customer'));

-- ---------------------------------------------------------------------------
-- is_customer(uid) — mirrors is_admin; keeps RLS policies readable.
-- ---------------------------------------------------------------------------
create or replace function public.is_customer(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'customer'
  );
$$;

-- ---------------------------------------------------------------------------
-- Denormalised creator_role on tickets so the staff UI can render a
-- "Customer-raised" badge without joining to profiles. Set on insert by
-- the client; backfilled here for existing tickets.
-- ---------------------------------------------------------------------------
alter table public.tickets
  add column if not exists creator_role text;

update public.tickets t
  set creator_role = p.role
  from public.profiles p
  where t.created_by = p.id and t.creator_role is null;

-- ---------------------------------------------------------------------------
-- handle_new_user: respect the `is_customer` flag in raw_user_meta_data so
-- the customer sign-up flow lands new accounts as 'customer'. First user
-- ever still becomes 'admin' (unchanged).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_user boolean;
  derived_name  text;
  desired_role  text;
begin
  select count(*) = 0 into is_first_user from public.profiles;

  derived_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'User'
  );

  if is_first_user then
    desired_role := 'admin';
  elsif coalesce((new.raw_user_meta_data->>'is_customer')::boolean, false) then
    desired_role := 'customer';
  else
    desired_role := 'staff';
  end if;

  insert into public.profiles (id, name, email, role, status)
  values (
    new.id,
    derived_name,
    coalesce(new.email, ''),
    desired_role,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- RLS — replace the permissive Phase 1 policies with role-aware ones.
-- Staff and admins keep the existing "see everything" behaviour; customers
-- are scoped to their own data.
-- ---------------------------------------------------------------------------

-- profiles: a customer sees only their own row. Staff/admin keep full read.
drop policy if exists "profiles_select_all_auth" on public.profiles;
create policy "profiles_select_all_auth" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or not public.is_customer(auth.uid())
  );

-- tickets: a customer sees only tickets they created. Staff/admin see all.
drop policy if exists "tickets_select_all_auth" on public.tickets;
create policy "tickets_select_all_auth" on public.tickets
  for select to authenticated
  using (
    not public.is_customer(auth.uid())
    or created_by = auth.uid()
  );

-- tickets insert: customers may create their own tickets, must not assign,
-- must start in Open/Pending, and may not create sub-tickets.
drop policy if exists "tickets_insert_auth" on public.tickets;
create policy "tickets_insert_auth" on public.tickets
  for insert to authenticated
  with check (
    (created_by is null or created_by = auth.uid())
    and (
      not public.is_customer(auth.uid())
      or (
        assigned_to is null
        and parent_id is null
        and status in ('Open', 'Pending')
      )
    )
  );

-- tickets update: customers may only touch their own tickets; the column
-- guard trigger below restricts WHICH columns they can change.
drop policy if exists "tickets_update_auth" on public.tickets;
create policy "tickets_update_auth" on public.tickets
  for update to authenticated
  using (
    not public.is_customer(auth.uid())
    or created_by = auth.uid()
  )
  with check (
    not public.is_customer(auth.uid())
    or created_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Column guard: customers may only change satisfaction_rating.
-- Postgres RLS does not support per-column UPDATE policies, so we enforce
-- in a BEFORE UPDATE trigger (same pattern as the 0002 self-update guard).
-- ---------------------------------------------------------------------------
create or replace function public.guard_customer_ticket_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_customer(auth.uid()) then
    return new;
  end if;

  if new.title          is distinct from old.title          then raise exception 'Customer cannot change ticket title'; end if;
  if new.description    is distinct from old.description    then raise exception 'Customer cannot change ticket description'; end if;
  if new.category       is distinct from old.category       then raise exception 'Customer cannot change ticket category'; end if;
  if new.priority       is distinct from old.priority       then raise exception 'Customer cannot change ticket priority'; end if;
  if new.status         is distinct from old.status         then raise exception 'Customer cannot change ticket status'; end if;
  if new.assigned_to    is distinct from old.assigned_to    then raise exception 'Customer cannot change ticket assignee'; end if;
  if new.parent_id      is distinct from old.parent_id      then raise exception 'Customer cannot change parent ticket'; end if;
  if new.tags           is distinct from old.tags           then raise exception 'Customer cannot change ticket tags'; end if;
  if new.attachments    is distinct from old.attachments    then raise exception 'Customer cannot change ticket attachments'; end if;
  if new.custom_data    is distinct from old.custom_data    then raise exception 'Customer cannot change ticket custom data'; end if;

  return new;
end $$;

drop trigger if exists tickets_guard_customer_update on public.tickets;
create trigger tickets_guard_customer_update
  before update on public.tickets
  for each row execute function public.guard_customer_ticket_update();

-- comments: customers see only non-internal comments on tickets they own.
drop policy if exists "comments_select_all_auth" on public.comments;
create policy "comments_select_all_auth" on public.comments
  for select to authenticated
  using (
    not public.is_customer(auth.uid())
    or (
      internal = false
      and ticket_id in (select id from public.tickets where created_by = auth.uid())
    )
  );

-- comments insert: customers may comment only on their own tickets, never internal.
drop policy if exists "comments_insert_auth" on public.comments;
create policy "comments_insert_auth" on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      not public.is_customer(auth.uid())
      or (
        internal = false
        and ticket_id in (select id from public.tickets where created_by = auth.uid())
      )
    )
  );

-- app_config: customers have no access (no need to see categories,
-- departments, SLA rules, custom fields).
drop policy if exists "app_config_select_all_auth" on public.app_config;
create policy "app_config_select_all_auth" on public.app_config
  for select to authenticated
  using (not public.is_customer(auth.uid()));

-- notifications: notifications_select_self / _insert_self already key on
-- user_id = auth.uid(), which is correct for customers. No change needed.

-- system_logs: already admin-only (0006). No change needed.

-- ---------------------------------------------------------------------------
-- Update comments_notify_new so an internal note does NOT notify the
-- ticket creator (a customer creator can't see internal notes — sending
-- them a "new comment" notification they can't open would be confusing).
-- The assignee (staff) is still notified, since internal notes are
-- relevant to them.
-- ---------------------------------------------------------------------------
create or replace function public.comments_notify_new()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t public.tickets%rowtype;
begin
  select * into t from public.tickets where id = new.ticket_id;

  if not new.internal
     and t.created_by is not null
     and t.created_by <> new.author_id then
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
