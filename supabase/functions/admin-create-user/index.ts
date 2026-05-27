// admin-create-user — Supabase Edge Function (Deno).
//
// Called by the staff UI's "Create user" action. Verifies the caller has
// the `users.create` permission, then provisions an auth user with the
// service role, links them to the chosen role, and (optionally) emails an
// invite link so they can set their own password.
//
// Audited to system_logs with action_type='user.create'.

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
    perm: "users.create",
  });
  if (permErr) return json({ error: permErr.message }, 500);
  if (!hasPerm) return json({ error: "Forbidden: requires users.create" }, 403);

  // 3. Validate body.
  let body: {
    email?: string;
    name?: string;
    role_id?: string;
    department?: string | null;
    send_invite?: boolean;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const roleId = body.role_id || null;
  const department = body.department || null;
  const sendInvite = body.send_invite !== false; // default true

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Valid email required" }, 400);
  }
  if (!name) return json({ error: "Name required" }, 400);
  if (!roleId) return json({ error: "Role required" }, 400);

  // 4. Verify the role exists (and is not the customer role — admins create
  //    staff/agent users from this UI; portal customers self-sign-up).
  const { data: role, error: roleErr } = await admin
    .from("roles")
    .select("id, name, system_name")
    .eq("id", roleId)
    .maybeSingle();
  if (roleErr) return json({ error: roleErr.message }, 500);
  if (!role) return json({ error: "Role not found" }, 400);
  if (role.system_name === "customer") {
    return json(
      { error: "Customer role cannot be assigned from this flow. Use the portal sign-up." },
      400,
    );
  }

  // 5. Create the auth user. If send_invite: generate a random password and
  //    fire an invite link separately so the user sets their own. Otherwise
  //    use the explicit password (rare; for seeding test accounts).
  const password = body.password || crypto.randomUUID();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: !sendInvite, // confirmed=true skips the verification email
    user_metadata: { name },
  });
  if (createErr) return json({ error: createErr.message }, 400);
  const newUserId = created.user.id;

  // 6. Stamp role_id + department on the profile. The handle_new_user
  //    trigger already wrote a base row; we patch it. The
  //    profiles_sync_role_text trigger updates the legacy text `role`.
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      role_id: roleId,
      department,
      name, // in case the trigger derived a different name from the email
    })
    .eq("id", newUserId);
  if (profileErr) {
    // Roll back the auth user so we don't leak orphans.
    await admin.auth.admin.deleteUser(newUserId);
    return json({ error: profileErr.message }, 500);
  }

  // 7. Send the invite link if requested.
  if (sendInvite) {
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
    // Invite failures don't block the create — the user exists, admin can
    // resend later or hand them the password. Still report it back.
    if (inviteErr) {
      await audit(
        "user.create",
        `${email} role=${role.name} INVITE_FAILED: ${inviteErr.message}`,
        actor.id,
      );
      return json({
        id: newUserId,
        warning: `User created but invite email failed: ${inviteErr.message}`,
      });
    }
  }

  await audit("user.create", `${email} role=${role.name}`, actor.id);
  return json({ id: newUserId });
});
