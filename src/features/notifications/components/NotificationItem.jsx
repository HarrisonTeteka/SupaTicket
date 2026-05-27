import { Check, X } from 'lucide-react';
import { formatRelative } from '../../tickets/tickets.utils';

/** One row in the notifications popover. */
export function NotificationItem({ notification, onMarkRead, onRemove }) {
  const { id, message, read, created_at } = notification;

  return (
    <div
      className={`group flex items-start gap-2 px-4 py-3 border-b border-line last:border-0 ${
        read ? 'bg-surface' : 'bg-brand-accent/5'
      }`}
    >
      {!read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-accent shrink-0" />}
      <div className={`flex-1 min-w-0 ${read ? 'pl-4' : ''}`}>
        <p className="text-sm text-fg">{message}</p>
        <p className="text-[11px] text-fg-muted mt-0.5">{formatRelative(created_at)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!read && (
          <button
            type="button"
            onClick={() => onMarkRead(id)}
            className="p-1 text-fg-muted hover:text-emerald-600"
            title="Mark as read"
          >
            <Check size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="p-1 text-fg-muted hover:text-red-500"
          title="Remove"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
