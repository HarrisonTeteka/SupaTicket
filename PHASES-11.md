# SupaTicket — Phase 11

> Continuation of `PHASES.md` (Phases 1–4), `PHASES-5-7.md` (Phases 5–7) and
> `PHASES-8-10.md` (Phases 8–10). The **Conventions** section in `PHASES.md`
> still applies in full — feature folders under `src/features/<name>/`,
> `.jsx` vs `.js` split, services own all network calls, RLS in the same
> migration as the table it gates, realtime publication for subscribed
> tables, `logAction(...)` on audit-worthy mutations, unique-per-instance
> Supabase realtime channel names (`crypto.randomUUID()` suffix).

## State going into Phase 11

- Phases 1–10 are built, committed and migrations `0001`–`0013` applied to
  the live Supabase project.
- A code review against "comprehensive ticket management system"
  requirements found that **customers as data records** (not auth users)
  was the single most impactful next step: without it tickets can only be
  attributed to people who log in via the Phase 8 portal, with no place to
  store CRM context (company, address, account ids) and no way to surface a
  "all tickets for ACME Ltd" view.
- Phase 11 introduces that customer entity, a CSV importer, and a
  per-customer page reachable from the main sidebar.

## What changes once Phase 11 lands

- Tickets gain a second, independent attribution path. The Phase 8 portal
  customers (auth users with `role='customer'`) still attach via
  `created_by`; **CRM-imported customers attach via `customer_id`**.
- The staff/agent ticket UI gains a customer picker and a customer chip on
  every list row.
- A new top-level `/customers` page appears in the left sidebar for every
  signed-in staff and admin user.
- The admin Customers tab and the sidebar Customers page render the same
  list component — same data, two access paths (kept on purpose for now).

---

## Phase 11 — Customer Records (CRM Import)

**Status:** Built. **Depends on:** Phases 1–10.

### Scope

- A `customers` table for CRM-imported contacts who don't log in.
- `tickets.customer_id` FK so staff can attribute a ticket to a customer.
- Admin / staff UI to **add, search, edit, delete** customers.
- **CSV import** keyed on `external_id` for re-importable upserts.
- A per-customer page at `/customers/:id` with their contact details and
  every ticket attributed to them, plus a "Raise ticket" button that
  pre-fills the customer.
- A new top-level **Customers** entry in the left sidebar.
- Clickable customer name in the ticket detail's side panel jumping to
  the customer page.

### DB changes — `supabase/migrations/0014_customers.sql`

New table:

```sql
public.customers (
  id             uuid pk default gen_random_uuid(),
  external_id    text not null,        -- CRM id; dedupe key (case-insensitive)
  name           text not null,
  email          text,
  phone          text,
  company        text,
  address_line1  text,
  address_line2  text,
  city           text,
  state          text,
  postal_code    text,
  country        text,
  notes          text,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
)
```

Indexes:

- `customers_external_id_uniq` — unique on `lower(external_id)` (this is the
  upsert dedupe key).
- `customers_name_idx`, `customers_email_idx`, `customers_company_idx` — all
  on `lower(...)` for case-insensitive search.

Tickets:

```sql
alter table tickets add column customer_id uuid references customers(id)
  on delete set null;
create index tickets_customer_idx on tickets(customer_id);
```

`updated_at` trigger reuses the shared `public.set_updated_at()` function
from `0001_init.sql`.

### RLS

- `customers_select_staff`, `customers_insert_staff`, `customers_update_staff`
  — admins and staff only (`not is_customer(auth.uid())`). Portal customers
  have no access to this table.
- `customers_delete_admin` — admin-only so a misclicked staff member cannot
  wipe records.

### Realtime

`public.customers` added to the `supabase_realtime` publication so an import
or edit in one tab shows up in another within ~1s.

### File structure (new) — `src/features/customers/`

```
src/features/customers/
├── components/
│   ├── CustomersList.jsx          # table + search + edit/delete + import buttons
│   ├── CustomerEditModal.jsx      # create / edit form
│   ├── CustomerImportModal.jsx    # CSV upload → preview → import → result
│   └── CustomerPicker.jsx         # search-as-you-type combobox + inline "+ New"
├── hooks/
│   ├── useCustomers.js            # directory list + realtime + server-side search
│   └── useCustomer.js             # single customer by id + realtime
├── pages/
│   ├── CustomersPage.jsx          # /customers — wraps CustomersList
│   └── CustomerDetailPage.jsx     # /customers/:id — info card + tickets list
├── services/
│   └── customerService.js         # CRUD + bulkUpsertCustomers + searchCustomers
└── customers.utils.js             # CSV parser, header alias map, validation
```

