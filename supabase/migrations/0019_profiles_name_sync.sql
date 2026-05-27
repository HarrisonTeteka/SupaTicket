-- 0019_profiles_name_sync.sql
-- Bug 05: creator_name / assignee_name drift. The tickets table stores
-- denormalised name copies for fast list rendering. When a user updated
-- their profile.name the copies stayed stale until the ticket itself was
-- touched. This migration adds an AFTER UPDATE trigger on profiles that
-- propagates name changes to every live ticket row.
--
-- Scope: tickets only. comments.author_name and system_logs.user_name
-- are intentionally left untouched — those represent point-in-time
-- historical values (who wrote this note / who took this action) and
-- should NOT change retroactively.
-- Run in the Supabase SQL Editor after 0018. Idempotent.

create or replace function public.profiles_sync_ticket_names()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is not distinct from old.name then
    return new;  -- nothing to do
  end if;

  update public.tickets
     set creator_name = new.name
   where created_by = new.id
     and creator_name is distinct from new.name;

  update public.tickets
     set assignee_name = new.name
   where assigned_to = new.id
     and assignee_name is distinct from new.name;

  return new;
end $$;

drop trigger if exists profiles_sync_ticket_names_aiu on public.profiles;
create trigger profiles_sync_ticket_names_aiu
  after update of name on public.profiles
  for each row
  execute function public.profiles_sync_ticket_names();

-- One-off back-fill: bring already-drifted rows into line with the
-- current profile name. Cheap on small datasets; on large ones run this
-- once and remove the block in a follow-up migration.
update public.tickets t
   set creator_name = p.name
  from public.profiles p
 where t.created_by = p.id
   and t.creator_name is distinct from p.name;

update public.tickets t
   set assignee_name = p.name
  from public.profiles p
 where t.assigned_to = p.id
   and t.assignee_name is distinct from p.name;
