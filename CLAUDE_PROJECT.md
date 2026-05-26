# SupaTicket — Claude Code Context

Read the global `CLAUDE.md` first (`~/.claude/CLAUDE.md`).
This file adds SupaTicket-specific context on top of those global rules.

---

## What This Project Is

SupaTicket is an internal customer support and ticketing system built for SupaMoto. It replaces Freshdesk. Support agents, field technicians, supervisors, and executives use it to log, track, assign, and resolve customer issues across multiple intake channels — web form, email, WhatsApp, and SMS. The system includes SLA tracking, role-based dashboards, agent collaboration, and an audit trail per ticket. It is a self-hosted, internal tool — SEO and public access are irrelevant.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend framework | React 19 + Vite 8 |
| Language | JavaScript / JSX (TypeScript planned, not yet) |
| Routing | React Router v7 (client-side only) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` |
| Database + Auth | Supabase hosted PostgreSQL (current) → self-hosted PostgreSQL on Ubuntu (Phase 8+) |
| Realtime | Supabase Realtime (current) → Redis Pub/Sub (Phase 8+) |
| Backend API | Not yet — Fastify (Node.js) planned for Phase 8+ |
| Queue | BullMQ on Redis (Phase 8+) |
| Connection pooling | PgBouncer (Phase 8+) |
| Deployment | Self-hosted Ubuntu server + Nginx (not Vercel) |

---

## Feature Structure

```
src/
├── app/                  ← routing, layout chrome, providers
│   ├── router.jsx
│   ├── AppShell.jsx
│   ├── providers.jsx
│   └── layout/           ← Sidebar, Topbar, PageContainer
├── features/
│   ├── auth/             ← login, session, profile, role management
│   ├── tickets/          ← ticket CRUD, list, detail, comments, tags, assignment
│   ├── dashboard/        ← KPI cards, status/priority breakdowns, CSAT average
│   ├── notifications/    ← per-user realtime notification feed
│   └── admin/            ← staff directory, categories, custom fields, system logs
├── shared/               ← reusable UI (Badge, Button, Modal, Toast, StatCard) + hooks
└── lib/
    └── supabase.js       ← single Supabase client instance
```

**Feature module structure — tickets is the reference implementation:**
```
features/tickets/
  components/   ← JSX only, no direct Supabase calls
  hooks/        ← useTickets(), useTicket() — fetch + realtime subscription
  services/     ← ticketsService.js — all Supabase queries, always throw on error
  pages/        ← TicketsPage, TicketDetailPage — thin, compose components
```

---

## Data Model

```
profiles        → id (= auth.users.id), name, email, role (admin|staff),
                  status (active|archived), department, avatar_url
                  First user to sign up becomes admin (DB trigger)

tickets         → id (UUID), ticket_number (6-digit sequence, display only),
                  title, description, status, priority, category, department,
                  tags (text[], GIN-indexed),
                  created_by (profiles), assigned_to (profiles),
                  assignee_name (denormalised), creator_name (denormalised),
                  parent_id (self-ref for sub-tickets),
                  attachments (JSONB), custom_data (JSONB),
                  resolved_at (timestamptz, trigger-set on terminal status),
                  first_response_at (timestamptz, trigger-set on first non-creator comment),
                  satisfaction_rating (int 1–5, nullable — CSAT),
                  created_at, updated_at

comments        → id, ticket_id, author_id (profiles), author_name (denormalised),
                  text, internal (boolean — internal notes show only to staff),
                  created_at

app_config      → singleton (id=1), categories[], departments[],
                  custom_fields (JSONB), sla_rules (JSONB, Phase 7).
                  Admin-write, authenticated-read

system_logs     → id, event, user_id (profiles), metadata (JSONB), created_at.
                  Admin-read only. Audit trail for all significant actions

notifications   → id, user_id (profiles), type, payload (JSONB), read_at, created_at.
                  Per-user realtime feed
```

**Ticket statuses (full set, Phase 6+):**
`Open | Pending | In Progress | Escalated | Resolved | Closed`
Terminal statuses (contribute to KPIs, clear the open backlog): `Resolved | Closed`

---

## Auth Model

```
Unauthenticated  → login screen only, no access to any data
Staff            → create and view tickets, comment, update own tickets
Admin            → full access: all tickets, all settings, system logs,
                   user management, category/department config
```

`useAuth()` returns `{ session, user, profile, isAdmin, setProfile }`.
Auth state always via `useAuth()` from `AuthGate.jsx` — never read `supabase.auth` directly in components.
Role changes propagate via Supabase Realtime — hooks refetch on channel event, never trust `payload.new`.

---

## Environment Variables

```bash
# Supabase — current (Phases 1–7)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Self-hosted PostgreSQL — Phase 8+
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=ticketing_db
# DB_USER=ticketing_user
# DB_PASSWORD=

