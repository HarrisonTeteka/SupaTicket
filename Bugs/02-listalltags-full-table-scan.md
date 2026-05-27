# Bug 02 — `listAllTags` did a full-table scan

## Summary
`listAllTags()` pulled the `tags` column from **every ticket row** and
aggregated the distinct set in JavaScript. The Tickets page and the
Reports export panel both call it on mount, so the scan ran every time
either page opened. Linear in ticket count, with no index help, even
though `0008_workflow_depth.sql` already created a GIN index on `tags`.

## Where
- [src/features/tickets/services/ticketsService.js](../src/features/tickets/services/ticketsService.js)
- Callers: [src/features/tickets/pages/TicketsPage.jsx](../src/features/tickets/pages/TicketsPage.jsx), [src/features/reports/components/TicketExportPanel.jsx](../src/features/reports/components/TicketExportPanel.jsx)
- New migration: [supabase/migrations/0016_get_all_tags.sql](../supabase/migrations/0016_get_all_tags.sql)

## Before
```js
export async function listAllTags() {
  const { data, error } = await supabase.from('tickets').select('tags');
  if (error) throw error;
  const set = new Set();
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) set.add(tag);
  }
  return Array.from(set).sort();
}
```
Reads N rows over the wire; bandwidth and parse cost scale with ticket
count. Still O(N) on the server even with the GIN index, because the
column-projection query doesn't use it.

## After
```js
export async function listAllTags() {
  const { data, error } = await supabase.rpc('get_all_tags');
  if (error) throw error;
  return data ?? [];
}
```

Backed by a new SECURITY DEFINER function:
```sql
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
```

Server returns the final sorted `text[]` in a single round trip. The
`stable` marker lets Postgres cache the result inside a query.

## Migration
**Must be run** in the Supabase SQL Editor (in sequence after 0014).
Without it the front-end `rpc('get_all_tags')` call will 404 and the
tag-filter dropdown will be empty.

## Security note
Tags are non-sensitive labels and the function is granted to
`authenticated` (matches the pattern of `get_weekly_stats` in 0013). If
tags ever start carrying internal-only info, restrict via an `is_staff()`
guard inside the function body.

## Verification
- `npm run build` — passes clean.
- Manual: run the migration, open Tickets page → tag filter dropdown still populates.
