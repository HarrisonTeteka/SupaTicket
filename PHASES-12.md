# SupaTicket — Phase 12

> Continuation of `PHASES.md` (Phases 1–4), `PHASES-5-7.md` (Phases 5–7),
> `PHASES-8-10.md` (Phases 8–10) and `PHASES-11.md` (Phase 11). The
> **Conventions** section in `PHASES.md` still applies in full — feature
> folders under `src/features/<name>/`, `.jsx` vs `.js` split, services own
> all network calls, RLS in the same migration as the table it gates,
> realtime publication for subscribed tables, `logAction(...)` on
> audit-worthy mutations, unique-per-instance Supabase realtime channel
> names (`crypto.randomUUID()` suffix).

## State going into Phase 12

- Phases 1–11 are built and migrations `0001`–`0014` applied to the live
  Supabase project.
- Phase 11 (customer records) is feature-complete. Customer create / edit /
  import was open to any staff member, which surfaced two operational gaps:
  1. **Bulk customer imports** are too consequential to leave un-gated —
     CSV uploads should be admin-only.
  2. **User provisioning** has only ever been self-signup. Admins had no way
     to invite a new agent or set what that agent could do beyond the
     three-role hard coding (`admin` / `staff` / `customer`).
- A side-by-side comparison against Freshdesk, Zoho Desk, HubSpot Service
  Hub and osTicket flagged **custom roles + granular permissions** as one of
  the four highest-leverage missing items.
- Phase 12 introduces a proper RBAC system, an admin-driven user
  provisioning path, and locks down the Phase 11 customer importer as the
  first beneficiary of the new permission model.

## What changes once Phase 12 lands

- The legacy hard-coded `admin` / `staff` / `customer` role split is now a
  **shim on top of a real `roles` table** with a per-permission matrix.
  Existing `is_admin()` and `is_customer()` RLS helpers keep working
  unchanged because a trigger keeps `profiles.role` (text) in sync with the
  linked role's `system_name`.
- Every component that previously read `isAdmin` can now read **`can(key)`**
  from `useAuth()` for granular gating. `isAdmin` stays as a convenience
  alias and always returns true for the granular check.
- **Admins can create users from the UI**. Provisioning runs through a new
  Edge Function (service role required) and supports magic-link invites.
- **CSV import is locked to admin** by default; the per-role permission
  matrix lets an admin delegate it without granting full admin.

---

## Phase 12 — RBAC & Admin User Management

**Status:** Built. **Depends on:** Phases 1–11.

### Scope

- A `roles` table with a JSON permission matrix per role.
- Three system roles seeded — **Admin** (all perms), **Staff** (the standard
  agent permissions), **Customer** (none) — locked to the legacy
  `profiles.role` values via `system_name`.
- A `has_permission(uid, perm)` SECURITY DEFINER helper used by both RLS
  policies and (via embedded join) the client.
- `useAuth().can(key)` so UI components can hide / disable actions by
  permission.
- An **Admin Roles tab** with a categorised permissions matrix editor.
- A **Create user** action on the Admin Staff tab that calls a new Edge
  Function to provision the auth user with the service role, assign their
  role, and send a magic-link invite.
- Customers RLS tightened — `customers_insert_*` and `customers_update_*`
  policies now check `has_permission()` against `customers.create` /
  `customers.import` / `customers.edit`. Admin still passes via the Admin
  system role granting every permission.
- CSV import button gated client-side on `can('customers.import')`.

### DB changes — `supabase/migrations/0015_rbac.sql`

New table:

```sql
public.roles (
  id           uuid pk default gen_random_uuid(),
  name         text not null unique,
  description  text,
  permissions  jsonb not null default '{}'::jsonb,
  system_name  text not null default 'staff'
               check (system_name in ('admin','staff','customer')),
  is_system    boolean not null default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
)
```

Profiles link:

```sql
alter table profiles add column role_id uuid references roles(id);
create index profiles_role_id_idx on profiles(role_id);
```

Backfill: every existing row gets `role_id` set to the matching system role
based on its existing `profiles.role` text value.

`updated_at` trigger reuses the shared `public.set_updated_at()` from
`0001_init.sql`.

### Triggers

- **`profiles_sync_role_text`** (`before insert or update of role_id on
  profiles`) — whenever a profile's `role_id` is set or changed, the trigger
  copies the linked role's `system_name` into the legacy `profiles.role`
  column. This keeps every `is_admin()` / `is_customer()` check in the
  existing RLS unchanged. Custom roles use `system_name='staff'` so they
  always pass `is_admin()` checks as agents would.
- **`handle_new_user`** updated to also stamp `role_id` from the matching
  system role on signup. First-user-becomes-admin still applies.

### `has_permission(uid, perm)` helper

```sql
create or replace function public.has_permission(uid uuid, perm text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select (r.permissions ->> perm)::boolean
     from public.profiles p
     join public.roles r on r.id = p.role_id
     where p.id = uid),
    false
  );
$$;
```

Granted to `authenticated`. RLS policies call this directly.

### RLS

- **`roles`**: SELECT open to all authenticated (staff need to see role
  names in the user-creation modal). INSERT / UPDATE / DELETE require
  `roles.manage`. System roles cannot be deleted (defence in depth on top of
  the UI guard).
- **`customers`**: `customers_insert_perm` requires `customers.create` OR
  `customers.import`; `customers_update_perm` requires `customers.edit`.
  Admin always passes via the Admin role's full matrix.
- **`profiles`** policies are unchanged because every gate they use
  (`is_admin`, `is_customer`) still resolves correctly via the synced
  `profiles.role` text column.

### Realtime

`public.roles` added to the `supabase_realtime` publication so the Roles
tab updates live across browsers.

### File structure (new) — `src/features/roles/`

```
src/features/roles/
├── components/
│   ├── PermissionsMatrix.jsx      # categorised checkbox grid
│   ├── RoleEditModal.jsx          # create / edit role
│   └── RolesEditor.jsx            # Admin → Roles tab table + actions
├── hooks/
│   └── useRoles.js                # list + realtime
├── services/
│   └── roleService.js             # CRUD via supabase-js
└── roles.utils.js                 # PERMISSION_CATEGORIES, ALL_PERMISSIONS,
                                   # PERMISSION_LABELS, countPermissions,
                                   # isFullAccess
```

### File structure (new) — `src/features/admin/`

```
src/features/admin/
├── components/
│   └── CreateUserModal.jsx        # called from StaffDirectory + Edge Fn
└── services/
    └── createUserService.js       # thin wrapper around supabase.functions
                                   # .invoke('admin-create-user')
```

### Edge Function — `supabase/functions/admin-create-user/`

```
supabase/functions/admin-create-user/
├── index.ts                       # Deno entry: auth → has_permission →
                                   # createUser → patch profile → invite
└── README.md                      # deploy + secrets + request shape
```

Flow:

1. Reads the caller's bearer token from `Authorization`, resolves their
   user id via the anon-key Supabase client.
2. Calls `rpc('has_permission', { uid, perm: 'users.create' })` with the
   service-role client. 403 if missing.
3. Validates body (email format, name, role_id; rejects the customer
   system role — portal customers self-sign-up).
4. Calls `auth.admin.createUser({ email, password, email_confirm,
   user_metadata: { name } })`.
5. Patches the new profile row with `role_id`, `department`, `name`. The
   existing `handle_new_user` trigger already inserted the base row; the
   `profiles_sync_role_text` trigger keeps the legacy `role` text in sync.
6. If `send_invite` (default true), calls
   `auth.admin.inviteUserByEmail(email)`. Invite failure returns a
   `warning` instead of failing the create.
7. Audits with `action_type='user.create'`.