# Redis — Phase 8+
# REDIS_URL=redis://localhost:6379

# Backend API — Phase 8+
# PORT=3001
# JWT_SECRET=
```

`VITE_` prefix exposes a variable to the browser bundle. Everything else is server-only.
Never put service role keys or DB passwords in the frontend.

---

## Database: Planned Transition to Self-Hosted PostgreSQL

The current database is **Supabase hosted PostgreSQL**. The planned target is a
**self-hosted PostgreSQL instance on an Ubuntu server with PgBouncer** for connection
pooling. This transition is scoped to Phase 8+; Phases 1–7 stay on Supabase.

### Local development setup (when working off Supabase)
- PostgreSQL installed locally
- PgAdmin used for inspection and query verification
- Connection string for local dev:
  `DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=ticketing_db`

### Migration rules — applies now and after the transition
- All schema changes go through `supabase/migrations/` SQL files — numbered sequentially
- **Never make schema changes directly in PgAdmin or the Supabase SQL Editor outside of a migration file**
- Migration files carry forward verbatim to the self-hosted instance; they are the single source of truth for schema history
- Claude Code never auto-generates or deletes migration files — Harrison writes them, Chella reviews

### Current migrations
```
0001_init.sql                          — Phase 1: schema foundation, RLS
0002_profiles_self_update_guard.sql    — Phase 1: RLS hardening
0003_tickets_storage.sql               — Phase 2: tickets table, storage bucket
0004_notifications_function.sql        — Phase 3: notify_user() function
0005_ticket_notification_triggers.sql  — Phase 3: triggers on ticket/comment events
0006_admin_log_helper.sql              — Phase 4: log_action() function
0007_ticket_metrics.sql                — Phase 5: resolved_at, first_response_at, satisfaction_rating + triggers
0008_workflow_depth.sql                — Phase 6: extended statuses, tags[], comments.internal, terminal-state trigger update
```

---

## Service Layer Rules

Services always throw. Callers handle try/catch. Never swallow errors silently.

```js
// correct pattern
export async function listTickets(filters = {}) {
  let query = supabase.from('tickets').select(TICKET_COLUMNS);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.tag)    query = query.contains('tags', [filters.tag]);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
```

Always use explicit column lists — never `select('*')`. The `fts` tsvector column is generated and must be excluded.

---

## Realtime Rules

```js
// correct pattern — always refetch, never trust payload.new
const channel = supabase.channel('tickets:list')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, load)
  .subscribe();
return () => supabase.removeChannel(channel);
```

---

## Git

Claude Code never runs git commands.
Committers: **Chella Kamina** (architecture, planning, config) and **Harrison Teteka** (features, schema).

When a task is complete, state:
- What changed and which files were modified
- Who should commit
- Suggested commit message: `type(scope): short description`

---

## Current State

```
[x] Phase 1 — Auth + shell complete
[x] Phase 2 — Tickets CRUD, comments, attachments, sub-tickets complete
[x] Phase 3 — Notifications + realtime feed complete
[x] Phase 4 — Admin console: staff directory, categories, custom fields, system logs complete
[x] Phase 5 — Dashboards & Metrics: KPI cards, status/priority breakdowns, CSAT, realtime complete
[~] Phase 6 — Ticket Workflow Depth: DB + client substantially done, not yet committed
              Done: extended statuses, tags (TagInput, filter, TicketRow chips),
                    internal notes (CommentForm toggle, CommentList badge),
                    TERMINAL_STATUSES updated to include Closed
              Acceptance verified: tag filter wired end-to-end, CSAT stays Resolved-only (per spec)
[ ] Phase 7 — SLAs & Escalations: not started (depends on Phase 6 commit)
[ ] Phase 8+ — Backend API, self-hosted PostgreSQL, Redis, multi-channel intake
```

---

## Do Not Touch

```
supabase/migrations/    ← never auto-generate, edit, or delete migration files
.env.local              ← never read or write
src/app/App.jsx         ← dead code, leave it
src/app/layout/AppShell.jsx     ← dead code, leave it
src/app/layout/PageContent.jsx  ← dead code, leave it
src/shared/utils/constants.js   ← empty stub, leave it
src/App.css / src/index.css / src/assets/*.svg  ← Vite template leftovers, leave them
```

---

## How Tasks Come In

Tasks arrive from the Claude Projects chat as a filled-in handoff block.
The handoff states what was decided in the chat, which files are relevant, and the specific task.

If no handoff is provided and the task is ambiguous — ask before touching anything.
