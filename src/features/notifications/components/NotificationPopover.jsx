import { BellOff, CheckCheck } from 'lucide-react';
import { NotificationItem } from './NotificationItem';

/**
 * Dropdown panel listing recent notifications. Controlled entirely by props —
 * NotificationBell owns the data (one realtime subscription).
 */
export function NotificationPopover({
  notifications,
  loading,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onRemove,
  onOpen,
}) {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-surface rounded-xl border border-line-strong shadow-xl overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h3 className="text-sm font-semibold text-brand-primary">Notifications</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-xs font-bold text-brand-accent hover:text-brand-accent-hover"
          >
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-6 text-sm text-fg-muted text-center">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 flex flex-col items-center text-center text-fg-muted">
            <BellOff size={24} className="mb-2" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={onMarkRead}
              onRemove={onRemove}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}
