# Bug 03 — `listTicketsForMetrics` was unbounded

## Summary
The dashboard pulled the full `tickets` table (every row, every realtime
change) and aggregated KPIs in JavaScript. Two problems:

1. **Cost** — every dashboard mount and every ticket mutation re-downloaded
   every row, in a tab that's typically left open all day.
2. **Correctness** — Supabase's PostgREST defaults to a 1000-row cap.
   Past 1000 tickets the dashboard would silently undercount. No error,
   no log, just wrong numbers.

## Where
- [src/features/dashboard/services/dashboardService.js](../src/features/dashboard/services/dashboardService.js) — rewritten
- [src/features/dashboard/hooks/useDashboardMetrics.js](../src/features/dashboard/hooks/useDashboardMetrics.js) — rewritten
- [src/features/dashboard/pages/DashboardPage.jsx](../src/features/dashboard/pages/DashboardPage.jsx) — props rewired
- [src/features/dashboard/components/AgentWorkload.jsx](../src/features/dashboard/components/AgentWorkload.jsx) — consumes aggregated `byAgent` now
- [src/features/dashboard/selectors/dashboardSelectors.js](../src/features/dashboard/selectors/dashboardSelectors.js) — slimmed to one helper
- New migration: [supabase/migrations/0017_get_dashboard_metrics.sql](../supabase/migrations/0017_get_dashboard_metrics.sql)

## Before
```js
export async function listTicketsForMetrics() {
  const { data, error } = await supabase
    .from('tickets')
    .select(METRIC_COLUMNS)
    .order('created_at', { ascending: false });   // no .limit()
  if (error) throw error;
  return data ?? [];
}
```
The hook then handed the full array to every widget; selectors walked
the array in JS to compute totals, breakdowns, averages, recent, mine.

## After

**Server (new RPC):**
```sql
create or replace function public.get_dashboard_metrics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$ ... $$;
```
Returns one JSONB:
```
{
  total, open, myOpen, unassigned, resolvedThisWeek,
  avgResolutionHours, avgFirstResponseHours,
  csatAverage, csatCount,
  byStatus: { ... },
  byPriority: { ... },
  bySla: { 'on-track', 'at-risk', 'breached' },
  byAgent: [ { id, count }, ... ]
}
```

**Client (three bounded calls):**
- `getDashboardMetrics(userId)` — single aggregated RPC, small payload
- `listRecentTickets(6)` — `.order('created_at', desc).limit(6)`
- `listMyOpenTickets(userId, 50)` — `.eq('assigned_to', userId).not('status', 'in', '("Resolved","Closed")').limit(50)`

`useDashboardMetrics` fires all three in parallel and reloads them on
any change to the `tickets` table (same realtime channel as before).

## Knock-on changes
- `AgentWorkload` no longer iterates a tickets array — it consumes
  `byAgent`, `unassigned`, `totalOpen` from the aggregated metrics.
- `dashboardSelectors.js` no longer needs `computeMetrics`,
  `countByStatus`, `countByPriority`, `countBySlaState`, `recentTickets`,
  `myOpenTickets` — they're dead code now that aggregation is server-side.
  File trimmed to just `formatDuration` (used by `DashboardStats`).

## SLA-state SQL — match with client `slaState()`
The RPC mirrors the rules in `tickets.utils.js#slaState`:
- `breached` — `now() >= resolution_due_at`
- `at-risk`  — `(now - created) / (due - created) >= 0.8`
- `on-track` — otherwise
- Tickets without `resolution_due_at` are excluded (no SLA window).

## Migration
**Must be run** in the Supabase SQL Editor after 0016. Without it the
dashboard will fail to load (the `rpc('get_dashboard_metrics')` call
will 404).

## Verification
- `npm run build` — passes clean.
- Manual checklist after running migration:
  - Open dashboard → all KPI tiles populated
  - Status / Priority / SLA breakdowns show counts
  - AgentWorkload shows per-agent counts + Unassigned bucket
  - MyTickets shows the signed-in user's open tickets only
  - RecentActivity shows newest 6
  - Open a ticket in another tab and change its status → dashboard
    refreshes within ~1 second (realtime)
