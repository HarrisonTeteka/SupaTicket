import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { addComment } from '../services/commentsService';
import { Button } from '../../../shared/components/Button';
import { Textarea } from '../../../shared/components/Input';

/** Composer for a new comment on a ticket. */
export function CommentForm({ ticketId }) {
  const { profile, isCustomer } = useAuth();
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      await addComment({ ticketId, text, internal }, profile);
      setText('');
      setInternal(false);
    } catch (err) {
      setError(err.message || 'Could not post comment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        name="comment"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={internal ? 'Internal note — visible to staff only...' : 'Write a comment...'}
        className={internal ? 'bg-amber-50 focus:bg-amber-50/60 border-amber-200' : undefined}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        {isCustomer ? (
          <span />
        ) : (
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
            />
            Internal note (staff only)
          </label>
        )}
        <Button type="submit" loading={busy} disabled={!text.trim()}>
          <Send size={14} /> {internal ? 'Post internal note' : 'Comment'}
        </Button>
      </div>
    </form>
  );
}
