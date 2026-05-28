# Contributing to SupaTicket

For coding standards (vertical structure, commit message format, banned
practices) see [CLAUDE.md](./CLAUDE.md). This file covers **workflow** —
how the three of us (Chella, Harrison, Loveness) stay in sync and avoid
overwriting each other's work.


---

## Daily coordination

Before you start a work session:

1. **Announce in chat what you're picking up.** Even just "I'm taking
   Bug 03 today" prevents two people opening competing branches for the
   same fix.
2. **`git fetch origin` and look at what changed overnight.** If `main`
   moved, rebase your branch onto it before continuing.
3. **Glance at the migrations folder.** If someone added a new
   `0XXX_*.sql` you didn't know about, you need to renumber yours.

Before you push at end of session:

1. `npm run build` must pass.
2. `git fetch origin && git rebase origin/main` so your branch is on
   the current tip.
3. Push your topic branch (NOT `main` or `dev` directly).
4. Tag the relevant reviewer in the PR.

---

## How we coordinate work in flight

### Claiming work
- Open a GitHub issue, or post in the team chat: "Working on X — branch
  `fix/x` by Harrison".
- One topic per branch. Don't bundle "fix the auth bug AND redesign the
  sidebar" in one branch — they review and revert independently.

### When two people need to touch the same file
- Whoever picks it up second pulls the first person's branch into theirs
  *before* starting (`git merge origin/feat/their-branch`) so they're
  working on top of the latest state, not the old one.
- If you don't know whether your change will collide, ask in chat first.

### Hand-off (when something is ready for review)
- Push the branch.
- Open the PR with: 1-paragraph summary, test plan, list of touched
  migrations (if any).
- Tag the lead (see table above). Don't tag everyone — that's noise.
- Reviewer responds within ~24h or says "I can't get to this today, ask
  someone else."

### Approval + merge
- Approver merges (not the author) so the author can't bypass review by
  ignoring late comments.
- **Never merge a PR that GitHub flags as "out of date with base"** —
  ask the author to rebase first. Merging it anyway is exactly how we
  lost work on PR #2 and PR #4.

---

## Migration coordination

This is where we keep colliding. Two rules:

1. **Reserve the number before writing the migration.** Post in chat:
   "Taking migration `0021` for the customer-segment column" — then
   start writing. If you skip this step and Loveness picks the same
   number for her parallel work, one of you renumbers later under
   merge-conflict pressure (we've done this 3 times so far).

2. **If you find a collision after a merge, rename the newer one.** The
   older migration may already have been applied to a Supabase project
   — renaming it breaks idempotency. Always renumber the unmerged one.

When you ship a migration:
- Note in the PR description: "Run `0021_*.sql` after merging."
- Whoever applies it to the live Supabase project (usually Harrison)
  confirms in chat once it's run.
- If the migration adds a new Edge Function, that gets deployed
  separately via `supabase functions deploy <name>`.

---

## Branches

- `main` — production / stable. Only PRs that pass review + checks land here.
- `dev` — integration / test branch. Combined work from active feature
  branches. The "other dev machine" pulls from `dev`.
- `feat/*`, `fix/*`, `chore/*` — short-lived topic branches.

Both `main` and `dev` should always build cleanly. If you push something
that doesn't build, revert or fix it immediately.

---

## The one rule that prevents disasters

**Always sync with `main` before you push.**

At the start of every work session, and right before you push:

```bash
git fetch origin
git rebase origin/main          # or: git merge origin/main
```

If your branch is more than a day behind `main`, do this before doing
anything else. If you push without syncing, your PR will be based on
stale history — when it gets merged via the GitHub UI, work that landed
on `main` after you branched can silently disappear from the merge.

This has happened to us twice (PR #2, PR #4). Both times it dropped
features other people had just shipped. The fix is **always sync first**.

### What "silently disappear" looks like

Suppose:
- Day 1: you branch `feat/X` off main at commit A.
- Day 2: someone merges PR `feat/Y` to main. Main is now at commit B.
- Day 3: you finish `feat/X`, force-push your branch, open a PR.
- Day 4: PR merged via GitHub UI.

If your branch was never synced with B, the GitHub merge resolution will
keep "your side" of conflicts — which means files `feat/Y` added or
deleted get reverted on `main`. No warning, no error.

The fix on Day 3: `git fetch origin && git rebase origin/main` before
opening the PR. Conflicts surface on your machine where you can fix
them properly, not on GitHub.

---

## Pull requests

1. Branch from latest `main` (or `dev` for integration work).
2. Work in small commits — easier to review and revert.
3. Before opening the PR: `git fetch && git rebase origin/main` + `npm run build`.
4. Open PR `feat/X → main` (or `feat/X → dev`).
5. Resolve any GitHub-reported "out of date" warning by rebasing
   locally and force-pushing your topic branch — never let GitHub
   merge a non-up-to-date PR.
6. Squash or rebase-merge is fine; merge commits are also fine for
   feature branches that have meaningful history.

### What to put in the PR description

- One paragraph: what changed and why.
- A test plan or "how to verify" checklist.
- If the PR touches `supabase/migrations/`: list the migration files
  and confirm whether they've been applied to dev / prod yet.

---

## Migrations

Numbered sequentially in `supabase/migrations/0XXX_description.sql`.

- **Before creating a new migration**: `ls supabase/migrations/` to see
  the highest existing number. Use the next one. Don't reuse numbers.
- **Idempotent**: every migration must be safe to re-run. Use
  `create or replace`, `if not exists`, `drop policy if exists`, etc.
- **Don't renumber other people's migrations.** If you find a collision
  after a merge, rename the *newer* one (yours) to the next free number.

After landing migrations on `main`, apply them in order to the Supabase
project via the SQL editor. Edge Functions are deployed separately via
`supabase functions deploy <name>`.

---

## Bugs

Each substantive bug fix gets a markdown writeup in `Bugs/NN-short-name.md`
explaining what was wrong, the fix, and how to verify. See existing
files there for the format.

---

## When in doubt

- Read [CLAUDE.md](./CLAUDE.md) first.
- Sync with `main` before you push.
- If you're about to do something destructive (force-push, delete a
  branch, rename a migration), say so in the team chat first.
