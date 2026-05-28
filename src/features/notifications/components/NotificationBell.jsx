import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useDisclosure } from '../../../shared/hooks/useDisclosure';
import { NotificationPopover } from './NotificationPopover';
import { searchTickets } from '../../tickets/services/ticketsService';

/**
 * Notification messages are produced by DB triggers in migration 0005 and all
 * contain a `#<ticket_number>` token. We extract that on click and resolve to
 * a ticket id via the same searchTickets() the topbar uses; on a miss we fall
 * back to the tickets list.
 */
async function resolveTarget(message) {
  const match = message?.match(/#(\d+)/);
  if (!match) return '/tickets';
  try {
    const results = await searchTickets(match[1]);
    if (results.length > 0) return `/tickets/${results[0].id}`;
  } catch {
    // ignore — fall through to the list view
  }
  return '/tickets';
}

/**
 * Topbar notifications bell. Owns the single useNotifications() subscription,
 * shows an unread-count badge, and toggles the popover.
 */
export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead, remove } =
    useNotifications();
  const { isOpen, toggle, close } = useDisclosure();
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen, close]);

  const handleOpen = async (notification) => {
    if (!notification.read) markRead(notification.id);
    close();
    const target = await resolveTarget(notification.message);
    navigate(target);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative p-2 rounded-lg text-fg-secondary hover:text-brand-primary hover:bg-surface-2 transition-all"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPopover
          notifications={notifications}
          loading={loading}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onRemove={remove}
          onOpen={handleOpen}
        />
      )}
    </div>
  );
}
