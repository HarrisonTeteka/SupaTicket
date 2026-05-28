import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { deleteComment, updateComment } from '../services/commentsService';
import { formatRelative } from '../tickets.utils';
import { Textarea } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';

/** Comment thread for a ticket. Authors can edit their own comments;
 *  admins can delete any. Edited comments show an "edited" tag with a
 *  "view original" toggle (original captured on first edit, migration 0021). */
export function CommentList({ comments = [], loading }) {
  const { isAdmin, user } = useAuth();

  if (loading) return <p className="text-sm text-fg-muted">Loading comments...</p>;
  if (comments.length === 0) {
    return <p className="text-sm text-fg-muted">No comments yet.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          currentUserId={user?.id}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

function CommentItem({ comment, currentUserId, isAdmin }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);

  const isAuthor = comment.author_id && comment.author_id === currentUserId;
  const canEdit = isAuthor;
  const wasEdited = Boolean(comment.edited_at);
  const hasOriginal = Boolean(comment.original_text);
  const displayedText = showOriginal && hasOriginal ? comment.original_text : comment.text;

  const startEdit = () => {
    setDraft(comment.text);
    setError('');
    setShowOriginal(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === comment.text) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateComment(comment.id, trimmed);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    deleteComment(comment.id).catch(() => {
      // Realtime reconciles; we don't surface delete errors inline here.
    });
  };

  return (
    <div
      className={
        comment.internal
          ? 'bg-amber-50 border border-amber-200 rounded-xl p-3'
          : 'bg-surface-2 rounded-xl p-3'
      }
    >
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {(comment.author_name || '?').charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-brand-primary truncate">
            {comment.author_name || 'Unknown'}
          </span>
          {comment.internal && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded shrink-0">
              Internal
            </span>
          )}
          <span className="text-[11px] text-fg-muted">
            {formatRelative(comment.created_at)}
          </span>
          {wasEdited && (
            <span className="text-[11px] text-fg-muted italic flex items-center gap-1">
              · edited {formatRelative(comment.edited_at)}
              {hasOriginal && !editing && (
                <button
                  type="button"
                  onClick={() => setShowOriginal((o) => !o)}
                  className="underline hover:text-brand-primary not-italic"
                >
                  {showOriginal ? 'show current' : 'view original'}
                </button>
              )}
            </span>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={startEdit}
                className="text-fg-muted hover:text-brand-primary transition-colors p-1"
                title="Edit comment"
              >
                <Pencil size={13} />
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-fg-muted hover:text-red-500 transition-colors p-1"
                title="Delete comment"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            name={`edit-comment-${comment.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
          />
          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
              <X size={13} /> Cancel
            </Button>
            <Button
              size="sm"
              loading={saving}
              onClick={save}
              disabled={!draft.trim() || draft.trim() === comment.text}
            >
              <Check size={13} /> Save
            </Button>
          </div>
        </div>
      ) : (
        <p
          className={`text-sm whitespace-pre-wrap ${
            showOriginal && hasOriginal ? 'text-fg-secondary italic' : 'text-fg'
          }`}
        >
          {displayedText}
        </p>
      )}
    </div>
  );
}
