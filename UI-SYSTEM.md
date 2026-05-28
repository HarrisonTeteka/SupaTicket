# SupaMoto UI System

> **Audience:** another AI agent (likely Claude) tasked with bringing this
> visual language and component vocabulary to a different internal system.
> **Reuse model:** style guide — reimplement the components in the target
> codebase rather than coupling repos.

This document captures every visible decision that defines how
SupaTicket looks and feels: brand identity, design tokens, dark-mode
strategy, component primitives, layout primitives, and recurring
patterns. It is intentionally complete enough to recreate the system
from scratch without reading the source.

---

## 1 · Design intent

SupaTicket is a staff workspace for SupaMoto, a clean-cooking-solutions
company. The visual language is warm and grounded — moss green as the
primary brand, tangerine as the accent for actions and energy, auburn
red for danger. The interface is dense but breathable: small typography
on small surfaces, generous radius, soft shadows, very little chrome
between the user and their data.

Three rules govern every choice:

1. **Brand colour signals affordance**, not decoration. Tangerine =
   "click me", moss = "you're somewhere safe", auburn = "this destroys
   something". Avoid using brand colours as ambient surfaces.
2. **Hierarchy via weight and size**, not via colour saturation.
   Headlines are `font-semibold` (titles) or `font-black` (KPI
   numbers). Body text is `font-normal`. Subdued text is
   `text-fg-secondary` or `text-fg-muted`, never grey-on-grey gradients.
3. **Surfaces are flat with a soft shadow**, not glassmorphic. Rounded
   corners are large (`rounded-2xl` for cards, `rounded-xl` for inputs,
   `rounded-3xl` for modals).

---

## 2 · Stack assumptions

The system is implemented in **React 19 + Vite 8 + Tailwind CSS v4**
(`@tailwindcss/vite` v4.x) and uses **lucide-react** for icons.

If the target system uses Tailwind v3, the `@theme` block and
`@custom-variant` directive below won't work — you'll need to map the
tokens into `tailwind.config.js` instead. The token *names and values*
are what matters; the v4-specific delivery mechanism is not load-bearing.

---

## 3 · Visual tokens

All tokens live as CSS custom properties on `:root` (light) and
`html.dark` (dark). Tailwind utilities expose them via the `@theme`
block, so `bg-brand-accent`, `text-fg`, `border-line-strong`, etc.
flip automatically when the `dark` class is toggled on `<html>`.

### 3.1 Colour

| Token | Light value | Dark value | Role |
| --- | --- | --- | --- |
| `--brand-primary` | `#336021` | `#79bc58` | Moss green — primary brand, headings, "safe" actions |
| `--brand-primary-hover` | `#294c1a` | `#90c86e` | Hover for primary |
| `--brand-accent` | `#f58202` | `#fb9f38` | Tangerine — call-to-action buttons, key highlights |
| `--brand-accent-hover` | `#d97002` | `#f58202` | Hover for accent |
| `--brand-danger` | `#9e2a2b` | `#dc5050` | Auburn — destructive actions, errors |
| `--brand-pending` | `#f9edcc` | `#50411e` | Warm cream — "waiting / pending" state |
| `--app` | `#f5f7f9` | `#111117` | Page background (under all panels) |
| `--surface` | `#ffffff` | `#181921` | Card / modal / panel background |
| `--surface-2` | `#f9fafb` | `#20222c` | Inset background — input fields, hover, badge wells |
| `--line` | `#f3f4f6` | `#262935` | Light divider |
| `--line-strong` | `#e5e7eb` | `#373a47` | Card border, strong divider |
| `--fg` | `#111827` | `#f3f4f6` | Body text |
| `--fg-secondary` | `#6b7280` | `#9ca3af` | De-emphasised text (labels, helper) |
| `--fg-muted` | `#9ca3af` | `#6b7280` | Tertiary text (timestamps, hints) |

**Status / priority / SLA pills** layer brand-neutral tints (sky, amber,
emerald, orange, red, blue) on top of the tokens — see §7 for the maps.

### 3.2 Typography

Single-family system: **Poppins** (Google Fonts; loaded via preconnect
+ stylesheet in `index.html`). Weights used: 400, 500, 600, 700, 800,
900. System fallback stack:

