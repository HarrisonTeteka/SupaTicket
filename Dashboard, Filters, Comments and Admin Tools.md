# Dashboard, Filters, Comments and Admin Tools

Eight features shipped in three waves on the `LovenessUpdates` branch,
on top of the accessibility / dark mode / responsive work from the previous
session.

Wave 1 — interactivity polish across the staff app:
1. Sticky search / filter bars (general rule across the app).
2. Clickable notifications that resolve to the originating ticket.
3. Clickable dashboard widgets with filter pass-through to the tickets queue.

Wave 2 — customer detail page:

4. Per-customer ticket filters (status, type, created-by, date range).
5. Editable comments with a "view original" toggle.

Wave 3 — admin tools and lifecycle:

6. Admin password reset (direct, edge-function-backed).
7. SLA policies editor.
8. Overdue ticket status with admin-set day threshold.

All eight ship in one commit on `LovenessUpdates`. Harrison merges to `dev`.

There are two **deployment side-effects** before the new features run:

- `supabase/migrations/0021_comment_edits.sql` must be run in the SQL Editor
  (for editable comments).
- `supabase/migrations/0022_overdue.sql` must be run in the SQL Editor (for
  the Overdue status and threshold).
- `supabase functions deploy admin-reset-password` must be run (the new
  edge function for password resets).
- The new `users.reset_password` permission key must be granted to the admin
  role (or whichever roles should reset passwords) via Admin → Roles.

---

## 1. Sticky search / filter bars

### What

The filter row on the tickets queue, the search bar on the customers list, and
the filter row on Admin → Logs now pin to the top of the scroll area when you
scroll down. The general rule is: **anything that filters or searches a list
freezes to the top, with a subtle shadow to mark the boundary**.

### How it's implemented

A small pattern on the filter wrapper:

```jsx
<div className="sticky top-0 z-20 bg-surface py-3 -my-3 shadow-sm">
  ...filters...
</div>
```

The `-my-3` offsets the `py-3` so the rendered position is unchanged; the
shadow is always-on but subtle (`shadow-sm`) — no scroll-position JS needed.

### Files

- [TicketsPage.jsx](src/features/tickets/pages/TicketsPage.jsx) — wraps `<TicketFilters>`
- [CustomersList.jsx](src/features/customers/components/CustomersList.jsx) — wraps the search row + buttons
- [SystemLogsView.jsx](src/features/admin/components/SystemLogsView.jsx) — wraps the filter row

