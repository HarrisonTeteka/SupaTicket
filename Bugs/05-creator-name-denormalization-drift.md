# Bug 05 — `creator_name` / `assignee_name` denormalisation drift

## Summary
`tickets.creator_name` and `tickets.assignee_name` are denormalised
copies of `profiles.name`, stamped at ticket creation and re-stamped
when the assignee changes. They were never updated when the underlying
profile's name changed. Result: if Alice renamed herself, every existing
ticket she owned or was assigned to kept showing her old name across
the dashboard, tickets list, ticket detail, exports, and the portal —
until the row was touched for another reason.

## Where
- DB: [supabase/migrations/0001_init.sql:46,50](../supabase/migrations/0001_init.sql) (where the columns are declared)
- New migration: [supabase/migrations/0018_profiles_name_sync.sql](../supabase/migrations/0018_profiles_name_sync.sql)
- JS write paths already correct: `createTicket`, `updateTicket`, and `TicketForm` all stamp the names on insert/assignment.

## The fix
A SECURITY DEFINER `AFTER UPDATE OF name ON profiles` trigger that
propagates a name change to every live ticket row:

```sql
create or replace function public.profiles_sync_ticket_names()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is not distinct from old.name then
    return new;
  end if;

  update public.tickets
     set creator_name = new.name
   where created_by = new.id
     and creator_name is distinct from new.name;

  update public.tickets
     set assignee_name = new.name
   where assigned_to = new.id
     and assignee_name is distinct from new.name;

  return new;
end $$;

create trigger profiles_sync_ticket_names_aiu
  after update of name on public.profiles
  for each row
  execute function public.profiles_sync_ticket_names();
```

Plus a one-off back-fill at the end of the migration to fix tickets
that had already drifted.

## What is NOT synced — and why
| Column | Decision | Reason |
|---|---|---|
| `tickets.creator_name`   | ✅ synced | live UI value |
| `tickets.assignee_name`  | ✅ synced | live UI value |
| `comments.author_name`   | ❌ left alone | point-in-time: "who wrote this comment when it was written" |
| `system_logs.user_name`  | ❌ left alone | audit trail must preserve who took the action at the time |

If a future requirement demands either of the historical columns track
the live profile name, swap in two more `update ... set ... where ...`
statements in the same trigger function and add a back-fill block.

## Migration
**Must be run** in the Supabase SQL Editor after 0017. Includes the
back-fill — running it twice is harmless (the `is distinct from`
guards skip rows already in sync).

## Verification
- `npm run build` — passes clean (no JS changes needed).
- Manual:
  1. As an admin, open Staff directory and rename a teammate.
  2. Open a ticket they own or are assigned to.
  3. Confirm the new name appears in the row, on the detail page, on
     the dashboard MyTickets/AgentWorkload, and in the portal.
- Audit log + old comments should keep showing the **previous** name —
  by design.