Rollback: if profile-patch fails after auth-user creation, the function
deletes the auth user so we don't leave orphans.

### Other client changes

- **`src/features/auth/components/AuthGate.jsx`** — exposes `can(key)`
  alongside `isAdmin` / `isCustomer`. Admins implicitly pass every key
  (defence against forgotten seed bumps when a new permission is added).
- **`src/features/auth/hooks/useUserProfile.js`** — adds
  `role_def:roles(id, name, permissions, system_name, is_system)` to the
  select so the permission map ships with the profile and live-updates via
  the existing realtime channel on `profiles`.
- **`src/features/admin/pages/AdminPage.jsx`** — new **Roles** tab between
  Staff and Customers, lazy-loaded.
- **`src/features/admin/components/StaffDirectory.jsx`** — **+ Create user**
  button gated on `can('users.create')`.
- **`src/features/customers/components/CustomersList.jsx`** — *Import CSV*
  gated on `can('customers.import')`; *+ New customer* on
  `can('customers.create')`; row edit on `can('customers.edit')`. Delete
  stays admin-only by RLS.

### Permission catalogue

Lives in `src/features/roles/roles.utils.js`. Categorised so the Roles
editor renders a labelled checkbox grid.

| Category | Keys |
|---|---|
| Tickets | `tickets.create`, `tickets.update`, `tickets.delete`, `tickets.assign`, `tickets.bulk` |
| Comments | `comments.post`, `comments.internal` |
| Customers | `customers.read`, `customers.create`, `customers.edit`, `customers.delete`, `customers.import` |
| Users & roles | `users.create`, `users.edit`, `users.delete`, `users.assign_role`, `roles.manage` |
| Configuration | `config.categories`, `config.departments`, `config.custom_fields`, `config.sla`, `config.email` |
| Reports | `logs.read`, `reports.export` |

**Adding a key** is a two-step change: (1) add it to
`PERMISSION_CATEGORIES`; (2) wire `has_permission(uid, 'new.key')` into
the RLS policy or the client gate that should respect it. The seed Admin
role does NOT auto-pick up new keys; bump the `0015` seed or grant it
manually via the Roles UI when adding new permissions.

### Built-in role permission seeds

| Role | Permissions granted |
|---|---|
| **Admin** | All 25 keys true |
| **Staff** | `tickets.create`, `tickets.update`, `tickets.assign`, `comments.post`, `comments.internal`, `customers.read`, `reports.export` |
| **Customer** | None |

System roles are locked from rename/delete in the UI; their permission
matrices remain editable so admins can revoke Staff defaults without
creating a custom role.

### Behaviour change worth flagging

After migration, **existing staff lose the ability to create / edit /
import customers** until an admin grants those permissions. This is the
intended behaviour per Phase 12's mandate ("restrict customer uploads to
admin accounts only") but it is a backward-incompatible change for any
workspace where staff previously managed customers. To restore the old
behaviour: Admin → Roles → Staff → tick `customers.create`,
`customers.edit`, `customers.import`.

### Acceptance

- Admin opens **Admin → Roles** → sees three seed roles labelled Built-in
  with `25 / 25`, `7 / 25`, `0 / 25` permission counts. Cannot delete any.
- Admin creates a **custom role** "Senior agent" with ticket + customer
  perms; the role appears in the **Create user** modal's role dropdown.
- Admin → **Staff** → **+ Create user** with the new role + an email →
  modal closes, row appears in the table within ~1s, the email receives
  an invite link.
- Following the invite link, the invitee sets a password and signs in;
  their `useAuth().can('customers.import')` returns true because the
  Senior-agent role grants it.
- A staff member without `customers.import` does not see the **Import
  CSV** button; a direct REST call to bulk-insert into `customers`
  returns 403 (RLS).
