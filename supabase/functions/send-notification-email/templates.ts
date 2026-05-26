// Subject + body builders for the notification email. The notification
// `message` is already a complete English sentence (formatted by the DB
// triggers in migrations 0005 / 0010), so we infer the subject from
// keywords rather than building the body from scratch.

interface Notification {
  id: string;
  message: string;
  created_at: string;
}

interface Profile {
  id: string;
  name: string | null;
  email: string;
}

export function buildEmail(notif: Notification, profile: Profile, appUrl: string) {
  return {
    subject: pickSubject(notif.message),
    html: renderHtml(notif, profile, appUrl),
    text: renderText(notif, appUrl),
  };
}

function pickSubject(message: string): string {
  if (/SLA breach/i.test(message)) return "[SupaTicket] SLA breach escalation";
  if (/^You have been assigned/i.test(message)) return "[SupaTicket] You have a new assignment";
  if (/ is now /i.test(message)) return "[SupaTicket] Ticket status updated";
  if (/^New comment/i.test(message)) return "[SupaTicket] New comment on a ticket";
  return "[SupaTicket] You have a new notification";
}

function renderText(notif: Notification, appUrl: string): string {
  return `${notif.message}\n\nOpen SupaTicket: ${appUrl}\n`;
}

function renderHtml(notif: Notification, profile: Profile, appUrl: string): string {
  const name = profile.name || "there";
  return `<!DOCTYPE html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7f9;padding:24px;color:#12344d;margin:0;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
      <h1 style="font-size:18px;font-weight:900;margin:0 0 16px;letter-spacing:-0.01em;">SupaTicket</h1>
      <p style="font-size:14px;margin:0 0 8px;color:#6b7280;">Hi ${escapeHtml(name)},</p>
      <p style="font-size:15px;line-height:1.5;margin:0 0 20px;">${escapeHtml(notif.message)}</p>
      <a href="${appUrl}" style="display:inline-block;background:#12344d;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:bold;font-size:13px;">Open SupaTicket</a>
      <p style="font-size:11px;color:#9ca3af;margin-top:24px;line-height:1.5;">
        You're receiving this because you have email notifications enabled.
        You can turn them off in your profile.
      </p>
    </div>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
