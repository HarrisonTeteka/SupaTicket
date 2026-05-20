# SupaTicket — Repo State & Reconciliation

> Written 2026-05-20 after reconciling `HANDOVER.md` / `PHASES.md` against the
> actual local repo. **The local repo is the source of truth** (decision on
> record). The handover docs were written against an earlier, cleaner snapshot
> ("the web version") and are partly stale — see below.

## Handover fixes — actual status

`npm run build` **succeeds** on this repo, so HANDOVER.md's "build is blocked"
premise does not apply here. Of its 9 fixes:

- Fixes 1, 2, 4, 5, 6 — already done (`vite.config.js`, `tailwind.config.js`,
  `eslint.config.js`, `.gitignore` exist; `useToast` is already `.jsx`; no junk
  files present).
- Fix 3 (`postcss.config.js`) — **deliberately not applied.** This repo uses the
  Tailwind v4 `@tailwindcss/vite` plugin (see `vite.config.js`), not the v3 +
  PostCSS pipeline the handover assumed. Adding a `postcss.config.js` with
  `tailwindcss: {}` would break the working build.
- Fix 7 + Fix 8 (RLS hardening) — **applied directly in the Supabase SQL Editor**
  by the user. The migration SQL was not committed to the repo (see gap below).
- Fix 9 (`useUserProfile` realtime refetch) — **done** in
  `src/features/auth/hooks/useUserProfile.js`.

## Tooling / dependency drift

- `package.json` declares Vite `^5.4.8`; the installed/running version is **8.x**.
- `package.json` lists `tailwindcss@3` + `postcss` + `autoprefixer`, but the
  build runs on the Tailwind v4 `@tailwindcss/vite` plugin. `package.json` is out
  of sync with `node_modules` — worth a cleanup pass.

## Migration files not in the repo

There is **no `supabase/` folder**. `0001_init.sql` (the schema) and the Fix 7/8
SQL exist only inside the Supabase project, not in version control. Recommend
exporting both into `supabase/migrations/` for traceability before Phase 2.

## Live app structure (reachable from `main.jsx`)

```
main.jsx → app/Providers.jsx → app/AppShell.jsx → AuthGate → Sidebar + router.jsx
```

`router.jsx` currently renders **placeholders** for `/dashboard`, `/tickets`,
`/admin/*` — expected for end-of-Phase-1.

## Dead code — KEEP for now, do not import (decision: keep + document)

These files are committed but **unreachable** from `main.jsx` (a leftover
parallel structure from the `582c276` "Vertical Design Foundation" commit):

| File | Why it's dead | Live equivalent |
|---|---|---|
| `src/app/App.jsx` | Not imported anywhere; has broken imports | `app/AppShell.jsx` |
| `src/app/providers/AppProviders.jsx` | Only used by dead `App.jsx` | `app/Providers.jsx` |
| `src/app/layout/AppShell.jsx` | Not imported anywhere | `app/AppShell.jsx` |
| `src/app/layout/PageContent.jsx` | Not imported anywhere | `app/layout/PageContainer.jsx` |
| `src/index.css`, `src/App.css` | Vite template leftovers, no importers | `src/styles/globals.css` |
| `src/assets/react.svg`, `src/assets/vite.svg` | Vite template leftovers | — |

Empty stub files: `src/shared/utils/constants.js`,
`src/features/tickets/services/ticketService.js`.

## Unwired feature scaffolds (NOT dead — future phases)

`src/features/{tickets,comments,dashboard,users,settings,notifications}/` contain
~80 scaffold/stub files from the same commit. They are not wired into the router
yet and will be built out in Phases 2–4.

**Naming conflict with `PHASES.md`:** the existing scaffold uses different
filenames than `PHASES.md` specifies (e.g. repo has `TicketTable.jsx`,
`TicketFormModal.jsx`; `PHASES.md` Phase 2 asks for `TicketList.jsx`,
`NewTicketModal.jsx`). Reconcile the naming when Phase 2 starts — decide whether
to follow `PHASES.md` or adapt it to the existing scaffold.
