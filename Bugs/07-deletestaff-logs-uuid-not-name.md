# Bug 07 — `deleteStaff` audit log entry was a raw UUID

## Summary
When an admin permanently deleted a staff profile, the audit log
recorded the deleted user's UUID as the `details` field:

```
profile.delete   79c8e1a2-9b3d-4d4f-93b4-...   by Alice Johnson
```

By the time anyone reads the log, the profile is gone — so the UUID
can't be cross-referenced back to a name or email. The entry is, in
practice, useless. The pattern was already correct in `deleteTicket`,
which captures the `ticket_number` before deleting and logs `#1234`.

## Where
- [src/features/admin/services/adminService.js](../src/features/admin/services/adminService.js)
- Pattern reference: [src/features/tickets/services/ticketsService.js:118-130](../src/features/tickets/services/ticketsService.js#L118-L130) (`deleteTicket`)

## Before
```js
export async function deleteStaff(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
  logAction('profile.delete', id);
}
```

## After
```js
export async function deleteStaff(id) {
  // Capture name + email first so the audit log entry is readable.
  const { data: existing } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;

  const details = existing
    ? `${existing.name || 'Unnamed'} <${existing.email}>`
    : id;
  logAction('profile.delete', details);
}
```

Audit entries now read:
```
profile.delete   Alice Johnson <alice@example.com>   by Bob (admin)
```

If the pre-delete lookup fails (race, RLS, network blip) we fall back
to the UUID — the delete still happens, and the log entry is no worse
than the pre-fix version.

## Verification
- `npm run build` — passes clean.
- Manual: as admin, delete a non-essential test profile from the Staff
  directory → Logs tab shows the new format.

## No migration needed
`log_action()` already accepts a free-form `details text` argument.
