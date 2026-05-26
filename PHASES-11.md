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