```css
font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system,
  'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

Type roles:

| Use | Class | Notes |
| --- | --- | --- |
| Page title (Topbar) | `text-base sm:text-lg md:text-xl font-semibold` | Brand-primary colour, `capitalize` |
| Card title (uppercase section header) | `text-sm font-semibold text-brand-primary uppercase tracking-wide` | The default widget header |
| KPI number | `text-2xl sm:text-3xl font-black text-brand-primary leading-none` | The only place `font-black` is correct |
| KPI label | `text-[11px] font-bold text-fg-secondary uppercase tracking-wider` | Sits below the number |
| Body | `text-sm text-fg` | Default for paragraphs and list rows |
| Helper / hint | `text-xs text-fg-muted` | Timestamps, sub-labels |
| Form label | `text-xs font-semibold text-fg-muted uppercase tracking-widest` | Above each input |
| Pill / Badge | `text-[10px] font-bold uppercase tracking-wider` | All status/priority/SLA badges |

**Hero gradient** (used on the Dashboard welcome hero) is hand-rolled
because it must render before Tailwind classes resolve — keep the
inline style if you reuse it:

```jsx
style={{ background: 'linear-gradient(135deg, #336021 0%, #264918 60%, #1a3014 100%)' }}
```

### 3.3 Spacing, radius, shadow, motion

| Use | Value |
| --- | --- |
| Card / panel radius | `rounded-2xl` |
| Modal radius | `rounded-3xl` |
| Input / button radius | `rounded-xl` |
| Pill / badge radius | `rounded-full` (Badge component) or `rounded-lg` (icon buttons) |
| Card padding | `p-4 sm:p-5` (compact) · `p-5` (medium) · `p-6` (modal body) |
| Page padding | `p-4 sm:p-6 md:p-8` (set by PageContainer) |
| Gap between widgets in a grid | `gap-6` |
| Soft card shadow | `shadow-md shadow-gray-200/60` |
| Hover lift | `hover:shadow-lg hover:-translate-y-0.5 transition-all` |
| CTA shadow (tangerine) | `shadow-lg shadow-brand-accent/30` |
| Transition default | `transition-all` (the `duration-*` is left at Tailwind default) |
| Sidebar drawer transition | `transition-transform duration-200 ease-out` |

Use `transition-colors` (not `transition-all`) on row hovers in lists,
to avoid heavy animation when many rows transition simultaneously.

---

## 4 · Dark mode

**Strategy:** class-based. Tailwind v4's default `dark:` variant
follows `prefers-color-scheme`; SupaTicket overrides it so a user
toggle in the Topbar can defeat the system preference.

```css
/* in globals.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

The `<html>` element gets `class="dark"` toggled. The
`ThemeToggle` component persists the choice in `localStorage` under
the key `theme`. A small inline script in `index.html` reads
localStorage **before paint** and applies the class — without this,
dark-mode users see a flash of light content on first load.

```html
<script>
  (function () {
    try {
      var pref = localStorage.getItem('theme');
      var dark = pref === 'dark' ||
        (!pref && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) document.documentElement.classList.add('dark');
    } catch (e) { /* ignore */ }
  })();
</script>
```

**Rule:** never hard-code a colour from §3.1. Always use the token
(`bg-surface`, `text-fg`, `border-line-strong`, etc.). The only
hard-coded hex in the codebase is in the welcome-hero gradient above,
because gradients can't bind to CSS variables in Tailwind v4 utilities.

---

## 5 · Component primitives

Each component is implemented with Tailwind classes + a small
class-name merger (`cn(...)`, typically `clsx` under the hood). The
*shape* — variants, props, sizes — is what to reproduce.

### 5.1 Button

`primary` (tangerine, raised), `secondary` (subtle surface-2 fill),
`ghost` (text-only, hovers to a fill), `danger` (auburn, raised).
Sizes: `sm | md | lg` (`md` is default). `loading` swaps the children
for `"Working..."` and disables.

```jsx
<Button variant="primary" size="md" loading={isSaving} onClick={save}>
  <PlusIcon size={14} /> Save
</Button>
```

Class shape:
```
base:    rounded-xl font-bold transition-all inline-flex items-center justify-center gap-2
         disabled:opacity-50 disabled:cursor-not-allowed
