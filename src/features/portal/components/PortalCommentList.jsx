import { formatRelative } from '../../tickets/tickets.utils';

/**
 * Customer-facing comment list. RLS already filters internal notes out, so
 * this is a plain renderer with no internal-flag handling.
 */
export function PortalCommentList({ comments = [], loading }) {
  if (loading) return <p className="text-sm text-gray-400">Loading replies...</p>;
  if (comments.length === 0) {
    return <p className="text-sm text-gray-400">No replies yet.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-[#336021] text-white text-[10px] font-bold flex items-center justify-center">
              {(c.author_name || '?').charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-[#336021]">
              {c.author_name || 'Support'}
            </span>
            <span className="text-[11px] text-gray-400">{formatRelative(c.created_at)}</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.text}</p>
        </div>
      ))}
    </div>
  );
}