### Other client changes

- **`src/app/router.jsx`** — adds two routes:
  - `/customers` → `CustomersPage`
  - `/customers/:id` → `CustomerDetailPage`
- **`src/app/layout/Sidebar.jsx`** — `Contact` icon NavItem between
  **Tickets** and the **+** button.
- **`src/features/admin/pages/AdminPage.jsx`** — new **Customers** tab using
  the `Contact` icon. Both tab and sidebar point at the same `CustomersList`
  component (duplicate access path, kept on purpose).
- **`src/features/tickets/services/ticketsService.js`** — `customer_id` in
  `TICKET_COLUMNS`, plus an embedded `customer:customers(id, external_id,
  name, email, phone, company)` join so a ticket carries its linked customer
  in one round-trip. `listTickets({ customer_id })` filter added; `createTicket`
  / `updateTicket` accept `customer_id`.
- **`src/features/tickets/components/TicketForm.jsx`** — `CustomerPicker`
  rendered below the Assignee picker. The picker's "+ New customer" path
  opens the same `CustomerEditModal`. Form state seeds from `initial.customer`
  (used when a ticket is raised from a customer page).
- **`src/features/tickets/components/TicketRow.jsx`** — small `Building2`
  chip under the description showing `customer.name · customer.company` when
  a ticket has a linked CRM customer.
- **`src/features/tickets/components/TicketDetail.jsx`** — side-column
  customer panel: `CustomerPicker` for inline reassignment + email/phone /
  external_id display + "**View customer →**" link to `/customers/:id`.

### CSV import flow

1. Admin → **Customers** (sidebar) → **Import CSV**.
2. Modal shows a help block explaining required columns and a
   **Download template** button serving a single-row example.
3. User picks a `.csv` file via a styled file dropzone.
4. The browser parses it client-side via a small RFC-4180 CSV parser in
   `customers.utils.js` (handles BOM, CRLF/LF, quoted fields with embedded
   commas, escaped `""`). **No third-party library.**
5. Header names are normalised and matched against an alias table — `id`,
   `customer_id`, `crm_id` all map to `external_id`; `fullname`, `full_name`
   to `name`; `zip`, `postcode` to `postal_code`; etc. Unknown columns are
   dropped.
6. Each row is validated: `external_id` and `name` required; `email` (if
   present) must match a basic email regex; `external_id` duplicates within
   the file are flagged with the offending row numbers.
