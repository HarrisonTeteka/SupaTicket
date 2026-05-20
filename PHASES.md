# SupaTicket — Phase Roadmap

> **Purpose:** Implementation-spec roadmap covering Phases 1 through 4. Each phase section is self-contained: scope, DB migrations, file structure, components/hooks/services, acceptance criteria, and explicit out-of-scope. A cold agent should be able to pick up any phase from this file plus `HANDOVER.md`.
>
> **Companion docs:**
>
> - `SETUP.md` — initial environment + Supabase project setup (Phase 1 prerequisite).
> - `HANDOVER.md` — pending fixes from the Phase 1 code review. Must be done before starting Phase 2.

---

## Conventions (apply to every phase)

These are non-negotiable across phases. Don't restructure mid-project.

**Folder layout.** Each feature owns its own subtree under `src/features/<name>/`:

```
src/features/<name>/
├── components/   # JSX-returning UI for this feature
├── hooks/        # React hooks (state, realtime subscriptions)
├── services/     # Network-touching code (Supabase calls)
├── pages/        # Top-level route components (when the feature has multiple)
└── *.utils.js    # Pure helpers, no JSX, no network
```

**File extensions.** `.jsx` if the file returns JSX. `.js` if pure logic. No mixing.

**Data access.** Feature components never import the Supabase client directly. They go through that feature's `services/` layer. Hooks may import the Supabase client for realtime channels only.

**Auth state.** Read via `useAuth()` from `src/features/auth/components/AuthGate.jsx`. Never re-read `supabase.auth` from a feature.

**Routing.** All routes registered in `src/app/router.jsx`. Admin-only routes are conditionally mounted based on `isAdmin` from `useAuth()`.

**Migrations.** Numbered sequentially in `supabase/migrations/`. Each migration is idempotent (`if not exists`, `drop policy if exists`). Never edit a migration that has already been run in production — add a new one.

**RLS.** Every new table gets RLS enabled in the same migration that creates it. Policies are written before any client code reads/writes the table.

**Realtime.** Tables that the client subscribes to are added to `supabase_realtime` publication. See the `do $$ … $$` block at the end of `0001_init.sql` for the pattern.

**Logging.** Mutations that should appear in the audit trail call `logAction(actionType, details)` from `src/features/admin/services/systemLogsService.js` (introduced in Phase 4 — see notes there). Until then, mutations log nothing.

**Toasts.** Use `useToast()` from `src/shared/hooks/useToast.jsx` for success/feedback. Errors render inline in forms; only use a toast for "background" success (saved, deleted).

---

## Phase 1 — Foundation

**Status:** Code complete; pending the nine fixes in `HANDOVER.md` (build configs, RLS guard, realtime refetch). When those land and `npm run build` is green, Phase 1 is done.

### Scope (recap)

- Supabase schema with `profiles`, `tickets`, `comments`, `notifications`, `app_config`, `system_logs`.
- Auth: signup, signin, signout. First user automatically becomes `admin`; every subsequent signup is `staff`.
- App shell: dark navy sidebar, white topbar, scrollable content area.
- Routing: `/dashboard`, `/tickets`, `/admin/*` (admin-only) as placeholders.
- Realtime publication on all tables.

### What ships

- `supabase/migrations/0001_init.sql` (already applied).
- `supabase/migrations/0002_profiles_self_update_guard.sql` (per `HANDOVER.md` Fix 7 + 8).
- `src/main.jsx`, `src/app/*`, `src/features/auth/*`, `src/lib/supabase.js`, `src/shared/*`, `src/styles/globals.css`.
- Build configs: `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`, `.gitignore`.

### Acceptance

- `npm run build` exits 0.
- Signup of the first ever account → role `admin` in `profiles`. Signup of any subsequent account → role `staff`.
- Signed-in shell renders with styled sidebar + topbar.
- Sign out returns to login screen.
- A non-admin SQL `update profiles set role='admin' where id=auth.uid()` raises an exception.

### Out of scope

Anything related to ticket data, notifications, or admin UI. Placeholder pages are intentional.

---

## Phase 2 — Tickets

**Status:** Next.
**Depends on:** Phase 1 complete.

This is the heart of the product. Tickets exist server-side in Phase 1 (table + RLS), but no UI touches them yet.

### Scope

