# SupaTicket — Phase Roadmap 8–10

> Continuation of `PHASES.md` (Phases 1–4) and `PHASES-5-7.md` (Phases 5–7).
> The **Conventions** section in `PHASES.md` still applies in full — feature
> folders under `src/features/<name>/`, `.jsx` vs `.js` split, services own
> all network calls, RLS in the same migration as the table it gates,
> realtime publication for subscribed tables, `logAction(...)` on
> audit-worthy mutations, unique-per-instance Supabase realtime channel names
> (`crypto.randomUUID()` suffix).

## State going into Phase 8

- Phases 1–7 are built and committed (`c950c1b Phase 7 Complete` and back).
- Migrations `0001`–`0010` exist in `supabase/migrations/`. Anything not yet
  applied in the live Supabase project must be run before the corresponding
  feature works end-to-end.
- The project has been **internal-only** so far — every user is `staff` or
  `admin`. Phase 8 is the architectural step that lifts that assumption by
  introducing a real customer/requester role.

## What changes once Phase 8 lands

Several things built earlier become more meaningful:

- The `comments.internal` flag from Phase 6 stops being purely visual — RLS
  starts hiding internal notes from customers.
- CSAT (Phase 5) becomes a real customer-satisfaction signal rather than a
  staff self-rating.
- "Customer history" — referenced in the original Agent Dashboard
  requirement — becomes a true concept (all tickets raised by a given
  customer, not just by a profile id).

---

## Phase 8 — Customer Portal

**Status:** Next. **Depends on:** Phases 1–7.

This is the big architectural extension. It introduces a third role, a
separate routed shell, and tightens RLS across the board.

### Scope

- Add a third role `customer` (alongside `admin` and `staff`).
- Customers raise tickets through a dedicated portal at `/portal`.
- Customers see only their own tickets and only non-internal comments.
- Customer sign-up flow (magic-link recommended) separate from staff sign-up.
- Customer-facing CSAT capture on Resolved tickets (replaces the
  internal-only rating from Phase 5).
- Staff agent UI labels tickets with a "Customer-raised" badge.

### DB changes — `0011_customer_portal.sql`

- Drop and re-add `profiles.role` CHECK so it accepts
  `admin / staff / customer`. Existing rows stay as-is.
- Helper: `is_customer(uid uuid) returns boolean` mirroring `is_admin`.
- Tighten RLS — replace the current "any authenticated user" policies with
  role-aware ones:
  - `tickets_select`: customers see only rows where `created_by = auth.uid()`
    OR `assigned_to = auth.uid()`; staff and admins see everything (current
    behaviour).
  - `tickets_insert`: customers may insert tickets but cannot set
    `assigned_to`, `status` (defaults to `Open`), or `parent_id`.
  - `tickets_update`: customers can only update tickets they created and
    only the `satisfaction_rating` column.
  - `comments_select`: customers see comments where `internal = false`
    on tickets visible to them.
  - `comments_insert`: customers cannot set `internal = true`.
  - `profiles_select`: customers see their own row + the names of profiles
    they have a ticket relationship with (assignee / commenter); not the
    whole directory.
  - `app_config`, `system_logs`: customers have no access.
- Trigger update: `handle_new_user` keeps the first-user-becomes-admin
  rule; new customer sign-ups land with `role = 'customer'` (driven by a
  flag in `raw_user_meta_data`).

### File structure (new)

```
src/features/portal/                    # customer-facing chrome and routes
├── components/
│   ├── PortalLayout.jsx                # lighter chrome than the staff sidebar
│   ├── PortalTicketCard.jsx
│   └── PortalCommentList.jsx           # filtered (no internal notes)
├── hooks/
│   └── usePortalTickets.js             # current user's own tickets, realtime
├── pages/
│   ├── PortalDashboardPage.jsx         # "My tickets"
│   ├── PortalNewTicketPage.jsx
│   └── PortalTicketDetailPage.jsx      # read-only meta, customer-safe comments
└── services/
    └── portalService.js                # scoped CRUD for the current customer
```

### Other client changes

- `AuthGate` exposes `isCustomer` next to `isAdmin`; the gate's render branch
  picks `<PortalLayout>` vs `<AppShell>` based on role.
- `router.jsx`: a separate `/portal/*` route subtree gated on `isCustomer`;
  a staff/admin hitting `/portal` is redirected to `/dashboard`.
- `CommentForm`: hide the "Internal" toggle when `isCustomer`.
- `TicketRow` / `TicketDetail` (staff side): new "Customer-raised" badge
  when `created_by` resolves to a `customer` profile.
- `SatisfactionRating` (Phase 5) becomes customer-only — staff can read,
  customers can write.

### Acceptance

- A new sign-up via the customer flow is created with `role = 'customer'`.
- That customer lands on `/portal` and sees only their own tickets.
- They create a ticket; staff see it in the queue with a "Customer-raised"
  badge.
- Staff posts an internal note; the customer cannot see it in the portal
  (and a direct REST call also returns nothing — RLS, defence in depth).
- The customer rates a Resolved ticket; the staff dashboard's CSAT average
  updates within ~1s (realtime).
- A staff member at `/portal` is redirected to `/dashboard`.
- A customer attempting to `update` another customer's ticket gets denied.

### Out of scope

- White-label / per-tenant branding.
- Anonymous "guest" ticket creation (customers must sign up).
- Customer-side attachments preview gallery (basic list only).
- Multiple customer organisations / accounts hierarchy.

---

## Phase 9 — Email Notifications

**Status:** Upcoming. **Depends on:** Phase 8.

