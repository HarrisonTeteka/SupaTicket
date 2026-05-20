-- SupaTicket initial schema
-- Run this in the Supabase SQL Editor (or via the Supabase CLI).
-- Idempotent where reasonable; safe to re-run on an empty project.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Sequences
-- ---------------------------------------------------------------------------
-- Human-friendly 6-digit ticket numbers, monotonically increasing.
create sequence if not exists public.ticket_number_seq start 100000;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- 1. profiles: 1:1 with auth.users. Stores the editable profile + role/status.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'staff' check (role in ('admin','staff')),
  status      text not null default 'active' check (status in ('active','archived')),
  department  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx   on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);

-- 2. tickets
create table if not exists public.tickets (
  id             uuid primary key default gen_random_uuid(),
  ticket_number  bigint not null unique default nextval('public.ticket_number_seq'),
  title          text not null,
  description    text not null,
  category       text not null,
  priority       text not null default 'Medium' check (priority in ('Low','Medium','High','Urgent')),
  status         text not null default 'Open'   check (status   in ('Open','In Progress','Resolved')),
  parent_id      uuid references public.tickets(id) on delete set null,
  assigned_to    uuid references public.profiles(id) on delete set null,
  assignee_name  text,           -- denormalised for historical display
  attachments    jsonb not null default '[]'::jsonb,
  custom_data    jsonb not null default '{}'::jsonb,
  created_by     uuid references public.profiles(id) on delete set null,
  creator_name   text,           -- denormalised for historical display
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists tickets_status_idx     on public.tickets(status);
create index if not exists tickets_priority_idx   on public.tickets(priority);
create index if not exists tickets_parent_idx     on public.tickets(parent_id);
create index if not exists tickets_assignee_idx   on public.tickets(assigned_to);
create index if not exists tickets_created_by_idx on public.tickets(created_by);
create index if not exists tickets_created_at_idx on public.tickets(created_at desc);

-- 3. comments
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  text        text not null,
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists comments_ticket_idx on public.comments(ticket_id, created_at);

-- 4. notifications (per user)
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- 5. app_config (singleton row, id always = 1)
create table if not exists public.app_config (
  id            integer primary key default 1 check (id = 1),
  categories    text[] not null default '{Technical,HR,Facilities,Finance,General}',
  departments   text[] not null default '{IT,HR,Operations,Finance,General}',
  custom_fields jsonb  not null default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);

-- Seed the singleton row if missing.
insert into public.app_config (id) values (1)
  on conflict (id) do nothing;

-- 6. system_logs (audit trail)
create table if not exists public.system_logs (
  id          uuid primary key default gen_random_uuid(),
  action_type text not null,
  details     text,
  user_id     uuid references public.profiles(id) on delete set null,
  user_name   text,
  created_at  timestamptz not null default now()
);

create index if not exists system_logs_action_idx     on public.system_logs(action_type);
create index if not exists system_logs_created_at_idx on public.system_logs(created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at  on public.profiles;
drop trigger if exists tickets_set_updated_at   on public.tickets;
drop trigger if exists comments_set_updated_at  on public.comments;
drop trigger if exists app_config_set_updated_at on public.app_config;

create trigger profiles_set_updated_at   before update on public.profiles   for each row execute function public.set_updated_at();
create trigger tickets_set_updated_at    before update on public.tickets    for each row execute function public.set_updated_at();
create trigger comments_set_updated_at   before update on public.comments   for each row execute function public.set_updated_at();
create trigger app_config_set_updated_at before update on public.app_config for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New-user trigger: auto-create profile, first user becomes admin
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
begin
  select count(*) = 0 into is_first_user from public.profiles;

  derived_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'User'
  );

  insert into public.profiles (id, name, email, role, status)
  values (
    new.id,
    derived_name,
    coalesce(new.email, ''),
    case when is_first_user then 'admin' else 'staff' end,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper: is_admin(uid) -- avoids RLS recursion when checking role
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.tickets       enable row level security;
alter table public.comments      enable row level security;
alter table public.notifications enable row level security;
alter table public.app_config    enable row level security;
alter table public.system_logs   enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_all_auth"  on public.profiles;
drop policy if exists "profiles_update_self"      on public.profiles;
drop policy if exists "profiles_update_admin"     on public.profiles;
drop policy if exists "profiles_delete_admin"     on public.profiles;
drop policy if exists "profiles_insert_self"      on public.profiles;

-- Any authenticated user can read the directory.
create policy "profiles_select_all_auth" on public.profiles
  for select to authenticated using (true);

-- A user can insert their own row (used as fallback if the trigger ever
-- doesn't fire — e.g. for accounts created before the trigger existed).
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- A user can update their own row. Column-level restrictions (you can't
-- change your own role/status) are enforced in the client layer because
-- Postgres RLS doesn't support per-column UPDATE policies cleanly.
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Admins can update anyone.
create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Only admins can delete users.
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (public.is_admin(auth.uid()));

-- tickets -------------------------------------------------------------------
drop policy if exists "tickets_select_all_auth" on public.tickets;
drop policy if exists "tickets_insert_auth"     on public.tickets;
drop policy if exists "tickets_update_auth"     on public.tickets;
drop policy if exists "tickets_delete_admin"    on public.tickets;

create policy "tickets_select_all_auth" on public.tickets
  for select to authenticated using (true);

create policy "tickets_insert_auth" on public.tickets
  for insert to authenticated with check (true);

create policy "tickets_update_auth" on public.tickets
  for update to authenticated using (true) with check (true);

create policy "tickets_delete_admin" on public.tickets
  for delete to authenticated using (public.is_admin(auth.uid()));

-- comments ------------------------------------------------------------------
drop policy if exists "comments_select_all_auth" on public.comments;
drop policy if exists "comments_insert_auth"     on public.comments;
drop policy if exists "comments_update_author"   on public.comments;
drop policy if exists "comments_update_admin"    on public.comments;
drop policy if exists "comments_delete_admin"    on public.comments;

create policy "comments_select_all_auth" on public.comments
  for select to authenticated using (true);

create policy "comments_insert_auth" on public.comments
  for insert to authenticated with check (author_id = auth.uid());

create policy "comments_update_author" on public.comments
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "comments_update_admin" on public.comments
  for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "comments_delete_admin" on public.comments
  for delete to authenticated using (public.is_admin(auth.uid()));

-- notifications -------------------------------------------------------------
drop policy if exists "notifications_select_self"  on public.notifications;
drop policy if exists "notifications_insert_auth"  on public.notifications;
drop policy if exists "notifications_update_self"  on public.notifications;
drop policy if exists "notifications_delete_self"  on public.notifications;

create policy "notifications_select_self" on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Any authenticated user can create a notification for any other user
-- (matches Gemini's notifyUser() helper — used by assignment, comments, etc.).
create policy "notifications_insert_auth" on public.notifications
  for insert to authenticated with check (true);

create policy "notifications_update_self" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications_delete_self" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- app_config ----------------------------------------------------------------
drop policy if exists "app_config_select_all_auth" on public.app_config;
drop policy if exists "app_config_update_admin"    on public.app_config;
drop policy if exists "app_config_insert_admin"    on public.app_config;

create policy "app_config_select_all_auth" on public.app_config
  for select to authenticated using (true);

create policy "app_config_insert_admin" on public.app_config
  for insert to authenticated with check (public.is_admin(auth.uid()));

create policy "app_config_update_admin" on public.app_config
  for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- system_logs ---------------------------------------------------------------
drop policy if exists "system_logs_select_admin" on public.system_logs;
drop policy if exists "system_logs_insert_auth"  on public.system_logs;

create policy "system_logs_select_admin" on public.system_logs
  for select to authenticated using (public.is_admin(auth.uid()));

create policy "system_logs_insert_auth" on public.system_logs
  for insert to authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Realtime: publish the tables we want to subscribe to from the client
-- ---------------------------------------------------------------------------
do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    -- Add tables; ignore if already added.
    begin alter publication supabase_realtime add table public.profiles;      exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.tickets;       exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.comments;      exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.app_config;    exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.system_logs;   exception when duplicate_object then null; end;
  end if;
end $$;