- Ticket list view at `/tickets` with filtering (status, priority, assignee, category) and sorting.
- Ticket detail view at `/tickets/:id` with comments thread.
- "Raise Ticket" modal triggered from the `+` button in the sidebar (currently dispatches `supaticket:new-ticket` — wire this into a real modal).
- Edit ticket inline: status, priority, assignee, description.
- Sub-tickets via `parent_id`.
- Comments thread per ticket.
- File attachments via Supabase Storage.
- Topbar search by ticket number or keyword.

### DB changes

`supabase/migrations/0003_tickets_storage.sql`:

- Create Storage bucket `ticket-attachments` (private). Policies: authenticated users can `insert` and `select` objects in this bucket; `delete` is admin-only.
- Add a `tickets_search_idx` GIN index over `to_tsvector('english', title || ' ' || description)` for full-text search.
- Add a `comments_insert_auth` policy check that `author_id = auth.uid()` (already in 0001 — verify).

No new tables. The schema in `0001_init.sql` already has everything tickets needs.

### File structure (new)

```
src/features/tickets/
├── components/
│   ├── TicketList.jsx          # paginated list, calls useTickets()
│   ├── TicketRow.jsx           # one row in the list
│   ├── TicketFilters.jsx       # status/priority/assignee/category controls
│   ├── TicketDetail.jsx        # full detail panel (title, meta, description, comments)
│   ├── TicketForm.jsx          # shared create + edit form
│   ├── NewTicketModal.jsx      # wraps TicketForm; opened by sidebar +
│   ├── StatusBadge.jsx
│   ├── PriorityBadge.jsx
│   ├── AssigneePicker.jsx      # searchable dropdown over profiles
│   ├── AttachmentList.jsx
│   ├── AttachmentUploader.jsx
│   ├── CommentList.jsx
│   ├── CommentForm.jsx
│   └── SubTicketList.jsx       # children of a parent ticket
├── hooks/
│   ├── useTickets.js           # list + filter + realtime; returns { tickets, loading, error, refetch }
│   ├── useTicket.js            # single ticket by id + realtime
│   ├── useComments.js          # comments for a ticket + realtime
│   └── useTicketSearch.js      # debounced search hook used by topbar
├── pages/
│   ├── TicketsPage.jsx         # mounts TicketList + TicketFilters
│   └── TicketDetailPage.jsx    # mounts TicketDetail by :id
├── services/
│   ├── ticketsService.js       # CRUD: createTicket, updateTicket, deleteTicket, listTickets, getTicket
│   ├── commentsService.js      # CRUD: addComment, updateComment, deleteComment, listComments
│   └── attachmentsService.js   # upload, list, remove from ticket-attachments bucket
└── tickets.utils.js            # status/priority color maps, formatTicketNumber, etc.
```

### Router changes (`src/app/router.jsx`)

Replace `TicketsPlaceholder` with the real routes:

```jsx
<Route path="/tickets" element={<PageContainer title="Tickets"><TicketsPage /></PageContainer>} />
<Route path="/tickets/:id" element={<PageContainer title="Ticket"><TicketDetailPage /></PageContainer>} />
```

### Sidebar changes (`src/app/layout/Sidebar.jsx`)

The `+` button currently dispatches a window event. Replace with:

- Lift modal state into `AppShell` or a small `useNewTicketModal()` context.
- The `+` button opens the modal; `NewTicketModal` mounts at the AppShell level so it overlays any page.
- Keep the keyboard shortcut hook open (Phase 4 may add `n` to trigger).

### Topbar changes (`src/app/layout/Topbar.jsx`)

Wire the search input:

- Remove the `disabled` attribute.
- Hook into `useTicketSearch(query)` with a 200ms debounce.
- Show a dropdown of matches; clicking one navigates to `/tickets/:id`.
- If the query looks like a 6-digit number, prefer exact `ticket_number` match.

### Key data shapes

A ticket as returned by `getTicket(id)`:

```js
{
  id, ticket_number, title, description, category, priority, status,
  parent_id, assigned_to, assignee_name,
  attachments: [{ path, name, size, content_type }],
  custom_data: {},               // populated by Phase 4 custom fields
  created_by, creator_name, created_at, updated_at,
}
```

Denormalised `creator_name` / `assignee_name`: write them on insert/update so historical display survives a user deletion. The client must keep these in sync — there is no DB trigger for it.

### Realtime