Phases 3 + 7 already deliver in-app notifications via the `notifications`
table. This phase fans them out to email so customers and out-of-app staff
get reached.

### Scope

- A Supabase **Edge Function** sends an email when a row lands in
  `notifications`.
- Per-user opt-out (`profiles.email_notifications`).
- Templated bodies per notification type (assignment, status change, new
  comment, SLA breach).
- Admin-editable sender identity (`from_name`, `from_email`, `reply_to`).
- Failures logged to `system_logs` with `action_type = 'email.send'`.

### DB changes — `0013_email_prefs.sql`

- `profiles.email_notifications boolean not null default true`.
- `app_config.email_sender jsonb` — `{ from_name, from_email, reply_to }`,
  seeded with placeholder values that the admin must edit.
- Optional: a database webhook on `notifications` insert that calls the
  Edge Function. Document the webhook setup (created in Supabase Studio,
  not via migration).

### Edge Function — `supabase/functions/send-notification-email/`

```
supabase/functions/send-notification-email/
├── index.ts                            # Deno function entry
├── templates.ts                        # per-type subject + body builders
└── .env.example                        # RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

- Triggered by a database webhook on `INSERT INTO notifications`.
- Reads the recipient's `profiles` row using the service-role key (bypasses
  RLS for this controlled lookup).
- Skips if `email_notifications = false`, the email is missing, or the
  sender is misconfigured.
- Sends via Resend (or AWS SES) — config-driven via env.
- Writes one `system_logs` entry per send (success or failure).

### Client changes

- New **Email** tab in `AdminPage` → `EmailSettingsEditor.jsx` (sender config
  + a "Send test email" button).
- `EditProfileModal` self mode: a toggle "Email me notifications" writing
  `profiles.email_notifications`.
- A `supabase/functions/.env.example` documenting required vars; the live
  values get set via `supabase secrets set`.

### Acceptance

- A staff member is assigned a ticket → assignee receives an email within
  ~1 minute on the configured `from_email`.
- A customer's ticket is resolved → customer receives an email.
- Setting `email_notifications = false` stops emails (in-app notifications
  still fire normally).
- A misconfigured sender is logged once per failed send in System Logs
  without breaking the user flow.

### Out of scope

- SMS / Slack / Teams channels (separate phase if needed).
- Per-notification-type opt-out (a single global toggle for now).
- Inbound email — turning a reply into a comment is a much bigger feature
  and deferred.
- Bounce / complaint webhook handling.

---

## Phase 10 — Reporting & Exports

**Status:** Upcoming. **Depends on:** Phases 5, 8, 9.

Now that we have rich ticket data, customer attribution, and an email
pipeline, this phase makes it visible outside the app.

### Scope

- CSV export of tickets, filterable (status / priority / category / tag /
  date range / customer).
- CSV export of `system_logs`, filterable.
- A weekly digest email sent to admins every Monday summarising the prior
  week (volume, KPIs, top categories, breached SLAs). Uses the Phase 9
  email pipeline.

### DB changes — `0014_reports.sql` (small)

- A SQL view `weekly_ticket_stats` returning the prior-week roll-up the
  digest renders. (A view, not a table — recomputed on read.)
- Optional: a `weekly_digest_runs` table if we want to dedupe sends.

### Edge Function — `supabase/functions/weekly-digest/`

- Cron-scheduled (Mondays 09:00 in the project's timezone) via `pg_cron`
  calling out, or via Supabase's scheduled functions feature.
- Queries `weekly_ticket_stats`, builds the digest HTML, sends to every
  admin profile.
- Logs to `system_logs` with `action_type = 'digest.send'`.

### File structure (client)

```
src/features/reports/
├── components/
│   ├── TicketExportPanel.jsx           # filters + "Download CSV"
│   └── LogExportPanel.jsx
├── hooks/
│   └── useExport.js                    # builds rows from current filters
├── pages/
│   └── ReportsPage.jsx                 # admin-only, /reports
└── services/
    └── exportService.js                # tickets + logs queries, lean columns
```

- New top-level admin route `/reports` (admin-only), or a `Reports` tab
  inside `AdminPage` — pick at implementation time.
- A small `toCsv(rows, headers)` helper (no library — `Blob` + array-to-CSV,
  the dataset is tractable for an internal workspace).

### Acceptance

- An admin exports the current ticket list to CSV; the file contains ticket
  number, title, status, priority, category, tags, assignee, customer,
  created/resolved timestamps, and CSAT.
- An admin exports system logs filtered by action type + date range.
- The weekly digest email arrives every Monday with the prior week's KPIs
  and a link back into the app.

### Out of scope

- Excel `.xlsx` format — CSV is enough.
- Per-user scheduled custom report subscriptions — admin-wide digest only.
- BI integration (Metabase / Looker) — out of band; raw CSV gets you 80% of
  the way.
- PDF reports.

---

## After Phase 10

Still unscoped — do not start without an explicit scoping pass:

- **Agent presence / online status** — Supabase Presence; "online", "typing".
- **Granular RBAC** — department-scoped permissions (a team lead can only
  manage their department's staff and tickets); finer-grained per-action
  permissions.
- **Bulk operations on tickets** — bulk assign / bulk close from the queue.
- **Saved filter views** — name a filter combination, pin it to the sidebar.
- **Business-hours SLAs** — pause the SLA clock outside working hours and
  on holidays.
- **Per-category SLA overrides** — let SLAs vary by category, not just
  priority.
- **Pause SLA in `Pending` state** — clock stops when waiting on the
  customer.
- **Inbound email** — turn an emailed reply into a comment via an inbound
  webhook (Resend / SES inbound).
- **White-label / multi-tenant** — separate workspaces per customer org.
