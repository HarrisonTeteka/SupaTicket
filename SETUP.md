# SupaTicket – Phase 1 Setup

This is the foundation phase: Supabase wiring, schema, auth, and a minimal app shell. After this works end-to-end (signup → first user becomes admin → signed-in shell renders), we move on to Phase 2 (tickets feature).

## 1. Files in this phase

Copy these into the repo at the paths shown:

```
supabase/migrations/0001_init.sql
SETUP.md
package.json                       (only if your existing one is the Vite default)
.env.example
src/lib/supabase.js
src/app/AppShell.jsx
src/app/router.jsx
src/app/providers.jsx
src/app/layout/Sidebar.jsx
src/app/layout/Topbar.jsx
src/app/layout/PageContainer.jsx
src/features/auth/services/authService.js
src/features/auth/services/auth.utils.js
src/features/auth/hooks/useAuthSession.js
src/features/auth/hooks/useUserProfile.js
src/features/auth/components/AuthGate.jsx
src/features/auth/components/ProfileMenu.jsx
src/shared/components/LoadingScreen.jsx
src/shared/components/Badge.jsx
src/shared/hooks/useToast.js
src/styles/globals.css
```

## 2. Install dependencies

In the repo on your dev machine:

```bash
npm install @supabase/supabase-js react-router-dom lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure Tailwind by replacing `tailwind.config.js` content with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: []
};
```

And make sure `src/styles/globals.css` is imported by `src/main.jsx` (or `index.jsx`):

```js
import './styles/globals.css';
```

## 3. Create your `.env.local`

Copy `.env.example` to `.env.local` and fill in the values from your Supabase project (Settings → API):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Restart `npm run dev` after editing this file — Vite only reads env vars at startup.

## 4. Run the SQL migration

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/migrations/0001_init.sql`.
3. Click **Run**.

You should see "Success. No rows returned." When the migration finishes, verify in **Table Editor** that you have these tables: `profiles`, `tickets`, `comments`, `notifications`, `app_config`, `system_logs`. The `app_config` table should already contain one row with the default categories and departments.

## 5. Authentication settings

In Supabase → **Authentication** → **Providers** → **Email**:

- Enable **Email provider**.
- For dev simplicity: turn **off** "Confirm email" (otherwise the first signup will sit in unconfirmed state and the first-user-admin trigger still fires, but you can't log in until you confirm). Turn it back on for production.

## 6. Run the app

```bash
npm run dev
```

You should see a login screen. Click "Sign up", create the first account — that account automatically becomes the **admin**. Every subsequent signup is **staff**. Admins can change roles from the Staff Directory in Phase 4.

## 7. Sanity checks before moving to Phase 2

- Sign up two accounts in two different browsers (or one normal + one incognito). The first one should have role `admin` in the `profiles` table; the second one should be `staff`. Check by running `select id, name, email, role from profiles;` in the SQL Editor.
- Sign out from the profile menu and confirm you go back to the login screen.
- Sign in again and confirm the sidebar renders.

If all three pass, Phase 1 is done and we move on to Phase 2 (Tickets).

## Common gotchas

- **"Email not confirmed" error on login.** Turn off email confirmation in Supabase Auth settings during development (step 5).
- **Trigger didn't fire / no profile row created.** The trigger only fires for new signups *after* the migration ran. For an existing pre-trigger user, you can manually insert a row: `insert into profiles (id, name, email, role) values ('<uid>', 'Admin', '<email>', 'admin');`
- **RLS blocks everything.** Make sure you're signed in (the `authenticated` role is what the policies grant access to). If you're hitting the API anonymously you'll get empty results, which is correct.
- **Realtime doesn't update.** Check that the migration's final block added the tables to the `supabase_realtime` publication. You can verify in Database → Publications.
