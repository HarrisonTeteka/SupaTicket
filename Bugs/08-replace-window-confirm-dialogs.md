# Bug 08 — Native `window.confirm` dialogs for destructive actions

## Summary
Four destructive flows used the browser's native `window.confirm()`:

| File | Action |
| --- | --- |
| [src/features/admin/components/StaffDirectory.jsx](../src/features/admin/components/StaffDirectory.jsx) | Delete staff profile |
| [src/features/customers/components/CustomersList.jsx](../src/features/customers/components/CustomersList.jsx) | Delete customer (list row) |
| [src/features/customers/pages/CustomerDetailPage.jsx](../src/features/customers/pages/CustomerDetailPage.jsx) | Delete customer (detail page) |
| [src/features/tickets/components/TicketDetail.jsx](../src/features/tickets/components/TicketDetail.jsx) | Delete ticket |

`window.confirm` is jarring (off-brand, OS-styled, blocks the JS thread),
inconsistent across mobile browsers (some Android browsers show it as a
toast that auto-dismisses), and gives no way to label the buttons or
mark the action as destructive.

## Fix
Built a promise-based confirm dialog that uses the existing `Modal`
and `Button` primitives.

New file: [src/shared/components/ConfirmProvider.jsx](../src/shared/components/ConfirmProvider.jsx)
- Context provider mounted once in [AppShell](../src/app/AppShell.jsx) (outside the role split so portal + staff both inherit it)
- `useConfirm()` hook returns an async `confirm({ title, message, confirmLabel, cancelLabel, danger })` that resolves to `boolean`
- `danger: true` swaps the confirm button to the auburn `danger` variant
- Backdrop click / Escape / Cancel all resolve `false`

## Call site shape

Before:
```js
if (!window.confirm(`Delete ${p.name}? This removes their profile.`)) return;
run(() => deleteStaff(p.id));
```

After:
```js
const confirm = useConfirm();
...
const ok = await confirm({
  title: 'Delete staff profile?',
  message: `Delete ${p.name}? This removes their profile.`,
  confirmLabel: 'Delete',
  danger: true,
});
if (!ok) return;
run(() => deleteStaff(p.id));
```

A bit more verbose, but the dialog now:
- Matches the brand (Poppins, moss-green title, auburn danger button)
- Renders inside a portal so it works on any page
- Closes on backdrop / Escape (same conventions as every other modal in the app)
- Title and confirm-button label can be customised per call

## Wiring
`AppShell` mounts the provider once, between `<AuthGate>` and
`<RoleAwareShell>`, so the dialog stays available across both staff
and portal shells without each shell needing its own copy.

## Verification
- `npm run build` — passes clean.
- `grep window.confirm` — only the docstring mention in `ConfirmProvider.jsx` remains; no live call sites.
- Manual checklist:
  - StaffDirectory → delete a staff row → branded dialog appears
  - CustomersList row delete → branded dialog
  - CustomerDetailPage header delete → branded dialog → navigates to /customers on confirm
  - TicketDetail → trash icon → branded dialog → navigates to /tickets on confirm
  - Cancel / backdrop click / Escape all dismiss without action

## No migration needed
Pure frontend change.
