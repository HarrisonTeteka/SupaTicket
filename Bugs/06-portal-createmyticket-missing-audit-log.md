# Bug 06 — Portal `createMyTicket` skipped the audit log

## Summary
The staff `createTicket` writes an audit entry via `logAction('ticket.create', '#1234')`.
The portal-side `createMyTicket` (the customer-self-service path) did
not. Result: customer-raised tickets appeared in the tickets list but
left no trace in `system_logs`. Admins filtering the log by
`action_type = 'ticket.create'` saw only the tickets agents had raised
on customers' behalf — never the ones customers raised themselves.

## Where
- [src/features/portal/services/portalService.js](../src/features/portal/services/portalService.js)
- For comparison: [src/features/tickets/services/ticketsService.js:66-91](../src/features/tickets/services/ticketsService.js#L66-L91) (staff path)
- Underlying RPC: `log_action()` in `0006_admin_log_helper.sql`

## Before
```js
export async function createMyTicket(input, actor) {
  const row = { ... };
  const { data, error } = await supabase
    .from('tickets')
    .insert(row)
    .select(PORTAL_TICKET_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}
```

## After
```js
import { logAction } from '../../../shared/services/systemLogsService';

export async function createMyTicket(input, actor) {
  const row = { ... };
  const { data, error } = await supabase
    .from('tickets')
    .insert(row)
    .select(PORTAL_TICKET_COLUMNS)
    .single();
  if (error) throw error;
  logAction('ticket.create', `#${data.ticket_number}`);
  return data;
}
```

`logAction` is fire-and-forget by design and swallows errors so a
failure in the audit path can never break the user-facing ticket
creation flow.

## Why the same `action_type` as the staff path
Source (portal vs staff) is already discriminable in the audit row itself:
- `user_id` / `user_name` identify the actor
- The `tickets.creator_role` column stores `customer` / `staff` / `admin`

Using the same `action_type = 'ticket.create'` keeps the admin Logs
filter dropdown short and lets admins see *every* new ticket in one
filter view.

## Verification
- `npm run build` — passes clean.
- Manual: sign in as a customer, raise a ticket from the portal, sign
  in as admin, open Logs tab → entry appears with the customer's name
  as the actor and `#<number>` as details.

## No migration needed
`log_action()` already exists since 0006.
