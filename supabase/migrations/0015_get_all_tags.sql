-- 0015_get_all_tags.sql
-- Bug 02: replace the client-side `listAllTags` full-table scan with a
-- server-side DISTINCT. The GIN index on tickets.tags created in 0008
-- already supports the unnest aggregation.
-- Run this in the Supabase SQL Editor after 0014. Idempotent.

-- ---------------------------------------------------------------------------
-- Returns every distinct tag in use across all tickets, sorted alphabetically.
-- SECURITY DEFINER bypasses RLS — tags are non-sensitive labels and the
-- staff/admin tickets list + reports filter both need the full set.
-- ---------------------------------------------------------------------------
create or replace function public.get_all_tags()
returns text[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(tag order by tag), '{}'::text[])
  from (
    select distinct unnest(tags) as tag
    from public.tickets
    where tags is not null and array_length(tags, 1) > 0
  ) t;
$$;

revoke all on function public.get_all_tags() from public;
grant execute on function public.get_all_tags() to authenticated;
