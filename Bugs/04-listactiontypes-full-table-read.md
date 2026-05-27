# Bug 04 — `listActionTypes` read the entire `system_logs` table

## Summary
Same bug shape as Bug 02 (`listAllTags`), but worse: `system_logs` is
append-only and grows with every audit-worthy mutation. The admin Logs
tab and the Reports log-export panel both call `listActionTypes()` on
mount, each downloading the `action_type` column from every log row
just to build a small filter dropdown.

## Where
- [src/features/admin/services/systemLogsService.js](../src/features/admin/services/systemLogsService.js)
- Callers: [src/features/admin/components/SystemLogsView.jsx](../src/features/admin/components/SystemLogsView.jsx), [src/features/reports/components/LogExportPanel.jsx](../src/features/reports/components/LogExportPanel.jsx)
- New migration: [supabase/migrations/0018_get_log_action_types.sql](../supabase/migrations/0018_get_log_action_types.sql)

## Before
```js
export async function listActionTypes() {
  const { data, error } = await supabase
    .from('system_logs')
    .select('action_type')
    .order('action_type');
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.action_type))];
}
```

## After
```js
export async function listActionTypes() {
  const { data, error } = await supabase.rpc('get_log_action_types');
  if (error) throw error;
  return data ?? [];
}
```

Backed by a new SECURITY DEFINER function:
```sql
create or replace function public.get_log_action_types()
returns text[]
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result text[];
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin only';
  end if;

  select coalesce(array_agg(action_type order by action_type), '{}'::text[])
    into result
    from (select distinct action_type from public.system_logs) t;

  return result;
end $$;

revoke all on function public.get_log_action_types() from public;
grant execute on function public.get_log_action_types() to authenticated;
```

The btree index `system_logs_action_idx` (from `0001_init.sql`) supports
the DISTINCT scan, so this is index-only on Postgres.

## Why the explicit `is_admin()` check
`system_logs` is admin-only via the `system_logs_select_admin` RLS
policy. SECURITY DEFINER bypasses RLS, so the function would otherwise
leak action types to staff and customers. The explicit `is_admin(auth.uid())`
guard restores the admin-only constraint.

## Migration
**Must be run** in the Supabase SQL Editor after 0017. Without it the
log filter dropdown will be empty on both pages.

## Verification
- `npm run build` — passes clean.
- Manual: open admin Logs tab and Reports log-export panel as admin —
  filter dropdown populates. As staff/customer (if you can reach those
  pages), the RPC errors with "admin only".
