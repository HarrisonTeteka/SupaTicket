# SupaTicket — Handover to Local Claude Code Agent

> **You are a fresh agent.** Read this entire document before touching any files. Everything you need to do is below: project context, current state, prioritized fixes (with copy-paste-ready content), and verification steps.

---

## 1. Project context

**SupaTicket** is an internal ticketing system for SupaMoto, built on Vite + React + Tailwind + Supabase. It's being delivered in phases:

- **Phase 1 (current — almost done):** Supabase schema, auth, app shell. Acceptance: signup works, first user becomes admin, signed-in shell renders, logout returns to login.
- **Phase 2 (next):** Tickets feature (CRUD, list, detail, comments, assignment).
- **Phase 3:** Notifications + realtime polish.
- **Phase 4:** Admin/settings (staff directory, categories, departments, custom fields, system logs, edit-profile modal).

You are picking up at the **end of Phase 1**. A code review found a handful of issues that block `npm run build` and a couple of RLS holes that need closing before any real data exists in the database. Fix those, verify, then we can move on to Phase 2.

---

## 2. Repo layout (current state)

```
.
├── .env.example
├── HANDOVER.md                 <- you are reading this
├── SETUP.md                    <- Phase 1 setup instructions (already followed by user)
├── index.html
├── package.json
├── supabase/
│   └── migrations/
│       └── 0001_init.sql
└── src/
    ├── main.jsx
    ├── app/
    │   ├── AppShell.jsx
    │   ├── providers.jsx
    │   ├── router.jsx
    │   └── layout/
    │       ├── PageContainer.jsx
    │       ├── Sidebar.jsx
    │       └── Topbar.jsx
    ├── features/
    │   └── auth/
    │       ├── components/
    │       │   ├── AuthGate.jsx
    │       │   └── ProfileMenu.jsx
    │       ├── hooks/
    │       │   ├── useAuthSession.js
    │       │   └── useUserProfile.js
    │       └── services/
    │           ├── auth.utils.js
    │           └── authService.js
    ├── lib/
    │   └── supabase.js
    ├── shared/
    │   ├── components/
    │   │   ├── Badge.jsx
    │   │   └── LoadingScreen.jsx
    │   └── hooks/
    │       └── useToast.js     <- contains JSX, will be renamed (see Fix 5)
    └── styles/
        └── globals.css
```

**Not in the repo yet (these are the build blockers — see Section 4):**
- `vite.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `eslint.config.js`
- `.gitignore`

**Junk files to delete:**
- `zizGwpZ5` — a stray zip archive of duplicated source. Delete it.
- `.DS_Store` — macOS noise; delete and add to `.gitignore`.

`package.json` already declares the right dependencies (React 18, Vite 5, Tailwind 3, Supabase JS 2, react-router-dom 6, lucide-react), so you do **not** need to add any packages.

---

## 3. Conventions to follow

Keep the existing structure. The team intentionally separated concerns:

- **`features/<name>/`** owns its own `components/`, `hooks/`, `services/`. Anything network-touching goes in `services/`; pure helpers go in a sibling `*.utils.js`.
- **`shared/`** is for cross-feature primitives only (Badge, LoadingScreen, toast). Don't dump feature code here.
- **`lib/`** is for third-party client setup (Supabase client lives here; future things like a markdown renderer would too).
- **`app/`** owns layout chrome, routing, and global providers.
- Files that return JSX must be `.jsx`. Files that are pure logic stay `.js`.
- Tailwind is the styling system. The brand colors are hard-coded as `bg-[#12344d]` (navy) and `bg-[#f5f7f9]` (page bg) — don't refactor to CSS vars yet, it's deliberate for Phase 1.
- Routes go through react-router-dom (`BrowserRouter` in `providers.jsx`, `<Routes>` in `router.jsx`).
- Auth state is consumed via `useAuth()` from `src/features/auth/components/AuthGate.jsx`. Don't read Supabase auth directly in feature components.

---

## 4. Fixes to apply (in order)

Work through these in order. Each one is independent enough to commit separately.

### Fix 1 — Add `vite.config.js`

Without this, `@vitejs/plugin-react` is never loaded → no React Fast Refresh, no JSX-in-`.js` support, no React preset.

Create at repo root:

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
```

### Fix 2 — Add `tailwind.config.js`

Without `content`, Tailwind generates zero utility classes and the UI renders unstyled.

Create at repo root:

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

### Fix 3 — Add `postcss.config.js`

Without this, the `@tailwind base/components/utilities` directives in `src/styles/globals.css` are passed through as raw CSS and ignored.

Create at repo root:

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Fix 4 — Add `eslint.config.js`

`package.json` has `"lint": "eslint ."` and ESLint 9 requires flat config or it errors immediately.

Create at repo root:

```js
// eslint.config.js
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '.vite/'],
  },
];
```

You will need to `npm install -D @eslint/js globals` since `eslint-plugin-react` and `eslint-plugin-react-hooks` are already in `package.json` but `@eslint/js` and `globals` aren't.

### Fix 5 — Rename `useToast.js` → `useToast.jsx`

`src/shared/hooks/useToast.js` returns JSX (`<ToastContext.Provider>…`). `@vitejs/plugin-react`'s default include doesn't reliably handle JSX in `.js` files.

```bash
git mv src/shared/hooks/useToast.js src/shared/hooks/useToast.jsx
```

Then check that the import in `src/app/providers.jsx` still resolves. The current import is:

```js
import { ToastProvider, useToast } from '../shared/hooks/useToast';
```

That's extensionless and should keep working, but verify by running `npm run build` after the rename.

### Fix 6 — Add `.gitignore`

Create at repo root:

```
node_modules/
dist/
.vite/

# Env
.env
.env.local
.env.*.local

