// weekly-digest — Supabase Edge Function (Deno).
//
// Reads the get_weekly_stats() roll-up, formats an HTML digest, and emails
// every active admin (honouring email_notifications) via Resend. Intended to
// be invoked once a week on a cron schedule — see README.md for setup.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://supaticket.example.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function audit(action: string, details: string) {
  try {
    await admin.from("system_logs").insert({
      action_type: action,
      details,
      user_id: null,
      user_name: "digest-system",
    });
  } catch (_) {
    /* swallowed — never block on audit */
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!RESEND_KEY) {
    await audit("digest.send_skipped", "RESEND_API_KEY not set");
    return json({ skipped: "no api key" });
  }

  const { data: stats, error: statsErr } = await admin.rpc("get_weekly_stats");
  if (statsErr) {
    await audit("digest.send_failed", `stats query failed: ${statsErr.message}`);
    return json({ ok: false, error: statsErr.message }, 500);
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, email, email_notifications")
    .eq("role", "admin")
    .eq("status", "active");

  const recipients = (profiles ?? []).filter(
    (p) => p.email && p.email_notifications !== false
  );

  if (recipients.length === 0) {
    await audit("digest.send_skipped", "no admin recipients");
    return json({ skipped: "no recipients" });
  }

  const { data: config } = await admin
    .from("app_config")
    .select("email_sender")
    .eq("id", 1)
    .maybeSingle();
  const sender = (config?.email_sender ?? {}) as {
    from_name?: string; from_email?: string; reply_to?: string | null;
  };
  if (!sender.from_email) {
    await audit("digest.send_skipped", "email_sender not configured");
    return json({ skipped: "no sender" });
  }

  const html = renderDigest(stats as Record<string, unknown>, APP_URL);
  const subject = "[SupaTicket] Weekly digest";

  let sent = 0;
  for (const recipient of recipients) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${sender.from_name || "SupaTicket"} <${sender.from_email}>`,
        to: recipient.email,
        subject,
        html,
        reply_to: sender.reply_to ?? undefined,
      }),
    });
    if (res.ok) {
      sent++;
    } else {
      const err = (await res.text()).slice(0, 200);
      await audit(
        "digest.send_failed",
        `to=${recipient.email} status=${res.status} ${err}`
      );
    }
  }

  await audit("digest.send", `sent=${sent} of ${recipients.length}`);
  return json({ ok: true, sent, total: recipients.length });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderDigest(stats: Record<string, unknown>, appUrl: string): string {
  const byStatus = (stats.by_status ?? {}) as Record<string, number>;
  const byPriority = (stats.by_priority ?? {}) as Record<string, number>;
  const topCats = (stats.top_categories ?? []) as Array<{
    category: string; count: number;
  }>;

  const cards = [
    kpiCard("Created", stats.total_created),
    kpiCard("Resolved", stats.total_resolved),
    kpiCard("Currently breached", stats.currently_breached),
    kpiCard("Avg resolution (h)", stats.avg_resolution_hours ?? "—"),
    kpiCard(
      "CSAT avg",
      stats.csat_avg ?? "—",
      stats.csat_count ? `${stats.csat_count} rated` : undefined
    ),
  ].join("");

  const statusList = Object.entries(byStatus)
    .map(([s, c]) => `<li>${escape(s)}: <strong>${c}</strong></li>`)
    .join("");
  const priorityList = Object.entries(byPriority)
    .map(([p, c]) => `<li>${escape(p)}: <strong>${c}</strong></li>`)
    .join("");
  const catList = topCats
    .map((c) => `<li>${escape(c.category)}: <strong>${c.count}</strong></li>`)
    .join("");

  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7f9;padding:24px;color:#12344d;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
    <h1 style="font-size:20px;font-weight:900;margin:0 0 4px;">SupaTicket — Weekly Digest</h1>
    <p style="font-size:12px;color:#6b7280;margin:0 0 24px;">Prior 7 days</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">${cards}</div>
    ${section("By status", statusList)}
    ${section("By priority", priorityList)}
    ${section("Top categories", catList)}
    <a href="${appUrl}" style="display:inline-block;background:#12344d;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:bold;font-size:13px;">Open SupaTicket</a>
  </div>
</body></html>`;
}

function section(heading: string, listHtml: string): string {
  return `<h2 style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin:0 0 8px;">${escape(heading)}</h2>
<ul style="font-size:13px;line-height:1.6;margin:0 0 20px;padding-left:18px;">${listHtml || '<li style="color:#9ca3af;">No activity</li>'}</ul>`;
}

function kpiCard(label: string, value: unknown, hint?: string): string {
  return `<div style="background:#f9fafb;border-radius:12px;padding:14px;">
    <div style="font-size:22px;font-weight:900;line-height:1;color:#12344d;">${escape(String(value ?? "—"))}</div>
    <div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin-top:4px;">${escape(label)}</div>
    ${hint ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px;">${escape(hint)}</div>` : ""}
  </div>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
