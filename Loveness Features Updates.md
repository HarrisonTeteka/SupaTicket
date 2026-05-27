# Loveness Features Updates

A single working session on the `LovenessUpdates` branch produced four pieces of
work, in order:

1. **Bug fix** — repaired the blank-app regression caused by an unresolved
   merge in Phase 12.
2. **Accessibility** — full a11y pass across modals, forms, app shell,
   toasts, and tables.
3. **Dark mode** — class-based theming via Tailwind v4 design tokens, with a
   user-facing toggle.
4. **Mobile responsiveness** — form grids stack on phones, tables hide
   non-essential columns and stay horizontally scrollable, stat cards tighten.

The whole session is one commit on `LovenessUpdates`. Harrison merges to `main`.

---

## 1. Bug fix — blank app on first run after Phase 12 push

### What was broken

After Phase 12 was pushed to `LovenessUpdates`, the app rendered a blank screen
on launch and Vite logged four parse errors:

- `src/app/router.jsx` had **both** an eager `import DashboardPage from …`
  *and* a `const DashboardPage = lazy(() => import(…))` for `DashboardPage`,
  `TicketsPage`, `TicketDetailPage`, and `AdminPage` — duplicate declarations
  the parser rejected. The router also had duplicate `<Route path="/dashboard">`
  definitions.
- `src/features/admin/pages/AdminPage.jsx` still contained raw
  `<<<<<<< Updated upstream` and `>>>>>>> Stashed changes` conflict markers,
  two `TABS` arrays (one unterminated), eager + lazy duplicate imports, and
  duplicate render blocks for every tab.

### Why it happened

The merge that brought Phase 12 into `LovenessUpdates` kept both sides of the
conflict in those two files. A previous fix (`47bc3e1 fix: resolve PR #2 merge
— pick lazy/Suspense path, drop duplicate declarations`) had already resolved
the same pattern; the Phase 12 push reintroduced it.

### What changed

- [src/app/router.jsx](src/app/router.jsx) — restored to lazy-only routing.
  Removed eager imports, removed duplicate `PageContainer`-wrapped routes,
  kept the `<LazyRoute>` + `<Suspense>` pattern. Added the new `customers`
  and `customers/:id` lazy routes.
- [src/features/admin/pages/AdminPage.jsx](src/features/admin/pages/AdminPage.jsx) —
  rewrote to a single coherent file: lazy imports for every tab,
  one `TABS` array, the new **Roles** tab integrated (Shield icon, lazy-loaded
  from `../../roles/components/RolesEditor`), conflict markers and duplicate
  render blocks removed.

---

## 2. Accessibility

### Modal — `src/shared/components/Modal.jsx`

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` linked to the visible
  `<h2>` title via a `useId()`-generated id.
- Tab / Shift+Tab focus trap inside the dialog (small custom hook, no library
  dependency).
- Focus moves into the dialog on open; focus restores to the element that
  opened it on close, so keyboard users don't get dumped back to `<body>`.
- Escape and backdrop click already closed the dialog — preserved.

### Forms

Shared input primitives now plumb the correct ARIA states whenever a parent
passes `required` or `error`:

- [src/shared/components/Input.jsx](src/shared/components/Input.jsx) —
  `aria-required`, `aria-invalid`, `aria-describedby` pointing to a stable
  error-message id. Applies to both `<Input>` and `<Textarea>`.
- [src/shared/components/Select.jsx](src/shared/components/Select.jsx) —
  same plumbing.
- [src/features/auth/components/AuthGate.jsx](src/features/auth/components/AuthGate.jsx) —
  the sign-in screen's `Field` wrapper used `<label>` elements with **no**
  `htmlFor`, so screen readers couldn't associate the label with the input.
  Fixed via `useId()` + `cloneElement` to inject a generated id onto the child
  input and set `htmlFor` on the label. Form-level error and success messages
  now have `role="alert"` and `role="status"` respectively.

### App shell — skip link, route-change focus, per-route titles

- [src/app/AppShell.jsx](src/app/AppShell.jsx) — added a visually-hidden
  "Skip to main content" link that becomes visible on focus, in both
  `StaffShell` and `PortalShell`. Targets `#main-content` on the next `<main>`.
