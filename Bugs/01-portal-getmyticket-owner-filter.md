# Bug 01 — `portalService.getMyTicket` had no owner filter

## Summary
`getMyTicket(id)` in the customer portal looked up tickets by primary key
only. It relied entirely on Supabase RLS to enforce ownership. That's a
single-layer defence: if the policy is ever loosened, a role is misassigned,
or the function is invoked with a service-role key, any customer can read
any ticket by id.

## Where
- [src/features/portal/services/portalService.js](../src/features/portal/services/portalService.js)
- [src/features/portal/pages/PortalTicketDetailPage.jsx](../src/features/portal/pages/PortalTicketDetailPage.jsx)

## Before
```js
export async function getMyTicket(id) {
  const { data, error } = await supabase
    .from('tickets')
    .select(PORTAL_TICKET_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
```
Callers passed only the ticket id — never the customer's user id.

## After
```js
export async function getMyTicket(id, userId) {
  if (!userId) throw new Error('getMyTicket requires a userId');
  const { data, error } = await supabase
    .from('tickets')
    .select(PORTAL_TICKET_COLUMNS)
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
```
Owner is now enforced at the application layer too. The explicit
`userId` argument also fails fast if a caller forgets it (instead of
silently degrading to RLS-only).

## Callsite updates
`PortalTicketDetailPage.jsx` calls `getMyTicket` twice (initial load,
realtime reload). Both now pass `profile?.id`, and `profile?.id` was
added to the effect's dependency array so the page re-fetches if the
signed-in user changes.

## Related — flagged, NOT fixed in this bug
`rateMyTicket(id, rating)` in the same file has the same shape (filters
by id only). Currently dead code — `SatisfactionRating.jsx` calls
`updateTicket` from `ticketsService` instead. Either delete `rateMyTicket`
or apply the same owner filter when re-introducing it.

## Verification
`npm run build` — passes clean.
