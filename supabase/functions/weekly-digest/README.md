# weekly-digest

Emails a weekly digest of the prior 7 days to every active admin who has
`email_notifications = true`. Reads the `get_weekly_stats()` SQL function
(added in migration `0013`) for the roll-up, then formats and sends via
Resend.

## Setup

### 1. Env vars

This function shares secrets with `send-notification-email` — if you've
already pushed those, you're done. Otherwise:

```
supabase secrets set --env-file supabase/functions/.env
```

Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`APP_URL`.

### 2. Deploy

```
supabase functions deploy weekly-digest --no-verify-jwt
```

`--no-verify-jwt` because the trigger is a scheduled invocation, not a user
request.

### 3. Schedule (pick one)

**Option A — Supabase Scheduled Functions (Studio UI, recommended):**
Project → Edge Functions → `weekly-digest` → **Add cron schedule** → set
`0 9 * * 1` (Mondays 09:00 in the project's timezone).

**Option B — pg_cron + pg_net:**

```sql
-- Replace EDGE_FUNCTION_URL with the URL from `supabase functions deploy`.
select cron.schedule(
  'weekly_digest_monday_9am',
  '0 9 * * 1',
  $$ select net.http_post(
       url := 'EDGE_FUNCTION_URL',
       headers := jsonb_build_object('Content-Type', 'application/json')
     );
  $$
);
```

If the function is `--no-verify-jwt`, no auth header needed; otherwise add
a `Bearer <anon-key>` header.

### 4. Smoke-test it

Hit the function directly:

```
curl -X POST "https://<project>.functions.supabase.co/weekly-digest"
```

You should receive the digest (assuming you're an active admin with
`email_notifications=true` and the sender is configured). The response JSON
reports `{ ok, sent, total }`.

## Action types written to system_logs

- `digest.send`          — at least one send succeeded; details show counts
- `digest.send_failed`   — Resend returned a non-2xx for one recipient
- `digest.send_skipped`  — preconditions missing (no API key, no admins,
                           no sender)
