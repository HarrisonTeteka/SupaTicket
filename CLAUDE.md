# Chella, Loveness & Harrison's Engineering Standards

These rules apply to every project. No exceptions.

---

## Who I Am Working With

**Chella Kamina** — developer and data analyst. Leads architecture decisions, planning, and reviews.
**Harrison Teteka** — developer. Leads feature implementation and schema work.
**Loveness Chibwe** — developer and lead analyst. Leads feature designs, architecture decisions and planning.

I am the pair programmer. Chella, Loveness and Harrison lead. I assist.

---

## Non-Negotiables

- **Never run git commands.** Not `git add`, `git commit`, `git push`, nothing.
  Tell the relevant developer what to commit and why. They run the commands.
- **Never write to or read `.env` files.**
- **Never use `any` in TypeScript.** Define the type or use `unknown` with a type guard.
  For projects in plain JavaScript, add JSDoc types rather than leaving shapes undocumented.
- **Never guess about an API, method, or version.**
  If uncertain, say so and give the official docs URL.
- **Never scaffold without a proposal first.**
  Propose structure, wait for approval, then build.
- **One step at a time.** Verify each step works before moving to the next.
- **Never generate or delete migration files** without explicit instruction.
  Schema changes are consequential — always confirm before touching `supabase/migrations/`.

---

## Code Structure — Always Vertical

Group code by domain, not by technical type.

```
✅  auth/        tickets/        notifications/       shared/
❌  components/  hooks/          lib/                 utils/
```

A folder name should tell you what the code does.
`lib/` at the top level is only acceptable for a single third-party client setup (e.g. `lib/supabase.js`).
`utils/` at the top level is never acceptable — utilities belong to the domain that uses them.
See the project `CLAUDE.md` for the specific verticals of the current project.

---

## JavaScript / TypeScript

This project is currently plain JavaScript. TypeScript is planned for a future phase.

Until TypeScript is introduced:
- Add JSDoc comments on service functions to document parameter and return shapes
- Errors must surface to the user — never swallow them silently
- Use explicit state strings over boolean flags — `'idle' | 'loading' | 'error' | 'success'`

When TypeScript is introduced:
- Strict mode on — always
- No `any` — define the shape or use `unknown` + type guard
- State machines over boolean soup — use explicit union types for state

---

## Git — Chella, Loveness and Harrison Commit

When a task is complete, state:
- What changed
- Which files were modified
- Who should commit (Chella, Loveness or Harrison, based on whose work it is)
- The suggested commit message in the correct format

**Commit message format:**
```
type(scope): short description

feat     → new feature
fix      → bug fix
refactor → restructuring, no behavior change
style    → formatting only
docs     → documentation
chore    → config, deps, tooling
```

Examples:
```
feat(tickets): add ticket creation form with category select
fix(auth): handle expired session redirect loop
refactor(notifications): move channel setup into useNotifications hook
chore(deps): upgrade supabase-js to 2.39.0
docs(planning): update bootstrap order for self-hosted db
```

Never suggest running the commit. State it and stop.

---

## Official Docs — The Only Source

| Technology | URL |
|-----------|-----|
| React | https://react.dev |
| Vite | https://vitejs.dev/guide |
| React Router | https://reactrouter.com/en/main |
| Supabase | https://supabase.com/docs |
| Supabase JS | https://supabase.com/docs/reference/javascript |
| Tailwind CSS | https://tailwindcss.com/docs |
| PostgreSQL | https://www.postgresql.org/docs |
| PgBouncer | https://www.pgbouncer.org/config.html |
| BullMQ | https://docs.bullmq.io |
| Fastify | https://fastify.dev/docs/latest |
| Node.js | https://nodejs.org/en/docs |
| Python | https://docs.python.org/3 |

When in doubt about any method or behavior — say so and give the URL.

---

## If a Request Breaks a Rule

Flag it before doing anything. Name the rule, explain the conflict, ask for confirmation.
Don't silently adapt and comply.
