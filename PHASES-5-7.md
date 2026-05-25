# SupaTicket — Phase Roadmap 5–7

> Continuation of `PHASES.md` (Phases 1–4 = the original product scope, now built).
> The **Conventions** section of `PHASES.md` still applies in full — feature
> folders under `src/features/<name>/`, `.jsx` vs `.js` split, services own all
> network calls, RLS written in the same migration as the table, realtime
> publication for subscribed tables, `logAction(...)` on audit-worthy mutations.
>
> This roadmap was written after a gap review of 10 target requirements against
> the Phase 1–4 build.

## Assumption on record

SupaTicket stays **internal-only** for Phases 5–7 — every user is `staff` or
`admin`. "Customer" is approximated by the ticket's creator (`created_by`).
A true customer portal (external requesters, customer-facing vs internal note
gating, public CSAT collection) is **out of scope** here and would be a later
**Phase 8 — Customer Portal**. Where a requirement assumes customers, this doc
states how it is approximated internally.

## Requirement coverage map

| # | Requirement | Phase 1–4 status | Addressed in |
|---|---|---|---|
| 1 | Agent Dashboard | ❌ placeholder route | **Phase 5** |
| 2 | Admin Console | ✅ done (Phase 4) | — |
| 3 | Categorization & Tagging | 🟡 category only | **Phase 6** (tags) |
| 4 | Status Tracking | 🟡 3 of 6 states | **Phase 6** |
| 5 | Internal private notes | ❌ missing | **Phase 6** |
| 6 | SLAs | ❌ missing | **Phase 7** |
| 7 | Triggers & Escalations | 🟡 event notifications only | **Phase 7** |
| 8 | Real-time Dashboards | ❌ missing | **Phase 5** |
| 9 | Performance Metrics / KPIs | ❌ missing | **Phase 5** |
| 10 | RBAC | ✅ done — 2-role (admin/staff) | — |

---

## Phase 5 — Dashboards & Metrics

**Status:** Next. **Depends on:** Phases 1–4.
**Covers:** #1 Agent Dashboard, #8 Real-time Dashboards, #9 Performance Metrics.

### Scope

- A real agent dashboard at `/dashboard`, replacing the placeholder.
- **KPI stat cards:** open tickets, my open tickets, unassigned tickets,
  resolved this week, average resolution time, average first-response time,
  CSAT average.
- **Backlog breakdowns:** tickets by status and by priority, rendered as
  lightweight CSS bars (no charting library).
- **My assigned tickets** quick list and a **recent activity** feed.
- Every widget live-updates via the `tickets` realtime channel.
- **CSAT capture:** the ticket creator can rate a Resolved ticket 1–5; the
  dashboard shows the running average.

### DB changes — `supabase/migrations/0007_ticket_metrics.sql`

- `tickets.resolved_at timestamptz` — set by trigger when `status` becomes a
  terminal state, cleared when it leaves one.
- `tickets.first_response_at timestamptz` — set by the comments-insert trigger
  on the first comment authored by someone other than `created_by`.
- `tickets.satisfaction_rating int check (satisfaction_rating between 1 and 5)`
  — nullable; the CSAT score.
- Trigger `tickets_set_resolved_at` (before update of `status`).
- Trigger/extension on `comments` insert to stamp `first_response_at` once.
- No new RLS needed — `tickets_update_auth` already covers the rating write;
  note this explicitly in the migration.

### File structure (new) — `src/features/dashboard/`

```
src/features/dashboard/
├── components/
│   ├── DashboardStats.jsx      # KPI stat-card grid
│   ├── StatusBreakdown.jsx     # tickets-by-status CSS bars
│   ├── PriorityBreakdown.jsx   # tickets-by-priority CSS bars
│   ├── MyTickets.jsx           # current user's assigned open tickets
│   └── RecentActivity.jsx      # recent tickets / comments feed
├── hooks/
│   └── useDashboardMetrics.js  # aggregates tickets + realtime
├── pages/
│   └── DashboardPage.jsx
├── selectors/
│   └── dashboardSelectors.js   # pure aggregation helpers (counts, averages)
└── services/
    └── dashboardService.js     # metric queries not covered by ticketsService
```

An empty `dashboard/` scaffold from the "Vertical Design Foundation" commit
already exists — follow `PHASES.md` practice: keep the names that match this
spec, overwrite/delete the rest. Implement the empty shared `StatCard.jsx`
stub for the KPI cards.

### Other client changes

- `router.jsx` — replace `DashboardPlaceholder` with `<DashboardPage />`.
- `tickets/components/` — a small `SatisfactionRating.jsx` (1–5 stars) shown in
  `TicketDetail` when the ticket is Resolved and the viewer is its creator.

### Acceptance

- `/dashboard` shows live KPI cards; creating or resolving a ticket updates
  them within ~1s.
- Status and priority breakdowns reflect current data.
- Resolving a ticket stamps `resolved_at`; average resolution time appears.
- The creator rates a resolved ticket; the CSAT average updates.
- `first_response_at` populates after the first non-creator comment.

