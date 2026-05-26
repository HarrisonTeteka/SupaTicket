import { Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { deleteComment } from '../services/commentsService';
import { formatRelative } from '../tickets.utils';

/** Comment thread for a ticket. Admins can delete (per RLS). */
export function CommentList({ comments = [], loading }) {
  const { isAdmin } = useAuth();

  if (loading) return <p className="text-sm text-gray-400">Loading comments...</p>;
  if (comments.length === 0) {
    return <p className="text-sm text-gray-400">No comments yet.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div
          key={c.id}
          className={
            c.internal
              ? 'bg-amber-50 border border-amber-200 rounded-xl p-3'
              : 'bg-gray-50 rounded-xl p-3'
          }
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#336021] text-white text-[10px] font-bold flex items-center justify-center">
                {(c.author_name || '?').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-[#336021]">
                {c.author_name || 'Unknown'}
              </span>
              {c.internal && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                  Internal
                </span>
              )}
              <span className="text-[11px] text-gray-400">{formatRelative(c.created_at)}</span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => deleteComment(c.id).catch(() => {})}
                className="text-gray-300 hover:text-red-500 transition-colors"
                title="Delete comment"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.text}</p>
        </div>
      ))}
    </div>
  );
}