- Revoking `roles.manage` from the Admin role's matrix breaks the Roles
  editor write actions for that admin (defence in depth check). Other
  admin tabs still work because `can()` short-circuits true for admins on
  the client side; the server-side denial is the source of truth.
- A non-admin invocation of the Edge Function returns 403 with the
  message `Forbidden: requires users.create`.
- One `system_logs` entry per role / user / customer mutation, attributed
  to the actor.

### Out of scope

- **Field-level permissions** — RBAC gates at the action level (create /
  edit / delete) but not at the column level. Restricting "edit ticket
  priority" without "edit ticket status" would require either per-column
  triggers or a UI-only filter; deferred until needed.
- **Per-department or per-team role scoping** — a custom role granted
  `tickets.update` lets the user update *any* ticket, not just their
  department's. A Phase 13 candidate.
- **Deleting an auth user from the admin UI** — the Edge Function only
  creates; deletes go through the existing `deleteStaff` (profile only,
  not the underlying auth.users row). Adding an `admin-delete-user`
  function is straightforward but not part of this phase.
- **Password reset on behalf of a user** — admins can re-send invites but
  cannot rotate an existing user's password directly. Defer.
- **Permission grant audit trail beyond `system_logs`** — every role
  change writes one entry but does not capture the before/after permission
  diff. A "show recent permission grants" view is a UX refinement.
- **Two-factor auth (TOTP / SMS)** — listed as a comparison-gap with
  Freshdesk / Zoho / HubSpot; not in this phase.
- **SSO / SAML** — same.
- **IP allowlist for admin access** — same.

---

## After Phase 12

The comparison-gap analysis still has roughly this order. Items 1–4 are
each a phase-sized lift; the rest are polish / smaller features.

| Next phase | Topic | Why |
|---|---|---|
| Phase 13 | **Inbound email → ticket** | Universally table-stakes in every peer product; biggest single channel gap. Pairs naturally with customer-record auto-link by sender. |
| Phase 14 | **Macros / canned responses** | Agent-productivity multiplier; 1 day of work used 50× a day. |
| Phase 15 | **Automation rules engine** | "When category=X then assign to team Y, set tag Z." Removes manual triage load. |
| Phase 16 | **Knowledge base / self-service** | Reduces ticket volume by 20–40% in mature peers. |
| Phase 17 | **Bulk operations + saved views** | Multi-select on TicketList; named filter sets pinnable to the sidebar. |
| Phase 18 | **Per-ticket activity timeline** | Capture status / priority / assignee / customer changes into a unified per-ticket feed alongside comments. |
| Phase 19 | **Tests + CI** | Smoke tests for auth + ticket-create paths; RLS regression tests; GitHub Actions running build + lint on PRs. |
| Phase 20 | **Performance fixes from the audit** | Pagination on `listTickets`, `listAllTags` server-side aggregation, `creator_name` / `assignee_name` denormalisation trigger. |

Still deferred from earlier roadmaps:

- Per-department or per-team role scoping (granular RBAC v2).
- Business-hours / category-specific SLAs and pause-while-Pending.
- Agent presence / online status (Supabase Presence).
- Inbound email replies turning into comments on existing tickets.
- White-label / multi-tenant.
- 2FA / SAML SSO / IP allowlist (enterprise-tier features).

---

## Migrations index after Phase 12

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
| 0014 | `0014_customers.sql` | 11 | `customers` table + `tickets.customer_id` FK + RLS + realtime |
| **0015** | **`0015_rbac.sql`** | **12** | **`roles` table + permissions matrix + `has_permission()` + admin-only customers writes + tighten user provisioning** |

## Edge Functions index after Phase 12

| Function | Since | Purpose |
|---|---|---|
| `send-notification-email` | Phase 9 | DB webhook → email per `notifications` insert |
| `weekly-digest` | Phase 10 | Cron → weekly admin digest email |
| **`admin-create-user`** | **Phase 12** | **Authenticated POST → provisions a new auth user, links role, sends magic-link invite** |
