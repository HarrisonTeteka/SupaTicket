import { useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useDisclosure } from '../../../shared/hooks/useDisclosure';
import { NotificationPopover } from './NotificationPopover';

/**
 * Topbar notifications bell. Owns the single useNotifications() subscription,
 * shows an unread-count badge, and toggles the popover.
 */
export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead, remove } =
    useNotifications();
  const { isOpen, toggle, close } = useDisclosure();
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen, close]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative p-2 rounded-lg text-gray-500 hover:text-[#336021] hover:bg-gray-100 transition-all"
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
        />
      )}
    </div>
  );
}