7. The first 20 valid rows render in a preview table; validation errors
   list up to 50 with row numbers (1-based, counting the header as row 1
   per the user's mental model).
8. **Import** does a two-step upsert keyed on `external_id`
   (case-insensitive): fetches existing rows by their external ids, splits
   into inserts vs updates, processes inserts in chunks of 500 with per-row
   fallback on chunk-level failure, then updates one-by-one for predictable
   error attribution.
9. Result summary modal shows `inserted=X updated=Y failed=Z`, with the
   per-row failure messages listed.
10. Every import writes one `system_logs` entry
    (`action_type='customer.import'`) via the existing `logAction()`.

### Header aliases recognised

| Canonical column | Aliases (case-insensitive, whitespace + `-` collapsed to `_`) |
|---|---|
| `external_id` | `external_id`, `externalid`, `id`, `crm_id`, `customer_id`, `ref` |
| `name` | `name`, `full_name`, `fullname`, `customer_name`, `contact_name` |
| `email` | `email`, `email_address`, `e-mail` |
| `phone` | `phone`, `phone_number`, `mobile`, `telephone`, `tel` |
| `company` | `company`, `organisation`, `organization`, `account` |
| `address_line1` | `address_line1`, `address1`, `address`, `street`, `street_address` |
| `address_line2` | `address_line2`, `address2` |
| `city` | `city`, `town` |
| `state` | `state`, `region`, `province`, `county` |
| `postal_code` | `postal_code`, `postcode`, `zip`, `zip_code` |
| `country` | `country` |
| `notes` | `notes`, `note`, `comments`, `description` |

### Customer detail page (`/customers/:id`)

Layout:

- Back link to `/customers`.
- Two-column grid:
  - **Left (info card):** name, company, external id, email (`mailto:`),
    phone (`tel:`), full address (multi-line), notes. Edit pencil opens
    `CustomerEditModal`; delete trash (admin-only) prompts then navigates
    back to `/customers`.
  - **Right (tickets, span-2 on lg):** **Raise ticket** button that pre-fills
    the new-ticket modal with this customer selected; ticket list filtered
    by `customer_id` (top-level only — sub-tickets stay under their parent
    on the parent's detail page); loading skeleton; error empty-state;
    **"No Tickets"** empty-state when the customer has none yet; otherwise
    a stack of `TicketRow`s. Each row navigates to `/tickets/:id` on click
    (re-uses the existing `TicketRow` component verbatim).

Realtime: `useCustomer(id)` subscribes to `customers` filtered on
`id=eq.${id}`; `useTickets({ customer_id: id })` subscribes to the tickets
publication and refetches the filtered list on any change.

### Acceptance

- Admin opens **Customers** from the sidebar → sees an empty state at
  first, then a table after the first import or **+ New customer**.
- Downloading the template gives a valid one-row CSV that imports cleanly.
- Re-importing the same CSV updates existing rows (matched on
  `external_id`, case-insensitive) and reports `updated=N inserted=0`.
- A CSV with `id` / `fullname` / `zip` headers imports correctly via the
  alias map.
- A CSV with two rows sharing an `external_id` flags the duplicate and
  imports only the first occurrence.
- A row missing `external_id` or `name` is skipped with a clear
  per-row error in the result modal.
- Opening a ticket from the staff queue and assigning a customer via the
  `CustomerPicker` persists; the row's customer chip updates within ~1s
  (realtime).
- Clicking a customer name in the Customers list navigates to
  `/customers/:id`; the ticket list there reflects every ticket currently
  attributed to that customer.
- A customer with no tickets shows the "No Tickets — {Name} has no
  tickets yet." empty state.
- Clicking a ticket row on the customer page navigates to
  `/tickets/:id` exactly as on `/tickets`.
- **"View customer →"** inside `TicketDetail` jumps to the customer page;
  the customer name in `CustomersList` is a `Link` (underlines on hover).
- A portal customer (role `customer`) gets `403`/empty on any
  `customers` query — RLS holds.
- `npm run build` exits 0; new files do not introduce new lint errors.

### Out of scope

- **Merging duplicate customers** created before the dedupe key existed
  — would need a UI to pick a survivor and re-point referencing tickets.
- **CSV column mapping UI** — the importer accepts headers via the alias
  table or the canonical names; CRMs that don't fit either still need the
  user to rename columns in the file.
- **Multi-CRM provenance** — there's one `external_id` per customer; if a
  customer exists in two CRMs simultaneously, only one mapping is stored.
  Phase 11.x could add a `source` text column or a separate
  `customer_external_refs` table.
- **Inline edit from the table** — edits happen in the modal; per-cell
  inline edit would be a UX refinement.
- **Pagination** — `listCustomers` returns all rows; at the scales a CRM
  produces, paging will be required (the same gap exists for `tickets` —
  flagged in the Phase 1–10 code review).
- **Customer-side multi-org** — one CRM contact still maps to one customer
  row; a contact who belongs to multiple companies has to be modelled as
  separate rows.
- **Inbound email →  auto-link to a customer by sender address** — needs
  Phase 12+ (inbound email channel).
- **Approval workflow for delete** — admin-only delete is the only guard.

---

## After Phase 11

Carrying forward from the review, the next-most-impactful items still
unscoped. None of these started:

- **Phase 12 — Performance fixes**: pagination on `listTickets`,
  `listAllTags` server-side aggregation, `creator_name` /
  `assignee_name` denormalisation trigger so historical display can't drift.
- **Phase 13 — Bulk operations + saved views**: multi-select on
  `TicketList`, bulk assign / close / tag; named filter sets pinnable to
  the sidebar.
- **Phase 14 — Macros / canned responses**: reusable comment templates
  with `{{ticket.title}}` / `{{customer.name}}` variable substitution.
- **Phase 15 — Per-ticket activity timeline**: capture field changes
  (status, priority, assignee, customer) into a unified
  `ticket_activity` view alongside comments.
- **Phase 16 — Tests + CI**: smoke tests for the auth + ticket-create
  paths, RLS regression tests, GitHub Actions running build + lint on PRs.
- **Phase 17 — Workflow automation rules engine**: "when X then Y" rules
  evaluated in a DB trigger or Edge Function.
- **Phase 18 — Inbound email**: emailed support requests landing as
  tickets, with sender-domain → customer auto-link.
- **Phase 19 — Knowledge base / self-service**.

Carry-over items still deferred from earlier roadmaps:

- Agent presence / online status (Supabase Presence).
- Granular RBAC beyond admin / staff / customer.
- Business-hours / category-specific SLAs and pause-while-Pending.
- Inbound email replies turning into comments.
- White-label / multi-tenant.

---

## Migrations index after Phase 11

| # | File | Phase | Purpose |
|---|---|---|---|
| 0001 | `0001_init.sql` | 1 | schema + RLS + first-user-admin + realtime publication |
| 0002 | `0002_profiles_self_update_guard.sql` | 1 | RLS column guard on self-update |
| 0003 | `0003_tickets_storage.sql` | 2 | attachments storage bucket + FTS index |
| 0004 | `0004_notifications_function.sql` | 3 | `notify_user()` SECURITY DEFINER |
| 0005 | `0005_ticket_notification_triggers.sql` | 3 | assign / status / comment notify triggers |
| 0006 | `0006_admin_log_helper.sql` | 4 | `log_action()` definer + tighten insert policy |
| 0007 | `0007_ticket_metrics.sql` | 5 | `resolved_at` / `first_response_at` / `satisfaction_rating` |
| 0008 | `0008_workflow_depth.sql` | 6 | 6 statuses, tags, internal notes |
| 0009 | `0009_sla.sql` | 7 | SLA rules + due-date triggers |
| 0010 | `0010_sla_escalation.sql` | 7 | `escalate_overdue_tickets()` + pg_cron |
| 0011 | `0011_customer_portal.sql` | 8 | `customer` role + role-aware RLS |
| 0012 | `0012_email_prefs.sql` | 9 | `profiles.email_notifications` + sender config |
| 0013 | `0013_reports.sql` | 10 | `get_weekly_stats()` definer for the digest |
| **0014** | **`0014_customers.sql`** | **11** | **`customers` table + `tickets.customer_id` FK + RLS + realtime** |
# SupaTicket — Phase 11: Bundle Code-Splitting

> Continuation of `PHASES.md` (1–4), `PHASES-5-7.md` (5–7), and
> `PHASES-8-10.md` (8–10).
>
> Phase 11 is a **performance / house-keeping phase** — no new features.
> It shrinks the initial JS payload by route-splitting the app with
> `React.lazy()` + `Suspense`.

## Why

At the end of Phase 10 the production build emitted a single ~540 kB JS
entry, tripping Vite's `>500 kB after minification` warning. The whole app
— staff dashboard, tickets list, ticket detail, admin (7 tabs), reports,
portal pages — loaded on first paint, even though a given user only ever
touches a handful of routes.

The simplest, highest-ROI win is per-route code-splitting: keep the app
chrome (sidebar + topbar) in the entry chunk so it paints immediately,
and stream each page in on demand.

## Scope

- Convert every routed page to `React.lazy()`; each becomes its own chunk.
- Wrap routes in `<Suspense>` with an unobtrusive pulsing-card skeleton.
- Keep `Sidebar`, `Topbar`, `PageContainer`, and the auth + nav contexts
  **eager** so the chrome renders without waiting on a network round-trip.
- Inside `AdminPage`, lazy-load each tab so only the active tab's bundle
  ships — Reports + Logs + Email never load if you only visit Staff.
- Apply the same treatment to the customer portal routes in `AppShell`.

## DB changes

None.

## Files touched

| File | Change |
|---|---|
| `src/app/router.jsx` | `lazy(() => import(...))` for DashboardPage, TicketsPage, TicketDetailPage, AdminPage. Single shared `<LazyRoute>` wrapper provides `<PageContainer>` + `<Suspense>` + skeleton. |
| `src/app/AppShell.jsx` | `lazy(...)` for PortalDashboardPage, PortalNewTicketPage, PortalTicketDetailPage. `<Suspense>` inside `PortalShell`. |
| `src/features/admin/pages/AdminPage.jsx` | `lazy(...)` for all 7 tab components. `<Suspense>` around the active-tab render. Tab definitions carry their lazy component as `{ id, label, icon, component }`. |

No new files, no deletions.

## Implementation notes

### Named exports vs default

Several feature components were named exports (`export function StaffDirectory()`
etc.). `React.lazy()` expects a module whose default export is a component, so
each lazy call uses the standard interop wrapper:

```jsx
const StaffDirectory = lazy(() =>
  import('../components/StaffDirectory').then((m) => ({ default: m.StaffDirectory }))
);
```

Page components that were already `export default` (the four route pages,
the three portal pages, `ReportsPage`) didn't need the wrapper.

### Suspense placement

`<Suspense>` is placed **inside** `PageContainer` (and inside `PortalLayout`),
not around `<Routes>`. This keeps the topbar / sidebar / portal nav painted
while the new page chunk streams in — only the page body shows the loader.
The loader is a small stack of pulsing cards that matches the page padding.

```jsx
function LazyRoute({ title, children }) {
  return (
    <PageContainer title={title}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </PageContainer>
  );
}
```

### Mobile-nav cooperation

The `useMobileNav` context (from the earlier responsive pass) already auto-closes the
drawer on route change via `useLocation`. That keeps working under lazy
loading — the URL change fires before the lazy chunk finishes fetching, so
the drawer is already closed by the time the page paints.

## Results

Before (single bundle):

```
dist/assets/index-Z3YMQ65t.js   548.66 kB │ gzip: 153.08 kB
(!) Some chunks are larger than 500 kB after minification.
```

After (entry + 17 lazy chunks):

```
dist/assets/index-…js                486.53 kB │ gzip: 139.92 kB
dist/assets/TicketDetailPage-…js      14.47 kB │ gzip:   4.44 kB
dist/assets/DashboardPage-…js         10.49 kB │ gzip:   3.38 kB
dist/assets/ReportsPage-…js            6.51 kB │ gzip:   2.20 kB
dist/assets/PortalTicketDetailPage-…   4.77 kB │ gzip:   1.80 kB
dist/assets/StaffDirectory-…js         4.70 kB │ gzip:   1.74 kB
dist/assets/AdminPage-…js              4.19 kB │ gzip:   1.68 kB
dist/assets/SystemLogsView-…js         3.66 kB │ gzip:   1.45 kB
dist/assets/CustomFieldsBuilder-…js    3.20 kB │ gzip:   1.37 kB
dist/assets/EmailSettingsEditor-…js    3.16 kB │ gzip:   1.41 kB
dist/assets/TicketRow-…js              2.77 kB │ gzip:   1.21 kB
dist/assets/PortalDashboardPage-…      2.70 kB │ gzip:   1.24 kB
dist/assets/TicketsPage-…js            2.64 kB │ gzip:   1.13 kB
dist/assets/PortalNewTicketPage-…      1.91 kB │ gzip:   0.96 kB
dist/assets/CategoriesEditor-…js       1.77 kB │ gzip:   0.86 kB
dist/assets/DepartmentsEditor-…js      1.77 kB │ gzip:   0.86 kB
dist/assets/SatisfactionRating-…js     1.47 kB │ gzip:   0.83 kB
dist/assets/portalService-…js          1.41 kB │ gzip:   0.60 kB
✓ built — no >500 kB warning
```

- Initial JS dropped from **540 kB → 486 kB** (140 kB gzipped).
- ~76 kB of feature code now lives behind on-demand chunks.
- Vite's chunk-size warning is gone.
- Staff users never download portal bundles (and vice versa).
- A user who only opens the Staff tab in admin avoids downloading Reports,
  Logs, Email, Custom Fields, etc.

## Acceptance

- `npm run build` exits 0 with no `>500 kB` warning.
- Devtools Network tab shows one new `.js` request the first time each
  route is visited; subsequent visits are instant (chunk cached).
- App chrome (sidebar + topbar) stays painted during chunk fetch — only
  the page body shows the skeleton fallback.
- Customer accounts never trigger a request for any staff page chunk.
- Switching admin tabs streams just the tab's bundle.

## Out of scope / future

- **Vendor splitting** — pulling `react`, `react-dom`, `react-router-dom`,
  `@supabase/supabase-js`, and `lucide-react` into their own
  long-cacheable chunks via `rolldownOptions.output.manualChunks`. Would
  shave a chunk off the entry on first load and dramatically improve
  cache hit rates between deploys. ~140 kB gzipped of the entry is
  vendor code today.
- **Route preloading on intent** — preload the target chunk on
  link-hover / focus so the navigation is instant even on first visit.
- **Image / asset optimisation** — the SupaMoto SVG logo is small enough
  to ignore; if larger assets land later, consider responsive images.
- **PWA / offline cache** — service worker that pre-caches chunks for
  fully offline use. Not on the roadmap.

---

Phase 11 closes the perf-housekeeping gap. The original 10-phase product
scope plus the customer portal, email pipeline, reporting, and now
code-splitting are all in place; remaining work tracked in `PHASES-8-10.md`
"After Phase 10" remains the future-look list.