# OS / editor
.DS_Store
Thumbs.db
.idea/
.vscode/
*.swp

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

Then untrack the existing junk:

```bash
git rm --cached .DS_Store 2>/dev/null || true
rm -f .DS_Store zizGwpZ5
```

### Fix 7 — Close the RLS hole on `profiles` self-update

**This is the most important security fix.** Currently `profiles_update_self` lets a user update their own row including `role`, `status`, and `department`. Any authenticated user with the anon key can self-promote to admin via a direct REST call.

Add a new migration at `supabase/migrations/0002_profiles_self_update_guard.sql`:

```sql
-- Prevent non-admins from changing their own role / status / department.
-- profiles_update_self lets a user update their own row, but a column-level
-- guard is needed because Postgres RLS doesn't support per-column UPDATE
-- policies cleanly.

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admins can change anything.
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  -- Non-admins editing their own row may not change these fields.
  if new.id = auth.uid() then
    if new.role is distinct from old.role then
      raise exception 'You cannot change your own role';
    end if;
    if new.status is distinct from old.status then
      raise exception 'You cannot change your own status';
    end if;
    if new.department is distinct from old.department then
      raise exception 'Only admins can change department';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_self_update on public.profiles;
create trigger profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();
```

The user will need to run this in the Supabase SQL Editor (same way they ran `0001_init.sql`). Mention this in your final message to them.

### Fix 8 — Tighten loose insert policies (same migration)

Append these to `0002_profiles_self_update_guard.sql`:

```sql
-- tickets: prevent creating tickets attributed to another user
drop policy if exists "tickets_insert_auth" on public.tickets;
create policy "tickets_insert_auth" on public.tickets
  for insert to authenticated
  with check (created_by is null or created_by = auth.uid());

-- system_logs: prevent forging audit entries for another user
drop policy if exists "system_logs_insert_auth" on public.system_logs;
create policy "system_logs_insert_auth" on public.system_logs
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());
```

`notifications_insert_auth` is intentionally permissive (so user A can notify user B). Leave it for now; we'll move it to a SECURITY DEFINER `notify_user(...)` function in Phase 3.

### Fix 9 — Re-fetch profile on realtime update

In `src/features/auth/hooks/useUserProfile.js`, the realtime handler does `setProfile(payload.new)` directly. Postgres-changes payloads can have a different shape than the original select (RLS column filtering, partial columns). Re-fetching with the same select is safer.

Edit the realtime `.on(...)` block to refetch instead of trusting `payload.new`:

```js
.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${userId}`,
  },
  async (payload) => {
    if (cancelled) return;
    if (payload.eventType === 'DELETE') {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (!cancelled && data) setProfile(data);
  }
)
```

---

## 5. Verification

After applying Fixes 1–6 and 9 (the local code changes), run:

```bash
npm install
npm install -D @eslint/js globals   # for Fix 4
npm run build                       # must finish without errors
npm run lint                        # should pass (or only show warnings)
npm run dev                         # open http://localhost:5173
```

Smoke test the running app:

1. The login screen renders with Tailwind styling (navy logo block, rounded card). If it looks like unstyled HTML, Tailwind isn't wired — re-check Fixes 2 and 3.
2. Sign up a new account in an incognito window. You should land in the shell with the dark navy sidebar.
3. Click the avatar (top of sidebar) → Sign Out → you go back to login. Sign in again → shell renders.
4. Open the Supabase SQL Editor and run: `select id, name, email, role from profiles;` — the first account you created should be `admin`, the second `staff`.

For Fixes 7 and 8 (RLS), the user must paste `supabase/migrations/0002_profiles_self_update_guard.sql` into the Supabase SQL Editor and run it. After that, verify in the SQL Editor as a non-admin:

```sql
-- as a non-admin user, this should now fail with "You cannot change your own role"
update profiles set role = 'admin' where id = auth.uid();
```

---

## 6. Definition of done for this handover

- `npm run build` exits 0.
- `npm run dev` boots and the login screen is fully styled.
- Signup → login → signout → login round-trip works.
- Migration `0002` has been run successfully against the Supabase project.
- `git status` is clean except for the new config files, new migration, the `useToast.jsx` rename, the `.gitignore`, and the `useUserProfile.js` edit. No `.DS_Store`, no `zizGwpZ5`.

Once those are checked off, Phase 1 is fully done and we can start Phase 2 (Tickets feature) — file layout for that will live under `src/features/tickets/`.

---

## 7. Things explicitly out of scope for you right now

Do not start any of these — they are planned for later phases:

- The Tickets feature (list, detail, create, comments, assignment).
- The Notifications inbox UI or the `notify_user(...)` SECURITY DEFINER function.
- The admin settings pages (staff directory, categories, departments, custom fields, system logs).
- The "Edit Profile" modal — the current `window.alert` placeholder in `ProfileMenu.jsx` is intentional.
- The `/tickets/new` route — the `+` button in `Sidebar.jsx` currently dispatches a `supaticket:new-ticket` window event, which is a Phase 1 stub and will be replaced when the tickets feature lands.

If you finish the nine fixes and have spare context, **stop and report back** rather than starting Phase 2 work. The user wants to review before moving on.

---

## 8. Open questions to surface to the user (only if relevant)

If you hit any of these, ask before guessing:

- If `npm install` fails on a network error: the user is on a corporate network — they may need to retry or check their npm registry config.
- If the Supabase project already has data and Fix 7's migration would lock out the existing admin: don't run it; tell the user and ask whether to seed an explicit admin first.
- If you find that any of the configs in Section 4 already exist on disk but weren't visible in the snapshot above: read them first, don't overwrite blindly. The snapshot reflects state as of the review; the user may have added something between then and your start.
