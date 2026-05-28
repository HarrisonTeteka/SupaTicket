import { useState } from 'react';
import { KeyRound, Shuffle } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { resetUserPasswordAsAdmin } from '../services/passwordResetService';

/**
 * Admin-set-directly password reset. The admin types (or generates) a new
 * password, we forward it to the admin-reset-password edge function which
 * verifies the caller has `users.reset_password` before overwriting.
 *
 * Less secure than a recovery email (admin sees the password) — use this
 * for offline scenarios where the user can't access their email.
 */
export function ResetPasswordModal({ profile, onClose }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const generate = () => {
    // 12 random base64url chars from the crypto API. Good enough as a
    // temporary; user should change on next login.
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    const next = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
      .slice(0, 12);
    setPassword(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      await resetUserPasswordAsAdmin({
        user_id: profile.id,
        new_password: password,
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reset password — ${profile.name || profile.email}`}
      size="sm"
      footer={
        done ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy} disabled={!password}>
              <KeyRound size={14} /> Reset password
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl" role="status">
            Password updated. Share the new password with {profile.name || 'the user'}
            {' '}securely — they should change it on next sign-in.
          </div>
          <div className="p-3 bg-surface-2 rounded-xl">
            <p className="text-[11px] font-bold text-fg-muted uppercase tracking-widest mb-1">
              New password
            </p>
            <code className="text-sm break-all select-all">{password}</code>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-fg-secondary">
            Set a new password for{' '}
            <strong className="text-fg">{profile.email || profile.name}</strong>. The
            user should change it the next time they sign in.
          </p>
          <Input
            label="New password"
            name="new_password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            autoComplete="new-password"
            autoFocus
          />
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center gap-1.5 text-xs text-brand-accent hover:text-brand-accent-hover font-bold"
          >
            <Shuffle size={12} /> Generate random
          </button>
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl"
            >
              {error}
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
