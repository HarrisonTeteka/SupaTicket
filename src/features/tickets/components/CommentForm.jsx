import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { addComment } from '../services/commentsService';
import { Button } from '../../../shared/components/Button';
import { Textarea } from '../../../shared/components/Input';

/** Composer for a new comment on a ticket. */
export function CommentForm({ ticketId }) {
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      await addComment({ ticketId, text }, profile);
      setText('');
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
        placeholder="Write a comment..."
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" loading={busy} disabled={!text.trim()}>
          <Send size={14} /> Comment
        </Button>
      </div>
    </form>
  );
}
