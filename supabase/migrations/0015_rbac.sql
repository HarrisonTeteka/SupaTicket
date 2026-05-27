-- 0015_rbac.sql
-- Phase 12 (RBAC): introduce a `roles` table with a granular permission
-- matrix, link profiles to it via `role_id`, and tighten customer-write RLS
-- to depend on the new `has_permission(uid, key)` helper. The legacy
-- `profiles.role` text column stays in sync via a trigger so all existing
-- `is_admin()` / `is_customer()` checks (and every RLS policy that uses them)
-- keep working unchanged.
--
-- Run in the Supabase SQL Editor after 0014. Idempotent.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.roles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  description  text,
  permissions  jsonb not null default '{}'::jsonb,
  -- system_name maps a role to the legacy `profiles.role` value:
  -- 'admin' / 'staff' / 'customer'. Custom roles use 'staff'.
  system_name  text not null default 'staff'
               check (system_name in ('admin', 'staff', 'customer')),
  is_system    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed the three system roles. Use upsert so re-runs don't duplicate them.
-- Admin gets every permission true; Staff gets the common agent perms;
-- Customer gets none.
-- ---------------------------------------------------------------------------
insert into public.roles (name, description, system_name, is_system, permissions) values
  ('Admin',
   'Full access to everything. Cannot be edited or deleted.',
   'admin',
   true,
   jsonb_build_object(
     'tickets.create', true, 'tickets.update', true, 'tickets.delete', true,
     'tickets.assign', true, 'tickets.bulk', true,
     'comments.post', true, 'comments.internal', true,
     'customers.read', true, 'customers.create', true, 'customers.edit', true,
     'customers.delete', true, 'customers.import', true,
     'users.create', true, 'users.edit', true, 'users.delete', true,
     'users.assign_role', true, 'roles.manage', true,
     'config.categories', true, 'config.departments', true,
     'config.custom_fields', true, 'config.sla', true, 'config.email', true,
     'logs.read', true, 'reports.export', true
   )),
  ('Staff',
   'Standard agent. Works tickets, comments, sees customers.',
   'staff',
   true,
   jsonb_build_object(
     'tickets.create', true, 'tickets.update', true,
     'tickets.assign', true,
     'comments.post', true, 'comments.internal', true,
     'customers.read', true,
     'reports.export', true
   )),
  ('Customer',
   'Portal customer. Sees only their own tickets.',
   'customer',
   true,
   '{}'::jsonb)
on conflict (name) do update
  set description = excluded.description,
      system_name = excluded.system_name,
      is_system   = excluded.is_system,
      permissions = excluded.permissions;

-- ---------------------------------------------------------------------------
-- profiles.role_id — link to the role, backfill from the existing text role
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role_id uuid references public.roles(id);

update public.profiles p
  set role_id = r.id
  from public.roles r
  where r.system_name = p.role
    and r.is_system = true
    and p.role_id is null;

create index if not exists profiles_role_id_idx on public.profiles(role_id);

-- ---------------------------------------------------------------------------
-- Keep `profiles.role` in sync with `roles.system_name` whenever role_id
-- changes. Existing RLS uses the text `role` column; this trigger guarantees
-- it always matches the linked role.
-- ---------------------------------------------------------------------------
create or replace function public.sync_profile_role_text()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sys_name text;
begin
  if new.role_id is null then
    return new;
  end if;
  select system_name into sys_name from public.roles where id = new.role_id;
  if sys_name is not null and (new.role is distinct from sys_name) then
    new.role := sys_name;
  end if;
  return new;
end $$;

drop trigger if exists profiles_sync_role_text on public.profiles;
create trigger profiles_sync_role_text
  before insert or update of role_id on public.profiles
  for each row execute function public.sync_profile_role_text();

-- ---------------------------------------------------------------------------
-- has_permission(uid, perm) — the single source of truth for granular gates.
-- Returns true if the user's role has the named permission flag set.
-- ---------------------------------------------------------------------------
create or replace function public.has_permission(uid uuid, perm text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select (r.permissions ->> perm)::boolean
      from public.profiles p
      join public.roles r on r.id = p.role_id
      where p.id = uid
    ),
    false
  );
$$;

revoke all on function public.has_permission(uuid, text) from public;
grant execute on function public.has_permission(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Tighten customers RLS to use has_permission(). Admins still pass because
-- the Admin system role grants every permission.
-- ---------------------------------------------------------------------------
drop policy if exists "customers_insert_staff" on public.customers;
drop policy if exists "customers_update_staff" on public.customers;
drop policy if exists "customers_insert_admin" on public.customers;
drop policy if exists "customers_update_admin" on public.customers;

create policy "customers_insert_perm" on public.customers
  for insert to authenticated
  with check (public.has_permission(auth.uid(), 'customers.create')
              or public.has_permission(auth.uid(), 'customers.import'));

create policy "customers_update_perm" on public.customers
  for update to authenticated
  using (public.has_permission(auth.uid(), 'customers.edit'))
  with check (public.has_permission(auth.uid(), 'customers.edit'));

-- delete stays admin-only (the existing customers_delete_admin policy is fine)

-- ---------------------------------------------------------------------------
-- roles RLS — read open to authenticated (staff sees role names in pickers);
-- write gated on `roles.manage` permission so an admin can delegate role
-- editing without giving up the legacy `admin` system role.
-- ---------------------------------------------------------------------------
alter table public.roles enable row level security;

drop policy if exists "roles_select_auth"   on public.roles;
drop policy if exists "roles_insert_perm"   on public.roles;
drop policy if exists "roles_update_perm"   on public.roles;
drop policy if exists "roles_delete_perm"   on public.roles;

create policy "roles_select_auth" on public.roles
  for select to authenticated using (true);

create policy "roles_insert_perm" on public.roles
  for insert to authenticated
  with check (public.has_permission(auth.uid(), 'roles.manage'));

create policy "roles_update_perm" on public.roles
  for update to authenticated
  using (public.has_permission(auth.uid(), 'roles.manage'))
  with check (public.has_permission(auth.uid(), 'roles.manage'));

-- System roles cannot be deleted (defence in depth on top of the UI guard).
create policy "roles_delete_perm" on public.roles
  for delete to authenticated
  using (
    public.has_permission(auth.uid(), 'roles.manage')
    and is_system = false
  );

-- ---------------------------------------------------------------------------
-- handle_new_user: also stamp role_id from the matching system role.
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
  desired_role_id uuid;
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

  select id into desired_role_id
    from public.roles
    where system_name = desired_role and is_system = true
    limit 1;

  insert into public.profiles (id, name, email, role, role_id, status)
  values (
    new.id,
    derived_name,
    coalesce(new.email, ''),
    desired_role,
    desired_role_id,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime: publish roles so the admin Roles tab updates live.
-- ---------------------------------------------------------------------------
do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin alter publication supabase_realtime add table public.roles;
      exception when duplicate_object then null; end;
  end if;
end $$;
