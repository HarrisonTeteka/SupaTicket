// send-notification-email — Supabase Edge Function (Deno).
//
// Triggered by a Database Webhook on INSERT INTO public.notifications.
// Looks up the recipient's profile + the admin-configured sender, and
// sends one email via Resend. Audited to system_logs.
//
// See README.md in this folder for the webhook + env-var setup.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmail } from "./templates.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    user_id: string;
    message: string;
    read: boolean;
    created_at: string;
  } | null;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://supaticket.example.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function audit(action: string, details: string, userId?: string | null) {
  try {
    await admin.from("system_logs").insert({
      action_type: action,
      details,
      user_id: userId ?? null,
      user_name: "email-system",
    });
  } catch (_) {
    // Audit failures are themselves swallowed — never block the send path.
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (
    payload.type !== "INSERT" ||
    payload.table !== "notifications" ||
    !payload.record
  ) {
    return jsonResponse({ skipped: "not a notification insert" });
  }

  const notif = payload.record;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, email, email_notifications")
    .eq("id", notif.user_id)
    .maybeSingle();

  if (!profile?.email) {
    return jsonResponse({ skipped: "no recipient email" });
  }
  if (profile.email_notifications === false) {
    return jsonResponse({ skipped: "user opted out" });
  }

  const { data: config } = await admin
    .from("app_config")
    .select("email_sender")
    .eq("id", 1)
    .maybeSingle();

  const sender = (config?.email_sender ?? {}) as {
    from_name?: string;
    from_email?: string;
    reply_to?: string | null;
  };

  if (!sender.from_email || !RESEND_KEY) {
    await audit(
      "email.send_skipped",
      `notification=${notif.id} reason=misconfigured`,
      profile.id
    );
    return jsonResponse({ skipped: "sender or API key missing" });
  }

  const { subject, html, text } = buildEmail(notif, profile, APP_URL);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${sender.from_name || "SupaTicket"} <${sender.from_email}>`,
      to: profile.email,
      subject,
      html,
      text,
      reply_to: sender.reply_to ?? undefined,
    }),
  });

  if (!res.ok) {
    const err = (await res.text()).slice(0, 200);
    await audit(
      "email.send_failed",
      `notification=${notif.id} status=${res.status} ${err}`,
      profile.id
    );
    return jsonResponse({ ok: false, error: err });
  }

  await audit("email.send", `notification=${notif.id} to=${profile.email}`, profile.id);
  return jsonResponse({ ok: true });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