- `useTickets()` subscribes to `tickets` table. On any insert/update/delete that matches the current filter, refetch the affected row (don't trust `payload.new` for the same reason as the profile fix — RLS column filtering).
- `useTicket(id)` subscribes filtered by `id=eq.${id}`. On update, refetch.
- `useComments(ticketId)` subscribes filtered by `ticket_id=eq.${ticketId}`. On insert, append; on update/delete, refetch.

### Attachments

- Bucket: `ticket-attachments`. Path convention: `${ticketId}/${uuid}-${originalName}`.
- On upload, append `{ path, name, size, content_type }` to `tickets.attachments` (jsonb array).
- On delete, remove from both the bucket and the array.
- Max 10 MB per file, enforce client-side; reject in the form.

### Acceptance

- Create a ticket → it appears in the list immediately (own client) and in another browser within ~1s (realtime).
- Filter by status `Open` → only open tickets show.
- Open a ticket detail → see comments, can add a comment, comment appears in real time for a second viewer.
- Reassign a ticket → assignee shown updates; `assignee_name` reflects the new assignee.
- Create a sub-ticket from a parent → parent's detail page shows it under "Sub-tickets".
- Upload a 1 MB PDF → appears in attachments; clicking it opens a signed URL.
- Topbar search for the 6-digit ticket number jumps to the detail page.
- Non-admin deleting a ticket fails (per RLS `tickets_delete_admin`).

### Out of scope (deferred to Phase 3 or 4)

- Notifications on assignment, status change, or new comment — Phase 3.
- Saved views / favorite filters — not planned, would be a Phase 5+ ask.
- Custom field rendering in TicketForm — Phase 4 (field definitions live in `app_config.custom_fields`; until then, only the static fields are shown).
- Email notifications — Phase 3+ via Supabase Edge Functions.

---

## Phase 3 — Notifications + Realtime polish

**Status:** Upcoming.
**Depends on:** Phase 2 complete.

### Scope

- Notifications inbox UI: bell icon in topbar with unread count, popover list of recent notifications.
- Toast on incoming notification (use `useToast()`).
- DB-level notification triggers on ticket assignment, status change, and new comment.
- Restrict who can insert into `notifications` (close the permissive policy from Phase 1).
- Mark single / mark all as read.

### DB changes

`supabase/migrations/0004_notifications_function.sql`:

```sql
-- SECURITY DEFINER notify helper. Lets any authenticated user send a
-- notification to any other user, but only via this controlled path
-- (we'll wire it into DB triggers below).
create or replace function public.notify_user(
  target_user uuid,
  msg         text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, message)
  values (target_user, msg);
end;
$$;

revoke all on function public.notify_user(uuid, text) from public;
grant execute on function public.notify_user(uuid, text) to authenticated;

-- Replace the permissive insert policy with a restrictive one.
drop policy if exists "notifications_insert_auth" on public.notifications;
create policy "notifications_insert_self" on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid());
-- After this, only notify_user() (running as definer) can insert for other users.
```

`supabase/migrations/0005_ticket_notification_triggers.sql`:

```sql
-- Notify assignee on assignment change.
create or replace function public.tickets_notify_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null
     and (old.assigned_to is distinct from new.assigned_to) then
    perform public.notify_user(
      new.assigned_to,
      'You have been assigned ticket #' || new.ticket_number || ': ' || new.title
    );
  end if;
  return new;
end $$;

drop trigger if exists tickets_notify_assignment on public.tickets;
create trigger tickets_notify_assignment
  after update of assigned_to on public.tickets
  for each row execute function public.tickets_notify_assignment();

-- Notify creator on status change.
create or replace function public.tickets_notify_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status and new.created_by is not null then
    perform public.notify_user(
      new.created_by,
      'Ticket #' || new.ticket_number || ' is now ' || new.status
    );
  end if;
  return new;
end $$;

drop trigger if exists tickets_notify_status on public.tickets;
create trigger tickets_notify_status
  after update of status on public.tickets
  for each row execute function public.tickets_notify_status();

-- Notify ticket creator + assignee on new comment (skip the commenter themself).
create or replace function public.comments_notify_new()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t public.tickets%rowtype;
begin
  select * into t from public.tickets where id = new.ticket_id;
  if t.created_by is not null and t.created_by <> new.author_id then
    perform public.notify_user(
      t.created_by,
      'New comment on ticket #' || t.ticket_number
    );
  end if;
  if t.assigned_to is not null
     and t.assigned_to <> new.author_id
     and t.assigned_to <> t.created_by then
    perform public.notify_user(
      t.assigned_to,
      'New comment on ticket #' || t.ticket_number
    );
  end if;
  return new;
end $$;

drop trigger if exists comments_notify_new on public.comments;
create trigger comments_notify_new
  after insert on public.comments
  for each row execute function public.comments_notify_new();
```

### File structure (new)

```
src/features/notifications/
├── components/
│   ├── NotificationBell.jsx       # mounts in Topbar; shows unread count
│   ├── NotificationPopover.jsx    # list of recent notifications
│   └── NotificationItem.jsx
├── hooks/
│   ├── useNotifications.js        # list + realtime for current user
│   └── useUnreadCount.js          # derived count, also used by Bell badge
└── services/
    └── notificationsService.js    # listForUser, markRead, markAllRead, remove
```

### Topbar changes

Add `<NotificationBell />` to the right side of the Topbar, before any future user actions. The bell renders an unread-count dot when `> 0`; clicking opens the popover.

### Realtime + toast wiring

`useNotifications()` subscribes to `notifications` filtered by `user_id=eq.${auth.uid()}`. On every `INSERT` event:

1. Prepend to local list.
2. Increment unread count.
3. Call `showToast(payload.new.message)` so the user sees it even if the bell is closed.

Don't show a toast for older notifications loaded on initial fetch — only for live inserts.

### Acceptance

- User A assigns a ticket to user B → user B sees a toast within ~1s and the bell shows "1".
- User A changes ticket status → user (the creator) sees a notification.
- User A comments → the ticket creator and assignee (if different from A) each get one notification; A gets none.
- Marking a notification as read decrements the bell count.
- A direct `insert into notifications(user_id, message) values ('<other-user>', 'spam')` from a non-self user fails (the permissive policy is gone; only `notify_user()` works).

### Out of scope

- Email notifications. Plan: a Supabase Edge Function triggered by a webhook on the `notifications` table, sending via Resend or SES. Track separately; not blocking.
- Notification preferences (mute by type, per-ticket follow). Phase 5+ if needed.
- Push / browser notifications. Same.

---

## Phase 4 — Admin / Settings

**Status:** Upcoming.
**Depends on:** Phases 2 and 3 complete.

This phase unlocks everything an admin needs to operate the workspace day-to-day. Most of it talks to tables that already exist (`profiles`, `app_config`, `system_logs`); the work is mostly UI plus enforcement.

### Scope

- Staff Directory: list all profiles, edit role/status/department, archive, delete.
- Edit Profile modal: shared between any user (self-edit name) and admin (full edit). Replaces the `window.alert` stub in `ProfileMenu.jsx`.
- Categories editor: edit `app_config.categories[]`.
- Departments editor: edit `app_config.departments[]`.
- Custom Fields builder: define `app_config.custom_fields[]`, render them in `TicketForm`, store values in `tickets.custom_data`.
- System Logs viewer: paginated table of `system_logs`, filterable by action type and date.
- `logAction(...)` helper wired into mutation services across the app.

### DB changes

`supabase/migrations/0006_admin_log_helper.sql`:

```sql
-- A small helper so client code doesn't have to assemble user_name itself.
create or replace function public.log_action(
  action_type text,
  details     text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  select name into uname from public.profiles where id = auth.uid();
  insert into public.system_logs (action_type, details, user_id, user_name)
  values (action_type, details, auth.uid(), uname);
end;
$$;

revoke all on function public.log_action(text, text) from public;
grant execute on function public.log_action(text, text) to authenticated;

-- Tighten the insert policy: only the function (definer) can insert now.
drop policy if exists "system_logs_insert_auth" on public.system_logs;
-- No insert policy for normal users; only SECURITY DEFINER functions can write.
```

No other schema changes. Custom fields live in `app_config.custom_fields` (jsonb), which already exists.

### File structure (new)

```
src/features/admin/
├── components/
│   ├── StaffDirectory.jsx
│   ├── StaffRow.jsx
│   ├── EditProfileModal.jsx       # also imported by features/auth/components/ProfileMenu
│   ├── CategoriesEditor.jsx
│   ├── DepartmentsEditor.jsx
│   ├── CustomFieldsBuilder.jsx
│   ├── CustomFieldRow.jsx
│   ├── SystemLogsView.jsx
│   └── SystemLogRow.jsx
├── hooks/
│   ├── useAppConfig.js            # reads + writes app_config singleton
│   ├── useStaff.js                # all profiles + realtime
│   └── useSystemLogs.js           # paginated logs
├── pages/
│   └── AdminPage.jsx              # tabs: Staff | Categories | Departments | Custom Fields | Logs
└── services/
    ├── adminService.js            # updateProfileAsAdmin, archiveStaff, deleteStaff
    ├── appConfigService.js        # getConfig, updateCategories, updateDepartments, updateCustomFields
    └── systemLogsService.js       # listLogs, exported logAction(actionType, details) -> rpc('log_action', ...)
```

### Router changes (`src/app/router.jsx`)

Replace `AdminPlaceholder` with the real page; nested routes inside `AdminPage` switch tabs via `useSearchParams`:

```jsx
{isAdmin && (
  <Route
    path="/admin/*"
    element={<PageContainer title="System Settings"><AdminPage /></PageContainer>}
  />
)}
```

### Custom fields — data shape

Each entry in `app_config.custom_fields` is:

```js
{
  id: 'crypto.randomUUID()',
  label: 'Affected site',
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox',
  required: false,
  options: ['Lusaka', 'Ndola'],   // only for type='select'
}
```

`TicketForm` (Phase 2) reads `app_config.custom_fields` via `useAppConfig()` and renders one input per field. The form writes to `tickets.custom_data` as `{ [field.id]: value }`. Existing tickets with no value for a new field just render the empty input.

When a field is deleted from the config, leave `custom_data` keys in place — historical tickets keep their data; the UI just stops rendering the field. Don't run a destructive cleanup.

### EditProfileModal — two modes

```jsx
<EditProfileModal mode="self" profile={currentUserProfile} />
<EditProfileModal mode="admin" profile={anyProfile} />   // only mountable when useAuth().isAdmin
```

- `mode="self"`: name only (the Phase 1 DB trigger from `HANDOVER.md` Fix 7 enforces this).
- `mode="admin"`: name, role, status, department.

Update `ProfileMenu.jsx`: remove the `window.alert(...)`, open `<EditProfileModal mode="self" />` instead.

### `logAction()` wiring

Across the app, retroactively add `logAction(...)` to the services modified in earlier phases:

- `ticketsService.createTicket` → `logAction('ticket.create', \`#${ticket_number}\`)`
- `ticketsService.updateTicket` → `logAction('ticket.update', \`#${ticket_number}\`)`
- `ticketsService.deleteTicket` → `logAction('ticket.delete', \`#${ticket_number}\`)`
- `adminService.updateProfileAsAdmin` → `logAction('profile.update', \`${target.email} role=${new.role}\`)`
- `appConfigService.update*` → `logAction('config.update', '<which key>')`
- `authService.signInWithEmail` → `logAction('auth.login', email)` (on success only)

`logAction()` calls the `log_action` rpc; failures are swallowed (audit logging never breaks the user flow).

### Acceptance

- Admin opens `/admin`, sees five tabs.
- Editing a staff member's role from `staff` to `admin` succeeds; that staff member's `useAuth().isAdmin` flips to true within ~1s (realtime on `profiles`).
- A non-admin opening `/admin` is redirected (route isn't mounted for them).
- Adding a new category appears immediately in `TicketForm`'s category dropdown for any open client (realtime on `app_config`).
- Defining a custom field and creating a ticket → the field renders in `TicketForm` and the value persists in `tickets.custom_data`.
- Deleting a custom field → existing tickets keep their `custom_data` values; new tickets don't show the field.
- Every ticket create/update/delete shows up in System Logs with the actor's name.
- Non-admin pasting `insert into system_logs(...)` directly fails (no insert policy for them; only `log_action()` definer can write).

### Out of scope

- Bulk operations on tickets from the admin page (bulk assign, bulk close). Defer.
- Saved searches / shared views. Defer.
- Granular permissions beyond admin/staff (e.g. department-scoped admins). Not planned.
- Org-level branding (logo upload, color theme). Not planned.

---

## After Phase 4

Phase 4 closes the original product scope. Anything beyond is a forward look:

- **Dashboard widgets** — the `/dashboard` route is still a placeholder. Open question: which metrics? (Open tickets by priority, my tickets, average resolution time, top categories, etc.) Needs a separate scoping pass.
- **Email notifications** — Edge Function fan-out from the `notifications` table.
- **SLA tracking** — `tickets` would get a `due_at` column and an overdue indicator.
- **Reporting / exports** — CSV export of tickets and logs.

Don't start any of these without explicit scoping. Stop at end of Phase 4 and check in.
