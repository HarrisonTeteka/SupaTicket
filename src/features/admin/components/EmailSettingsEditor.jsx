import { useState } from 'react';
import { Save, Send } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { useAppConfig } from '../hooks/useAppConfig';
import { updateEmailSender } from '../services/appConfigService';
import { supabase } from '../../../lib/supabase';
import { Input } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';

/**
 * Email tab: edit the sender identity used by the send-notification-email
 * Edge Function, and trigger a self-notification to smoke-test the pipeline.
 * Edge Function setup (env vars + database webhook) is documented in
 * `supabase/functions/send-notification-email/README.md`.
 */
export function EmailSettingsEditor() {
  const { config, loading } = useAppConfig();

  if (loading) {
    return <div className="h-40 bg-white border border-gray-200 rounded-2xl animate-pulse" />;
  }

  // Mount the form once the config is loaded so its draft state initialises
  // directly from props — no useEffect mirror, no set-state-in-effect.
  return <EmailSettingsForm sender={config.email_sender || {}} />;
}

function EmailSettingsForm({ sender }) {
  const { user } = useAuth();
  const [fromName, setFromName] = useState(sender.from_name || '');
  const [fromEmail, setFromEmail] = useState(sender.from_email || '');
  const [replyTo, setReplyTo] = useState(sender.reply_to || '');
  const [saving, setSaving] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    setMsg('');
    if (!fromEmail.trim()) {
      setError('From email is required.');
      return;
    }
    setSaving(true);
    try {
      await updateEmailSender({
        from_name: fromName.trim(),
        from_email: fromEmail.trim(),
        reply_to: replyTo.trim() || null,
      });
      setMsg('Saved.');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setError(err.message || 'Could not save email settings.');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setError('');
    setMsg('');
    setTestBusy(true);
    try {
      const { error: err } = await supabase.from('notifications').insert({
        user_id: user.id,
        message: 'Test email from SupaTicket — your email pipeline is working.',
        read: false,
      });
      if (err) throw err;
      setMsg(
        'Test notification sent. If the Edge Function and webhook are wired, check your inbox within a minute. Otherwise see Logs.'
      );
      setTimeout(() => setMsg(''), 6000);
    } catch (err) {
      setError(err.message || 'Could not send test email.');
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 max-w-xl">
      <div>
        <h3 className="text-sm font-black text-[#12344d] uppercase tracking-wide">
          Email Sender
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Identity used by the notification-email Edge Function. Make sure the
          From address is verified with your email provider.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}
      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl">
          {msg}
        </div>
      )}

      <Input
        label="From name"
        name="from_name"
        value={fromName}
        onChange={(e) => setFromName(e.target.value)}
        placeholder="SupaTicket"
      />
      <Input
        label="From email"
        name="from_email"
        type="email"
        value={fromEmail}
        onChange={(e) => setFromEmail(e.target.value)}
        placeholder="noreply@yourdomain.com"
      />
      <Input
        label="Reply-to (optional)"
        name="reply_to"
        type="email"
        value={replyTo}
        onChange={(e) => setReplyTo(e.target.value)}
        placeholder="support@yourdomain.com"
      />

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" onClick={sendTest} loading={testBusy}>
          <Send size={14} /> Send test email
        </Button>
        <Button onClick={save} loading={saving}>
          <Save size={14} /> Save
        </Button>
      </div>

      <p className="text-[11px] text-gray-400">
        Edge Function setup + env vars:
        <code className="ml-1">supabase/functions/send-notification-email/README.md</code>.
      </p>
    </div>
  );
}