- [src/app/layout/PageContainer.jsx](src/app/layout/PageContainer.jsx) — the
  per-route `<main>` is now the skip target (`id="main-content"`, `tabIndex={-1}`).
  On every route change a `useEffect` sets `document.title` from the route's
  `title` prop and moves keyboard focus to the main region.
- [src/features/portal/components/PortalLayout.jsx](src/features/portal/components/PortalLayout.jsx) —
  same treatment for the customer portal, with a `portalTitleFor(pathname)`
  helper to infer titles from the URL (since portal routes don't pass a
  `title` prop).

### Toast live region — `src/app/Providers.jsx`

The toast component previously rendered nothing when there was no message,
which meant screen readers had nothing to subscribe to. The host is now a
persistent `role="status" aria-live="polite" aria-atomic="true"` container
that exists in the DOM at all times; toast messages render inside it
conditionally, so each new message triggers an announcement.

### Tables — `scope="col"`

Added `scope="col"` to every column header in:

- `src/features/admin/components/StaffDirectory.jsx`
- `src/features/customers/components/CustomersList.jsx`
- `src/features/admin/components/SystemLogsView.jsx`
- `src/features/roles/components/RolesEditor.jsx`
- `src/features/customers/components/CustomerImportModal.jsx`

---

## 3. Dark mode

### Approach

**Class-based**, via Tailwind v4 design tokens. The user-facing toggle adds
`class="dark"` to `<html>`; every utility resolves through CSS variables that
flip per theme.

### Tokens — `src/styles/globals.css`

The active Tailwind v4 entry. The previous file defined a handful of unused
`@theme` tokens (`brand-tangerine`, `brand-moss`, etc.) but the codebase used
arbitrary hex literals like `bg-[#336021]` everywhere. Rewrote the entry as:

- **Raw color values** in `:root` (light) and `html.dark` (dark) for:
  - `--brand-primary`, `--brand-primary-hover` (the moss green)
  - `--brand-accent`, `--brand-accent-hover` (the tangerine)
  - `--brand-danger` (auburn), `--brand-pending` (cream)
  - `--app`, `--surface`, `--surface-2` (page bg and card surfaces)
  - `--line`, `--line-strong` (soft and strong borders)
  - `--fg`, `--fg-secondary`, `--fg-muted` (body / secondary / muted text)
- A `@theme` block that maps each `--color-*` to `var(--token)`, so the
  generated utilities (`bg-brand-accent`, `text-fg`, `border-line-strong`, …)
  resolve through the CSS variables at runtime. Alpha modifiers like
  `bg-brand-accent/30` keep working via Tailwind v4's `color-mix()` support.
- A `@custom-variant dark (&:where(.dark, .dark *))` rule so the `dark:`
  variant follows the toggle class instead of `prefers-color-scheme`. The
  `:where()` keeps specificity at 0.

### Sweep — replace bare hex literals with tokens

Two mechanical passes via PowerShell with safe UTF-8 (no BOM) writes:

- **Brand hexes (51 files, 134 occurrences):**
  `[#336021]`/`[#F58202]`/`[#d97002]`/`[#9E2A2B]`/`[#F9EDCC]`/`[#f5f7f9]`
  → `brand-primary`/`brand-accent`/`brand-accent-hover`/`brand-danger`/
  `brand-pending`/`app`.
- **Surfaces, text, borders (66 files, ~380 occurrences):**
  `bg-white`/`bg-gray-50`/`bg-gray-100` → `bg-surface`/`bg-surface-2`;
  `border-gray-100`/`border-gray-200`/`border-gray-300` →
  `border-line`/`border-line-strong`;
  `text-gray-900..600` → `text-fg`;
  `text-gray-500` → `text-fg-secondary`;
  `text-gray-400`/`text-gray-300` → `text-fg-muted`;
  gradient stops `from-white`/`via-white`/`to-white` → `from-surface`/`via-surface`/`to-surface`.

A few intentional dark-on-both-themes elements (toast pill in `Providers.jsx`,
the white text on colored buttons) were left as-is.

### Toggle UI