### Out of scope

- Agent online/presence status (needs Supabase Presence — deferred).
- A charting library / graphs — lightweight CSS visuals only.
- Per-agent leaderboards and historical trend lines.

---

## Phase 6 — Ticket Workflow Depth

**Status:** Upcoming. **Depends on:** Phase 5.
**Covers:** #3 Categorization & Tagging, #4 Status Tracking, #5 Internal notes.

### Scope

- Expand ticket statuses to the full set: **Open, Pending, In Progress,
  Escalated, Resolved, Closed**.
- **Tags:** free-form multi-tags on tickets, filterable.
- **Internal notes:** comments can be flagged internal and render distinctly.

### DB changes — `supabase/migrations/0008_workflow_depth.sql`

- Drop and re-add the `tickets.status` CHECK constraint to allow the six
  statuses.
- `tickets.tags text[] not null default '{}'` + a GIN index on it.
- `comments.internal boolean not null default false`.
- Confirm the `0007` `resolved_at` trigger treats both `Resolved` and `Closed`
  as terminal states.

### Client changes

- `tickets.utils.js` — extend `TICKET_STATUSES` and the status colour map.
- `TicketForm`, `TicketDetail`, `TicketFilters` — tag editing + a tag filter;
  new `tickets/components/TagInput.jsx`.
- `TicketRow` — render tag chips.
- `CommentForm` — an "Internal note" toggle; `CommentList` — internal notes
  styled distinctly with an "Internal" badge.

### Acceptance

- A ticket can move through all six statuses; the dashboard backlog reflects
  the new states.
- Tags can be added to a ticket and the list filtered by a tag.
- An internal note posts and renders with an "Internal" badge, visually
  distinct from a normal comment.

### Out of scope

- RLS gating of internal notes from customers — no customer portal yet, so the
  `internal` flag is stored and shown but not access-gated; gating moves with
  the Phase 8 customer portal.
- Tag administration / renaming — tags stay free-form.

---

## Phase 7 — SLAs & Escalations

**Status:** Upcoming. **Depends on:** Phase 6 (uses the `Escalated` status).
**Covers:** #6 SLAs, #7 Triggers & Escalations.

### Scope

- **SLA rules per priority** — a response target and a resolution target (in
  minutes), editable by admins.
- Each ticket gets `response_due_at` and `resolution_due_at` computed on
  creation from its priority.
- **On-track / at-risk / breached** indicators in the ticket list and detail.
- A **scheduled breach checker** that escalates overdue tickets and alerts the
  assignee plus all admins.

### DB changes

`supabase/migrations/0009_sla.sql`

- `app_config.sla_rules jsonb` — `{ priority: { response_mins, resolution_mins } }`,
  seeded with sensible defaults.
- `tickets.response_due_at timestamptz`, `tickets.resolution_due_at timestamptz`.
- Trigger on ticket insert (and priority update) computing the due dates from
  `app_config.sla_rules`.

`supabase/migrations/0010_sla_escalation.sql`

- Function `escalate_overdue_tickets()` — finds tickets past
  `resolution_due_at` that are not in a terminal state and not already
  `Escalated`; sets `status = 'Escalated'` and calls `notify_user()` for the
  assignee and for every admin.
- Schedule it with **`pg_cron`** (`cron.schedule(...)`, every 5 minutes). If
  `pg_cron` is not enabled on the project, the fallback is a Supabase **Edge
  Function** on a cron schedule — the migration documents both, `pg_cron`
  preferred.

### Client changes

- `tickets.utils.js` — an `slaState(ticket)` helper (on-track / at-risk /
  breached) derived from the due dates and status.
- `TicketRow` and `TicketDetail` — an SLA badge / countdown.
- Admin — a new **SLA** tab (`SlaEditor.jsx`) editing `app_config.sla_rules`.
- Dashboard — an "SLA breached / at risk" KPI card.

### Acceptance

- Setting SLA rules then creating a ticket computes its due dates.
- A ticket past its resolution due date shows an "Overdue" indicator.
- The scheduled job escalates an overdue ticket to `Escalated` and notifies the
  assignee and admins.
- Admins can edit SLA rules per priority and the changes take effect on new
  tickets.

### Out of scope

- Business-hours / calendar-aware SLA clocks — a 24/7 clock only.
- Per-category SLA overrides.
- Pausing the SLA clock while a ticket is `Pending`.

---

## After Phase 7

These remain unscoped — do not start without an explicit scoping pass:

- **Phase 8 — Customer Portal:** external requesters as a distinct entity,
  customer-facing vs internal note gating, public CSAT collection.
- Agent presence / online status (Supabase Presence).
- Email notifications — Edge Function fan-out from the `notifications` table.
- CSV export / downloadable reports for tickets and logs.
- Granular RBAC beyond `admin`/`staff` (e.g. department-scoped roles).