CustomerDetailPage also got the pattern for its new per-customer ticket
filters (see #4 below).

---

## 2. Clickable notifications

### What

Each notification in the bell popover is now a button. Clicking it:

1. Marks the notification as read.
2. Closes the popover.
3. Navigates to the specific ticket the notification was about.

### How it's implemented

No schema change. All notification messages produced by migration 0005's DB
triggers contain `#<ticket_number>` (e.g. `"You have been assigned ticket
#100123: Server outage"`). We extract that on click and resolve to a ticket
id via the same `searchTickets()` the topbar uses — on a miss we fall back to
the `/tickets` list.

```js
const match = message.match(/#(\d+)/);
if (!match) return '/tickets';
const results = await searchTickets(match[1]);
return results.length > 0 ? `/tickets/${results[0].id}` : '/tickets';
```

### Files

- [NotificationBell.jsx](src/features/notifications/components/NotificationBell.jsx) — owns the resolver and the `handleOpen` callback
- [NotificationPopover.jsx](src/features/notifications/components/NotificationPopover.jsx) — passes `onOpen` through
- [NotificationItem.jsx](src/features/notifications/components/NotificationItem.jsx) — message area is now a `<button>`

---

## 3. Clickable dashboard widgets with filter pass-through

### What

Every dashboard widget that displays sliceable counts is now a link into the
filtered tickets queue.

| Widget | Where each row links |
|---|---|
| **DashboardStats** (the 8 KPI cards) | `My open` → `/tickets?assigned_to=<your-id>`; `Resolved this week` / `Avg resolution` / `CSAT` → `/tickets?status=Resolved`; the rest → `/tickets` (no precise filter) |
| **StatusBreakdown** | `/tickets?status=<row>` |
| **PriorityBreakdown** | `/tickets?priority=<row>` |
| **AgentWorkload** | `/tickets?assigned_to=<agent.id>` (the "Unassigned" row stays a plain div — see note below) |
| **MyTickets** / **RecentActivity** | unchanged; were already clickable straight to the ticket detail page |

### TicketsPage is now URL-driven

`TicketsPage` used to keep filter state purely in React. Now it uses
`useSearchParams` to seed from the URL on mount and write back on every
filter change:

```js
const URL_FILTER_KEYS = ['status', 'priority', 'category', 'assigned_to', 'tag'];
```

That means dashboard links work, the URL is shareable, and the browser back
button restores the previous filter set.

### Known limitations (deliberate, not bugs)

- **"Open" and "Unassigned" cards** link to `/tickets` with no filter because
  `listTickets()` has no `openOnly` or `unassigned` filter today. Adding those
  would let the cards become precise — straightforward follow-up.
- **AgentWorkload's Unassigned row** stays a plain div for the same reason.
- **SlaBreakdown** rows are not links — no SLA filter exists on
  `listTickets()` yet.

### Files

- [TicketsPage.jsx](src/features/tickets/pages/TicketsPage.jsx) — `useSearchParams`, `URL_FILTER_KEYS`, `updateFilters`
- [DashboardStats.jsx](src/features/dashboard/components/DashboardStats.jsx) — every card wrapped in `<StatLink>`
- [StatusBreakdown.jsx](src/features/dashboard/components/StatusBreakdown.jsx) — rows as `<Link>`
- [PriorityBreakdown.jsx](src/features/dashboard/components/PriorityBreakdown.jsx) — rows as `<Link>`
- [AgentWorkload.jsx](src/features/dashboard/components/AgentWorkload.jsx) — `WorkloadRow` now optionally renders as `<Link>` via a `to` prop

---

## 4. Per-customer ticket filters

### What

The tickets list on a customer's detail page now has a sticky filter row with
five controls:

- **Status** — Open / Pending / In Progress / Overdue / Escalated / Resolved / Closed
- **Type** — interpreted as `category` (Technical / HR / Facilities / Finance / General)
- **Created by** — staff roster (see limitation below)
- **Since** — date picker, inclusive of the chosen day at 00:00:00
- **Before** — date picker, inclusive of the chosen day at 23:59:59

Plus a "Clear filters" button when any are active.

### Service-layer additions

`listTickets()` gained three filter keys to support the new UI:

```js
if (filters.created_by) query = query.eq('created_by', filters.created_by);
if (filters.since)      query = query.gte('created_at', `${filters.since}T00:00:00`);
if (filters.before)     query = query.lte('created_at', `${filters.before}T23:59:59`);
```

### Known limitation

The "Created by" dropdown is sourced from `listAssignees()`, which is
staff-only. **Customer-raised tickets won't appear in the dropdown.** A future
`creator_role` filter (with values 'customer', 'staff', 'admin') would cover
that — out of scope for this session.

### Files

- [ticketsService.js](src/features/tickets/services/ticketsService.js) — new filter handling in `listTickets`
- [CustomerDetailPage.jsx](src/features/customers/pages/CustomerDetailPage.jsx) — filter UI, sticky wrapper, `useAppConfig` for category options, `listAssignees` for creator options

---

## 5. Editable comments with "view original"

### What

Comment authors can now edit their own comments. Once edited, the comment
shows an "· edited \<when\>" tag with a "view original" toggle that flips
between the current text and the pre-edit text (rendered muted + italic to
make the distinction obvious).

### Migration

[0021_comment_edits.sql](supabase/migrations/0021_comment_edits.sql) — adds:

```sql
alter table public.comments
  add column if not exists original_text text,
  add column if not exists edited_at     timestamptz;
```

Both nullable; existing comments stay `NULL` on both → "not edited". Idempotent.

### Service

`updateComment(id, newText)` does a read-then-update: captures `original_text`
**only on the first edit** (subsequent edits leave it alone), and stamps
`edited_at` every time. After the initial implementation the function was
hardened: it uses `maybeSingle()` on the read, and the UPDATE no longer chains
`.select().single()` — RLS sometimes hides the just-updated row from the
SELECT path which would make `.single()` throw "Cannot coerce". The realtime
channel in `useComments` re-fetches on UPDATE anyway, so the UI refreshes
without us round-tripping the row.

### UI

`CommentList` was rewritten so each comment is a `CommentItem` with view /
edit modes:

- **Edit button** for the author (RLS handles deeper enforcement)
- Inline `Textarea` with Save / Cancel; Save is disabled when empty or
  unchanged
- "· edited \<when\>" tag when `edited_at` is set
- "view original" / "show current" toggle when `original_text` is set

### Files

- [supabase/migrations/0021_comment_edits.sql](supabase/migrations/0021_comment_edits.sql) — schema
- [commentsService.js](src/features/tickets/services/commentsService.js) — `updateComment` + `COMMENT_COLUMNS`
- [CommentList.jsx](src/features/tickets/components/CommentList.jsx) — `CommentItem` with view / edit modes

---

## 6. Admin password reset

### What

Admins with the new `users.reset_password` permission can reset another
user's password directly: a key icon appears next to each staff row → click
opens a modal → type or generate a password → submit → password is overwritten
on the auth user and the action is audited.

The admin sees the new password on the success screen (so it can be passed on
securely). The user should change it on next sign-in.

### New permission key

In [roles.utils.js](src/features/roles/roles.utils.js), under "Users & roles":

```js
{ key: 'users.reset_password', label: 'Reset user passwords' },
```

The seed Admin role does **not** auto-pick up new keys — grant it via Admin →
Roles → edit the role → tick the new checkbox → save.

### Edge function

[admin-reset-password](supabase/functions/admin-reset-password/index.ts)
mirrors the shape of `admin-create-user`:

1. Reads the bearer token, resolves the caller via `auth.getUser()`.
2. Verifies `has_permission(caller.id, 'users.reset_password')`.
3. Validates the body (`user_id` + `new_password ≥ 6 chars`).
4. Confirms the target profile exists.
5. Calls `auth.admin.updateUserById(userId, { password })` with the service
   role.
6. Audits to `system_logs` with `action_type='user.reset_password'`. **The
   new password is never logged.**

Deploy with:

```powershell
supabase functions deploy admin-reset-password
```

### UI

- [passwordResetService.js](src/features/admin/services/passwordResetService.js) — invokes the edge function
- [ResetPasswordModal.jsx](src/features/admin/components/ResetPasswordModal.jsx) — password input + "Generate random" (12 crypto-strong base64url chars) + success screen
- [StaffRow.jsx](src/features/admin/components/StaffRow.jsx) — key icon button (only shown when parent passes `onResetPassword`)
- [StaffDirectory.jsx](src/features/admin/components/StaffDirectory.jsx) — only passes `onResetPassword` when `can('users.reset_password')`

---

## 7. SLA policies editor

### What

A new Admin → **SLA** tab. Edit the per-priority first-response and resolution
targets. Each value has a unit picker (minutes / hours / days) — the editor
auto-picks the largest evenly-dividing unit when loading existing values, and
converts back to minutes on save (matches the schema).

### No schema change needed

Migration **0009** already added `app_config.sla_rules` JSONB with the
exact shape the editor reads/writes:

```json
{
  "Low":    { "response_mins": 1440, "resolution_mins": 10080 },
  "Medium": { "response_mins": 480,  "resolution_mins": 4320 },
  "High":   { "response_mins": 120,  "resolution_mins": 1440 },
  "Urgent": { "response_mins": 30,   "resolution_mins": 240 }
}
```

The DB trigger `tickets_compute_sla()` reads from this on **every insert and
every priority change** to set `response_due_at` / `resolution_due_at`, so
edits take effect on new tickets immediately. Existing tickets keep their
already-computed due dates unless their priority changes.

### Permission

Reuses the existing `config.sla` key from [roles.utils.js](src/features/roles/roles.utils.js).
Non-permitted users see a read-only "Ask an admin to grant it" empty state.

### Files

- [appConfigService.js](src/features/admin/services/appConfigService.js) — adds `sla_rules` to `COLUMNS` and `updateSlaRules(slaRules)`
- [useAppConfig.js](src/features/admin/hooks/useAppConfig.js) — exposes `sla_rules` in the returned config
- [SlaRulesEditor.jsx](src/features/admin/components/SlaRulesEditor.jsx) — the editor; `minsToReadable` / `readableToMins` helpers; gated by `can('config.sla')`
- [AdminPage.jsx](src/features/admin/pages/AdminPage.jsx) — new SLA tab (Timer icon, lazy-loaded, between Custom Fields and Email)

---

## 8. Overdue ticket status

### What

Tickets in a non-terminal status (anything other than Resolved / Closed) that
exceed an admin-configurable age get flipped to status `'Overdue'` by a
scheduled job. The admin sets the day threshold from the bottom of the SLA
editor. Setting it to `0` disables the feature.

### Migration

[0022_overdue.sql](supabase/migrations/0022_overdue.sql) — adds:

- `app_config.overdue_after_days int default 7`
- Function `mark_overdue_tickets()`: scans tickets where `status NOT IN
  ('Resolved', 'Closed', 'Escalated', 'Overdue')` and `created_at + N days <
  now()`, flips status → `'Overdue'`. Returns the count.
- `pg_cron` schedule every 5 minutes (same cadence as the existing escalate
  job).
- Idempotent. Run it in the SQL Editor.

### Coexistence with the existing Escalated lifecycle

Migration 0010 already escalates tickets past their SLA resolution window to
`'Escalated'`. The two systems interact cleanly:

1. New ticket → user-chosen status (Open / Pending / In Progress).
2. `created_at + overdue_after_days < now()` → `mark_overdue_tickets()`
   flips to `'Overdue'`.
3. `resolution_due_at < now()` → `escalate_overdue_tickets()` overrides to
   `'Escalated'`. Its `WHERE` clause excludes only terminal + Escalated
   states, so Overdue is fair game to escalate.
4. User resolves → terminal status → both jobs leave it alone.

Order is: Open → ... → Overdue → Escalated.

### Status enum and badge

[TICKET_STATUSES](src/features/tickets/tickets.utils.js) gained `'Overdue'`
between `'In Progress'` and `'Escalated'`. The status-styles map got a
matching entry:

```js
Overdue: 'bg-orange-100 text-orange-700',
```

Orange (between In Progress amber and Escalated red) keeps the visual
distinction clear.

### Admin control

Lives at the bottom of the new SLA editor in a card titled "Overdue
threshold", with a single number input. The Save button writes both SLA
rules and overdue days in one click.

### Files

- [supabase/migrations/0022_overdue.sql](supabase/migrations/0022_overdue.sql) — schema, function, cron
- [tickets.utils.js](src/features/tickets/tickets.utils.js) — `TICKET_STATUSES` + `STATUS_STYLES`
- [appConfigService.js](src/features/admin/services/appConfigService.js) — `overdue_after_days` in `COLUMNS` + `updateOverdueAfterDays(days)`
- [useAppConfig.js](src/features/admin/hooks/useAppConfig.js) — exposes `overdue_after_days`
- [SlaRulesEditor.jsx](src/features/admin/components/SlaRulesEditor.jsx) — adds the overdue card at the bottom

---

## How to verify locally

1. **Run migrations** in the Supabase SQL Editor:
   - `supabase/migrations/0021_comment_edits.sql`
   - `supabase/migrations/0022_overdue.sql`
2. **Deploy the edge function:**
   ```powershell
   supabase functions deploy admin-reset-password
   ```
3. **Grant the new permission:** Admin → Roles → edit your admin role → tick
   "Reset user passwords" → save.
4. **Verify each feature:**
   - **Sticky bars:** open `/tickets`, scroll — the filter row pins. Same on
     `/customers` and Admin → Logs.
   - **Clickable notifications:** trigger a notification (assign a ticket to
     yourself, or comment on someone's ticket), open the bell, click the
     message → lands on the ticket.
   - **Clickable dashboard:** click a row in By status, By priority, Active
     workload → filtered tickets list. Click any StatCard → tickets list with
     the right filter (where one applies).
   - **Customer ticket filters:** open any customer detail page → filter the
     ticket list by status, type, created-by, since, before.
   - **Editable comments:** add a comment, hover as the author → pencil icon
     appears. Edit → "· edited" tag shows. Click "view original" — flips to
     pre-edit text in muted italic.
   - **Admin password reset:** Admin → Staff → key icon next to a user →
     generate or type password → reset → sign in as that user with the new
     password.
   - **SLA editor:** Admin → SLA → change Urgent's response to 15 minutes →
     save → create a new Urgent ticket → its `response_due_at` is 15 min
     after `created_at`.
   - **Overdue:** Admin → SLA → set Overdue threshold to 1 day → save → wait
     for the next cron tick (or run `select public.mark_overdue_tickets();`
     in SQL Editor) → any ticket older than 1 day in a non-terminal status
     now shows the Overdue badge.

---

## Files touched

**New files (8):**

- `supabase/migrations/0021_comment_edits.sql`
- `supabase/migrations/0022_overdue.sql`
- `supabase/functions/admin-reset-password/index.ts`
- `src/features/admin/services/passwordResetService.js`
- `src/features/admin/components/ResetPasswordModal.jsx`
- `src/features/admin/components/SlaRulesEditor.jsx`
- `Dashboard, Filters, Comments and Admin Tools.md` (this file)

**Modified (~20):** Topbar (already had ProfileMenu wiring from the pull),
TicketsPage, TicketFilters wiring, CustomersList, SystemLogsView,
CustomerDetailPage, ticketsService, commentsService, CommentList,
NotificationBell / Popover / Item, StatusBreakdown, PriorityBreakdown,
AgentWorkload, DashboardStats, tickets.utils, roles.utils, appConfigService,
useAppConfig, StaffRow, StaffDirectory, AdminPage.

---

## Suggested commit message

```
feat(ui+admin): sticky filters, clickable nav, customer filters, editable comments, admin password reset, SLA editor, overdue status

Interactivity:
- Sticky search/filter bars across TicketsPage, CustomersList, SystemLogsView
- Notifications popover: each item resolves #<ticket_number> via
  searchTickets and navigates on click
- Dashboard widgets link into the filtered tickets queue:
  status/priority/agent rows and stat cards. TicketsPage reads/writes
  filter state via useSearchParams so links and back button both work
- ticketsService.listTickets supports created_by, since, before filters
- CustomerDetailPage gains a sticky filter row (status, type, created-by,
  since, before)

Editable comments:
- Migration 0021 adds original_text + edited_at to comments
- updateComment captures original_text on first edit, stamps edited_at,
  uses maybeSingle and skips post-update SELECT to dodge an RLS-hidden
  row failure mode
- CommentList shows edit form for authors, "· edited <when>" tag, and
  "view original" toggle

Admin tools:
- New permission users.reset_password
- Edge function admin-reset-password (service-role updateUserById,
  has_permission gate, audited; password never logged)
- ResetPasswordModal on StaffRow with generate-random helper
- New Admin -> SLA tab: per-priority response/resolution targets with
  minute/hour/day units, backed by existing app_config.sla_rules
- Migration 0022 adds app_config.overdue_after_days + mark_overdue_tickets
  function + pg_cron schedule. 'Overdue' added to TICKET_STATUSES between
  In Progress and Escalated. Threshold edited from the SLA tab.

Deploy steps:
- Run 0021_comment_edits.sql and 0022_overdue.sql in SQL Editor
- supabase functions deploy admin-reset-password
- Grant users.reset_password to the admin role via Admin -> Roles
```