primary: bg-brand-accent text-white hover:bg-brand-accent-hover shadow-lg shadow-brand-accent/30
secondary: bg-surface-2 text-brand-primary hover:bg-line-strong
ghost:   bg-transparent text-fg-secondary hover:text-brand-primary hover:bg-surface-2
danger:  bg-brand-danger text-white hover:bg-[#7e2122] shadow-lg shadow-brand-danger/30
sm:      px-3 py-1.5 text-xs
md:      px-4 py-2.5 text-sm
lg:      px-6 py-3 text-sm
```

### 5.2 Input / Textarea

Single component pair with optional `label`, leading `icon`, `error`
text. Field fills with `bg-surface-2`, switches to `bg-surface` on
focus. Border is `border-line-strong`, red on error. Focus ring is
`focus:ring-2 focus:ring-brand-accent`.

```jsx
<Input
  name="email"
  label="Email"
  icon={Mail}
  required
  error={errors.email}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

<Textarea name="description" label="Description" rows={4} />
```

Accessibility: each generates a `useId()` id, links `<label>` via
`htmlFor`, and sets `aria-invalid` + `aria-describedby` on error.

### 5.3 Select

Native `<select>` styled to match Input. Accepts either an `options`
prop (array of strings or `{ value, label }`) or `<option>` children.
Optional `placeholder` renders as a leading empty option.

```jsx
<Select label="Status" name="status" options={['Open', 'Pending']} />
```

### 5.4 Modal

Portal-rendered (`createPortal` to `document.body`), centered, with a
`bg-black/40` backdrop. Sizes: `sm | md | lg | xl` (map to max-width).
Click on backdrop or Escape closes.

**Accessibility (load-bearing):**
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` to the title.
- On open: store `document.activeElement`, focus the dialog container.
- Trap Tab / Shift+Tab inside the dialog.
- On close: restore focus to the previously-focused element.

Header has the title + close X (top-right). Body scrolls
(`overflow-y-auto`, `max-h-[90vh]`). Optional pinned `footer` is a
right-aligned row of buttons (`flex justify-end gap-3`).

### 5.5 Badge

A tiny pill — the building block for status / priority / SLA / role
chips. Pass colour classes via `className`.

```jsx
<Badge className="bg-emerald-100 text-emerald-700">Resolved</Badge>
```

Class shape: `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
tracking-wider`.

### 5.6 EmptyState

Centred placeholder used for empty lists, "not found" screens, and
error states.

```jsx
<EmptyState
  icon={Inbox}
  title="No tickets yet"
  description="Raise your first ticket to get started."
  action={<Button>Raise ticket</Button>}
/>
```

Icon sits in a 56×56 rounded square with `bg-surface-2 text-fg-muted`.
Title is `text-base font-semibold text-brand-primary`. Description is
`text-sm text-fg-secondary` with `max-w-sm`.

### 5.7 StatCard

KPI tile — icon chip + big number + uppercase label. Tones map the
icon chip background:

| Tone | Use |
| --- | --- |
| `tangerine` (default) | Headline / energetic |
| `moss` | Brand-aligned positive |
| `cream` | Pending / waiting |
| `green` | Healthy / on-track |
| `amber` | Warning / at-risk |
| `red` | Danger / breached |
| `gray` | Neutral / total |

```jsx
<StatCard icon={Ticket} label="Open tickets" value={42} tone="tangerine" hint="↑ 3 today" />
```

Number is `text-2xl sm:text-3xl font-black text-brand-primary
leading-none`. Card has the hover-lift transition.

### 5.8 LoadingScreen

Full-screen brand splash for the initial app shell load — soft
gradient background, the SupaMoto logo pulsing, a message line.

```jsx
<LoadingScreen message="Signing you in..." />
```

Gradient: `bg-gradient-to-br from-app via-surface to-brand-pending/40`.

### 5.9 ConfirmProvider + useConfirm

Promise-based replacement for `window.confirm`. Provider mounted once
at the app root; any descendant calls `useConfirm()` to get an
`async confirm({ ... })` that resolves to a `boolean`.

```jsx
const confirm = useConfirm();

const ok = await confirm({
  title: 'Delete customer?',
  message: `Delete ${name}? This unlinks them from any tickets.`,
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  danger: true,
});
if (!ok) return;
```

Implementation: a context that holds dialog state + the pending
resolver. The provider renders a `<Modal size="sm">` with two Buttons
in the footer (secondary cancel + primary/danger confirm). Backdrop /
Escape / cancel resolve `false`. **Never use the browser-native
`window.confirm` anywhere** — it doesn't match the brand, blocks the
JS thread, and behaves inconsistently on mobile browsers.

### 5.10 ThemeToggle

Sun / Moon icon button in the Topbar. Behaviour described in §4.
Reproduce verbatim — the localStorage read in `index.html` and the
React state in the toggle must agree on the same key (`theme`) and
same values (`'light' | 'dark'`).

---

## 6 · Layout primitives

The app is a two-column shell on `md+` viewports and a drawer-based
single-column on `<md`.

### 6.1 AppShell

The composition root:

```
<AuthGate>                       // gates the whole tree on auth
  <ConfirmProvider>              // global confirm dialog
    <RoleAwareShell />           // picks staff vs customer chrome
  </ConfirmProvider>
</AuthGate>
```

`RoleAwareShell` reads the current user and renders `<StaffShell>`
(staff/admin) or `<PortalShell>` (customer). Both shells wrap their
contents in `<MobileNavProvider>` for the drawer.

### 6.2 Sidebar (staff shell)

Fixed left rail, 80px wide on `md+`, full-height moss-green
(`bg-brand-primary`). Icon-only navigation; labels appear in tooltips
(`title=`). Items are 22-24px lucide icons in 12px-padded buttons
(`p-3 rounded-xl`).

Active state: `bg-brand-accent text-white shadow-md shadow-brand-accent/30`.
Inactive: `text-white/60 hover:text-white hover:bg-surface/10`.

The brand mark is at the top — a tangerine-filled flame icon in a
rounded tangerine chip. Settings is pinned to the bottom via
`mt-auto` (admin-only).

On `<md` it becomes a fixed drawer that slides in from the left:
```
fixed md:static inset-y-0 left-0 z-40
transition-transform duration-200 ease-out
isOpen ? 'translate-x-0' : '-translate-x-full'
md:translate-x-0
```

A separate `<MobileNavBackdrop>` (a full-screen `bg-black/40` button)
sits behind the open drawer to capture click-outside-to-close.

### 6.3 Topbar

64px-high (`h-16`) bar above the scrollable content area. Contains
(left to right):

1. Hamburger button — `md:hidden`, opens the mobile sidebar.
2. Page title — `text-base sm:text-lg md:text-xl font-semibold capitalize text-brand-primary`.
3. Admin Mode badge — tangerine-tinted, only shown for admins on `sm+`.
4. Spacer (`flex-1`).
5. Desktop search — inline `<input>` (200-256px wide) with a
   live-results dropdown.
6. Mobile search — icon button that opens a full-width overlay.
7. ThemeToggle.
8. NotificationBell.
9. ProfileMenu.

The search dropdown renders below the input, max-width clamped to the
viewport, with `bg-surface rounded-xl border border-line-strong
shadow-xl`. Each result row has the ticket number (muted), title
(brand-primary, truncate), and a trailing StatusBadge.

### 6.4 PageContainer

Wraps each routed page in `<main id="main-content">` (the skip-link
target), renders the `<Topbar>` + a scrollable content area:

```jsx
<main className="flex-1 flex flex-col min-w-0 overflow-hidden outline-none" tabIndex={-1}>
  <Topbar title={title} />
  <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative">
    {children}
  </div>
</main>
```

On route change it updates `document.title` to `${title} — AppName`
and moves keyboard focus to the main region (so screen-reader /
keyboard users land on the new page, not in `<body>`).

### 6.5 Mobile nav (useMobileNav)

A tiny context exposing `{ isOpen, open, close, toggle }`. Auto-closes
on route change (via `useLocation()`). Locks body scroll while open
(`document.body.style.overflow = 'hidden'`). The hamburger button in
the Topbar calls `open()`; the backdrop and the NavLinks inside the
sidebar call `close()` implicitly via the auto-close.

### 6.6 Skip link

The first interactive element in `<StaffShell>`:

```jsx
<a href="#main-content"
   className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-50
              px-3 py-2 bg-brand-primary text-white rounded-lg">
  Skip to main content
</a>
```

Hidden by default; appears on keyboard focus. Targets the `<main
id="main-content">` rendered by `PageContainer`.

---

## 7 · Patterns

### 7.1 Status / Priority / SLA badges

Pre-bound colour maps, exposed as functions in `tickets.utils.js`.
Reproduce as static maps in the target system. The pill itself is the
generic `Badge` (§5.5).

**Status:**
| Status | Class |
| --- | --- |
| Open | `bg-blue-100 text-blue-700` |
| Pending | `bg-brand-pending text-brand-danger` |
| In Progress | `bg-amber-100 text-amber-700` |
| Overdue | `bg-orange-100 text-orange-700` |
| Escalated | `bg-red-100 text-red-700` |
| Resolved | `bg-emerald-100 text-emerald-700` |
| Closed | `bg-surface-2 text-fg-secondary` |

**Priority:**
| Priority | Class |
| --- | --- |
| Low | `bg-surface-2 text-fg` |
| Medium | `bg-sky-100 text-sky-700` |
| High | `bg-orange-100 text-orange-700` |
| Urgent | `bg-red-100 text-red-700` |

**SLA:**
| State | Class | Label |
| --- | --- | --- |
| `on-track` | `bg-emerald-100 text-emerald-700` | On track |
| `at-risk` | `bg-amber-100 text-amber-700` | At risk |
| `breached` | `bg-brand-danger/15 text-brand-danger` | Breached |
| `done` | `bg-surface-2 text-fg-secondary` | Done |
| `unknown` | `bg-surface-2 text-fg-muted` | No SLA |

### 7.2 Breakdown widget

Reusable shape for "count by enum" dashboards (status, priority, SLA,
agent). Three columns per row: label (fixed-width chip), proportional
bar, count. Rows can link to a filtered list.

```jsx
<div className="bg-surface border border-line-strong rounded-2xl p-5">
  <h3 className="text-sm font-semibold text-brand-primary uppercase tracking-wide mb-4">
    By status
  </h3>
  <div className="space-y-1.5">
    {rows.map(({ id, label, count, badge }) => (
      <Link key={id} to={`/items?status=${id}`}
            className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 hover:bg-surface-2">
        <div className="w-24 shrink-0">{badge}</div>
        <div className="flex-1 h-2.5 bg-surface-2 rounded-full overflow-hidden">
          <div className="h-full bg-brand-primary rounded-full"
               style={{ width: `${(count / max) * 100}%` }} />
        </div>
        <span className="w-8 text-right text-sm font-bold text-brand-primary">{count}</span>
      </Link>
    ))}
  </div>
</div>
```

Bar fill is always `bg-brand-primary` for breakdowns of normal data.
Use `bg-amber-400` for the "unassigned" bucket in the per-agent
breakdown to draw the eye to unowned work.

### 7.3 KPI grid

Top-of-dashboard row of 4–8 `StatCard`s. Layout:
`grid grid-cols-2 md:grid-cols-4 gap-4`. Vary the `tone` prop to keep
the row from feeling monotone — a typical pattern is
`moss → tangerine → cream → green` for the main quartet, alternating
warm/cool tones across the row.

### 7.4 Skeleton loaders

Use animated pulsing blocks that match the eventual surface dimensions:

```jsx
<div className="h-24 bg-surface border border-line-strong rounded-2xl animate-pulse" />
```

For KPI grids, render 8 skeletons in the same grid. For lists, render
3 staggered-height pulses. Avoid spinners except on submit buttons
(see Button's `loading` prop).

### 7.5 Page hero (welcome banner)

Used on the staff Dashboard. A deep moss-green gradient panel with a
small uppercase eyebrow, a friendly headline, and a logo decoration
bleeding off the right edge.

```jsx
<div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 md:p-7
                shadow-xl shadow-brand-primary/20"
     style={{ background: 'linear-gradient(135deg, #336021 0%, #264918 60%, #1a3014 100%)' }}>
  <div className="relative z-10">
    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-1.5 sm:mb-2"
       style={{ color: 'rgba(255,255,255,0.7)' }}>
      Brand · Product
    </p>
    <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold"
        style={{ color: '#ffffff' }}>
      Welcome back, {firstName}.
    </h1>
    <p className="text-xs sm:text-sm mt-1.5 sm:mt-2"
       style={{ color: 'rgba(255,255,255,0.85)' }}>
      Subline goes here.
    </p>
  </div>
  <img src="/logo-white.svg" alt="" aria-hidden="true"
       className="absolute -right-4 -bottom-6 h-24 sm:h-32 md:h-36 pointer-events-none select-none"
       style={{ opacity: 0.15 }} />
</div>
```

Inline styles on the gradient + logo opacity are deliberate — they
must render even before Tailwind has resolved its utilities (avoids
a flash of unstyled content on first paint).

### 7.6 Confirm-before-destruction flow

Every destructive action (delete, archive, force-resolve) goes through
`useConfirm`. The standard shape:

```jsx
const handleDelete = async () => {
  const ok = await confirm({
    title: 'Delete X?',
    message: `Delete ${name}? <explain side effects>.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!ok) return;
  try {
    await deleteThing(id);
  } catch (err) {
    setError(err.message || 'Delete failed.');
  }
};
```

Errors render inline above the affected region in
`p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl`.

### 7.7 Card / panel

The base surface for everything that isn't a button:

```
bg-surface border border-line-strong rounded-2xl p-5
```

Add `shadow-md shadow-gray-200/60` for elevated KPI cards (with
hover-lift). Plain cards have no shadow.

---

## 8 · Accessibility checklist

Non-negotiable items the target system must honour:

- [ ] Skip link as the first focusable element in the shell, targeting
      the `<main>` region.
- [ ] Every `<main>` has `id="main-content"` and `tabIndex={-1}` so
      route changes can move focus to it.
- [ ] Modals: `role="dialog"`, `aria-modal="true"`,
      `aria-labelledby` pointing at the visible title, focus trap,
      Escape closes, focus restoration on close.
- [ ] Form inputs: explicit `<label htmlFor>` (or `aria-label`),
      `aria-invalid` and `aria-describedby` on error.
- [ ] Decorative images: `alt=""` + `aria-hidden="true"`.
- [ ] Icon-only buttons: `aria-label` describing the action.
- [ ] Theme toggle: `aria-pressed` reflects the active mode.
- [ ] No reliance on colour alone for status — every status has a
      label and a colour.
- [ ] Touch targets ≥ 36×36px (use `p-2` or larger on icon buttons).

---

## 9 · Reimplementation checklist

Bootstrapping the system in a target React + Tailwind app:

1. **Install Tailwind v4** (`@tailwindcss/vite` if using Vite). If
   v3, set up the equivalent `tailwind.config.js` theme block with
   the colour tokens from §3.1.
2. **Import the design tokens** — copy §3.1 / §4 into `globals.css`.
3. **Wire Poppins** — preconnect + stylesheet in `index.html`, plus
   the dark-mode inline script.
4. **Build the primitives in this order:** `Badge` → `Button` →
   `Input`/`Textarea` → `Select` → `Modal` → `EmptyState` → `StatCard` →
   `LoadingScreen` → `ConfirmProvider` → `ThemeToggle`. Each later
   primitive depends on the earlier ones.
5. **Build the layout:** `useMobileNav` → `Sidebar` → `Topbar` →
   `PageContainer` → `AppShell` (with the provider chain from §6.1).
6. **Verify dark mode round-trip:** toggle the theme, refresh the
   page, confirm no flash of light content. If there is, the inline
   script in `index.html` is wrong.
7. **Add the patterns as you need them** — start with KPI cards and
   the breakdown widget; add badges as new enums appear in the domain.

---

## 10 · What this system deliberately does NOT include

- **No bespoke design system library** (no Radix, no Headless UI, no
  shadcn). Components are written directly with Tailwind classes.
  This is the right trade-off for an internal app of this size; if
  the target system needs more complex patterns (combobox, tooltip,
  popover with collision detection), reach for Radix primitives and
  re-style them with the tokens from §3.
- **No animation library.** Transitions are CSS-only. If you need
  motion design, add `framer-motion` deliberately rather than as a
  drive-by dependency.
- **No grid system.** Layouts use Tailwind's `grid` utilities
  directly — usually `grid-cols-1 lg:grid-cols-2 gap-6` for two-up
  dashboards, `grid-cols-2 md:grid-cols-4` for KPI grids.
- **No typography library.** Heading sizes are not consistent across
  the app (intentional — KPI numbers want to be much bigger than
  section titles). Use the table in §3.2 as the source of truth.
- **No table library.** Lists are plain `<table>` elements styled
  with Tailwind — `bg-surface-2` heads, `border-t border-line` rows,
  `hover:bg-surface-2/50` hover. Pagination is built per-page where
  needed (see e.g. `useTickets.js` in the source for a server-side
  pagination hook).

---

## 11 · When you (the agent) get stuck

If you encounter a UI need this doc doesn't cover:

1. **Default to the closest existing primitive.** A new "card" is a
   `bg-surface border border-line-strong rounded-2xl p-5` div. A new
   "pill" is a `Badge`.
2. **Reach for the tokens from §3, never raw hex.** If you need a
   shade not in §3.1, layer Tailwind's neutral palette (`gray-*`) for
   illustrative content, or extend the token table — don't sprinkle
   one-off colours.
3. **Test in both themes.** If your component looks fine in light
   but unreadable in dark, you've hard-coded a colour somewhere.
4. **Document any new pattern back into this file**, so the next
   agent has the same reference.
