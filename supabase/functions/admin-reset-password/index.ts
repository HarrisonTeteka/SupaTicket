// admin-reset-password — Supabase Edge Function (Deno).
//
// Called by the staff UI's "Reset password" action. Verifies the caller has
// the `users.reset_password` permission, then overwrites the target user's
// password via the auth admin API. Mirrors the shape of admin-create-user.
//
// Audited to system_logs with action_type='user.reset_password'. The new
// password is never logged.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function audit(action: string, details: string, actor: string | null) {
  try {
    await admin.from("system_logs").insert({
      action_type: action,
      details,
      user_id: actor,
    });
  } catch (_) {
    // never block on audit failure
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Resolve caller from the bearer token.
  const auth = req.headers.get("authorization");
  if (!auth) return json({ error: "Missing authorization header" }, 401);

  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user: actor }, error: actorErr } = await caller.auth.getUser();
  if (actorErr || !actor) return json({ error: "Not signed in" }, 401);

  // 2. Permission check via has_permission() on the caller's role.
  const { data: hasPerm, error: permErr } = await admin.rpc("has_permission", {
    uid: actor.id,
    perm: "users.reset_password",
  });
  if (permErr) return json({ error: permErr.message }, 500);
  if (!hasPerm) {
    return json({ error: "Forbidden: requires users.reset_password" }, 403);
  }

  // 3. Validate body.
  let body: { user_id?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const userId = String(body.user_id || "").trim();
  const newPassword = String(body.new_password || "");

  if (!userId) return json({ error: "user_id required" }, 400);
  // Match Supabase Auth's default minimum (6); tighten if your project
  // overrides this in Auth settings.
  if (newPassword.length < 6) {
    return json({ error: "Password must be at least 6 characters" }, 400);
  }

  // 4. Confirm the target user exists and capture their email for the audit.
  //    Reading from profiles also catches the case where the auth user was
  //    deleted but the row is stale.
  const { data: targetProfile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, name")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) return json({ error: profileErr.message }, 500);
  if (!targetProfile) return json({ error: "User not found" }, 404);

  // 5. Overwrite the password via the auth admin API.
  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (updateErr) return json({ error: updateErr.message }, 400);

  await audit(
    "user.reset_password",
    `${targetProfile.email || targetProfile.name || userId}`,
    actor.id,
  );

  return json({ ok: true });
});