- New [src/shared/components/ThemeToggle.jsx](src/shared/components/ThemeToggle.jsx).
  Reads from `localStorage.theme` or falls back to `prefers-color-scheme`,
  applies `class="dark"` to `<html>`, persists the choice. Renders a button
  with `aria-label` / `aria-pressed` swapping the Moon and Sun icons.
- Wired into both [Topbar](src/app/layout/Topbar.jsx) and
  [PortalLayout](src/features/portal/components/PortalLayout.jsx) next to the
  notification bell.
- **FOUT prevention** — an inline `<script>` in [index.html](index.html) runs
  synchronously before paint, applies the persisted (or system) theme class
  to `<html>` so dark-mode users don't see a flash of light content on first
  load.

### One pitfall to know about

There's a legacy `tailwind.config.js` at the repo root from the v3 era.
Tailwind v4 ignores it — the only thing it controlled was the `content` glob
(which v4 picks up automatically). It's been reverted to the trivial scaffold
state. Don't add v3-syntax config there; put all theme work in `globals.css`.

`src/index.css` is also unused — `main.jsx` imports `src/styles/globals.css`
instead. Leave it alone.

---

## 4. Mobile responsiveness

### Form grids — stack on phones

Six places used `grid grid-cols-2` for paired fields without a smaller-screen
breakpoint, so on a 320–375px screen the two columns crammed to ~140px each.
Changed to `grid grid-cols-1 sm:grid-cols-2` in:

- [TicketForm.jsx](src/features/tickets/components/TicketForm.jsx) — Category + Priority
- [PortalNewTicketPage.jsx](src/features/portal/pages/PortalNewTicketPage.jsx) — Category + Priority (portal version)
- [EditProfileModal.jsx](src/features/admin/components/EditProfileModal.jsx) — Role + Status
- [CustomerEditModal.jsx](src/features/customers/components/CustomerEditModal.jsx) — four sections (external_id + name, email + phone, city + state, postal + country)
- [CustomFieldsBuilder.jsx](src/features/admin/components/CustomFieldsBuilder.jsx) — Type + required-checkbox
- [TicketDetail.jsx](src/features/tickets/components/TicketDetail.jsx) — custom-field `<dl>` grid

### Tables — hybrid (hide + scroll)

All four staff-side tables had `overflow-hidden` on the wrapper, so they
literally fell off the right edge of a 375px viewport with no scrollbar. Two
changes per table:

1. Wrapper changed from `overflow-hidden` to `overflow-x-auto`, so power users
   can still horizontally scroll to see hidden columns.
2. Non-essential columns hidden at narrow breakpoints via
   `hidden sm:table-cell` / `hidden md:table-cell` on both the `<th>` and the
   corresponding `<td>` (in some cases that meant editing the Row component
   too).

| Table | `<sm` shows | `sm:` adds | `md:` adds |
|-------|-------------|------------|------------|
| StaffDirectory | Name, Status, Actions | + Role | + Department |
| CustomersList | Customer, Actions | + External ID | + Contact, Location |
| SystemLogsView | Action, Details | + When | + By |
| RolesEditor | Role, Permissions, Actions | + Type | — |

Files: `StaffDirectory.jsx`, `StaffRow.jsx`, `CustomersList.jsx`,
`SystemLogsView.jsx`, `SystemLogRow.jsx`, `RolesEditor.jsx`.

### Reports + stats

- [LogExportPanel.jsx](src/features/reports/components/LogExportPanel.jsx) —
  the three filter controls (Action type, Since, Before) were a fixed
  `grid-cols-3`, giving each control ~100px on mobile. Changed to
  `grid grid-cols-1 sm:grid-cols-3` so they stack on phones.
- [StatCard.jsx](src/shared/components/StatCard.jsx) — the 8-card dashboard
  KPI grid runs 2-wide on mobile, leaving ~160px per card. Tightened the card
  at narrow widths: `p-4 sm:p-5`, `gap-3 sm:gap-4`, smaller icon chip
  (`w-10 h-10` → `sm:w-12 sm:h-12`, smaller icon glyph), and the big value
  drops from `text-3xl` to `text-2xl` so 4-digit numbers don't overflow.

