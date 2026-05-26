# send-notification-email

Sends one email for every row inserted into `public.notifications`. Honours
the per-user opt-out (`profiles.email_notifications`) and the admin-editable
sender identity (`app_config.email_sender`). Every send (success, failure,
skip) writes one row to `system_logs`.

## Setup

### 1. Provision env

Copy `.env.example` to `.env` (not committed — `.env*` is in `.gitignore`):

```
cp supabase/functions/send-notification-email/.env.example \
   supabase/functions/.env
```

Fill in:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API
  (the **service_role** key, not the anon key)
- `RESEND_API_KEY` — https://resend.com (or swap the provider in `index.ts`)
- `APP_URL` — your deployed SupaTicket URL; used in the email CTA

Push them as function secrets:

```
supabase secrets set --env-file supabase/functions/.env
```

### 2. Deploy the function

```
supabase functions deploy send-notification-email --no-verify-jwt
```

`--no-verify-jwt` because the database webhook authenticates via the URL it
calls, not a user JWT.

### 3. Wire the database webhook

In Supabase Studio → Database → Webhooks → **Create a new hook**:

| Field            | Value                                            |
|------------------|--------------------------------------------------|
| Name             | `notify-email`                                   |
| Table            | `public.notifications`                           |
| Events           | INSERT                                           |
| Type             | HTTP Request                                     |
| Method           | POST                                             |
| URL              | the function URL printed by the deploy above     |
| HTTP Params      | leave empty (the function reads `payload.record`) |

Save. From here on, every new notification row POSTs to the function and an
email goes out if the recipient is opted-in and the sender is configured.

### 4. Smoke-test it

In the admin **Email** tab, click **Send test email**. A self-notification is
inserted; within ~1 minute, the configured admin email should receive the
test message. Failures show up in the admin **Logs** tab under
`action_type = email.send_failed`.

## Action types written to system_logs

- `email.send`          — email delivered to Resend successfully
- `email.send_failed`   — Resend returned a non-2xx response
- `email.send_skipped`  — sender or API key was missing
