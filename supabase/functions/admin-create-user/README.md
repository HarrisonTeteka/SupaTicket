# admin-create-user

Supabase Edge Function. Provisions an auth user on behalf of an admin and
links them to a role. The staff UI's "Create user" modal calls this endpoint.

## Why an Edge Function

`auth.admin.createUser()` requires the service-role key, which can only live
server-side. The browser client (anon key) cannot create auth users.

## Deploy

```bash
supabase functions deploy admin-create-user
```

## Secrets

Set these in your Supabase project (Project Settings → Edge Functions →
Secrets), then redeploy:

```bash
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_ANON_KEY=<anon key>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are usually pre-populated by
Supabase for every Edge Function — verify in the dashboard.

## Request

```http
POST /functions/v1/admin-create-user
Authorization: Bearer <caller-jwt>
Content-Type: application/json

{
  "email":       "jane@acme.com",
  "name":        "Jane Doe",
  "role_id":     "<uuid of a role>",
  "department":  "Operations",      // optional
  "send_invite": true,               // default true — emails a magic link
  "password":    "..."               // optional; ignored when send_invite=true
}
```

## Response

```json
{ "id": "<new auth user uuid>" }
```

On invite-email failure the user is still created; the response includes a
`warning` field so the UI can surface it.

## Permission check

The caller's JWT is verified against `public.has_permission(uid,
'users.create')`. A 403 is returned if missing — regardless of legacy
`profiles.role`.

## Audit

One `system_logs` row per attempt with `action_type='user.create'`.