### What was already responsive (no work needed)

- App shell mobile nav (Sidebar slide-in, Topbar hamburger)
- Modal sizing
- TicketRow (already hides non-essential columns at `<sm`/`<md`)
- TicketFilters (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`)
- Dashboard top-level widget grid (`grid-cols-1 lg:grid-cols-2`)
- TicketDetail main + sidebar split (`grid-cols-1 lg:grid-cols-3`)
- PortalLayout header (responsive paddings, hidden labels)

---

## How to verify locally

1. `npm run dev` — should boot at `http://localhost:5173/` with no parse errors.
2. Toggle dark mode via the Moon/Sun icon top-right. Refresh — the choice
   persists; the page does not flash light before going dark.
3. Open Chrome DevTools → Toggle device toolbar → **iPhone SE (375×667)**.
   Click through:
   - **Admin → Staff / Customers / Roles / Logs** — primary columns visible,
     horizontal scrollbar appears below the table for the hidden columns.
   - **New ticket / Edit customer / Edit profile** modals — paired fields
     stack vertically.
   - **Dashboard** — 8 stat cards in 2×4, no text overflow, values readable.
   - **Reports → Logs** — filters stack vertically.
4. Keyboard test: load the page, press Tab. The "Skip to main content" link
   appears as the first focusable. Press Enter — focus moves into the page
   content. Open any modal, press Tab — focus is trapped inside. Press Esc —
   focus returns to the element that opened it.
5. `npx vite build` — clean build, ~1s, one pre-existing 500 kB chunk warning
   that is unrelated to this work.

---

## Commit

One commit on `LovenessUpdates`, pushed to origin for Harrison to merge into
`main`. Commit message:

```
feat(ui): accessibility pass, class-based dark mode, mobile responsive layouts

Accessibility:
- Modal: role=dialog + aria-modal + aria-labelledby, Tab focus trap,
  focus restore to trigger on close
- Forms: aria-required/invalid/describedby in shared Input/Select/Textarea;
  fix AuthGate Field label association via cloneElement+useId;
  role=alert/status on form-level messages
- App shell: skip-to-main link, route-change focus + document.title in
  PageContainer (staff) and PortalLayout (portal)
- Toast: persistent role=status / aria-live="polite" region
- Tables: scope="col" headers in CustomersList, StaffDirectory,
  SystemLogsView, RolesEditor, CustomerImportModal

Dark mode (Tailwind v4):
- Brand/surface/fg/line tokens as CSS vars in :root and html.dark,
  exposed via @theme in globals.css
- @custom-variant dark (&:where(.dark, .dark *)) for class strategy
- Swept ~134 brand-hex literals and ~380 gray/white sites to tokens
- ThemeToggle in Topbar + PortalLayout, persisted to localStorage,
  prefers-color-scheme honoured on first load
- Inline script in index.html applies theme before paint (no FOUT)

Mobile responsive:
- Form grids: grid-cols-2 -> grid-cols-1 sm:grid-cols-2 across
  TicketForm, PortalNewTicketPage, EditProfileModal,
  CustomerEditModal, CustomFieldsBuilder, TicketDetail
- Tables: overflow-x-auto + hide non-essential columns at <sm/<md
- LogExportPanel: 3-column filter row stacks on mobile
- StatCard: smaller icon/padding/font at <sm
```

---

## Files touched

Around 75 files in total. A rough breakdown:

- **2 files** for the merge regression fix (router.jsx, AdminPage.jsx).
- **~10 files** for a11y-only changes (Modal, Input, Select, AuthGate,
  AppShell, PageContainer, PortalLayout, Providers, plus `scope="col"` on
  table components).
- **~70 files** swept for color tokens (the dark-mode migration). Many
  overlap with the a11y and responsiveness sets.
- **14 files** for responsiveness (form grids, tables, row components,
  LogExportPanel, StatCard).
- **2 new files:** `src/shared/components/ThemeToggle.jsx`, and the inline
  FOUT script lives in `index.html`.
- **2 config files:** `src/styles/globals.css` rewritten with the token
  system; `tailwind.config.js` reverted to scaffold (Tailwind v4 ignores it).
