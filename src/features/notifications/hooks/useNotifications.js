import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/components/AuthGate';
import { useToast } from '../../../shared/hooks/useToast';
import {
  listForUser,
  markAllRead as markAllReadSvc,
  markRead as markReadSvc,
  remove as removeSvc,
} from '../services/notificationsService';

/**
 * The current user's notifications: initial fetch + realtime.
 *
 * A live INSERT prepends the row and fires a toast; the initial fetch never
 * toasts (PHASES.md). Notification rows have no column-level RLS for their
 * owner, so trusting `payload.new`/`payload.old` here is safe.
 *
 * `unreadCount` is derived from the list — this hook is the single realtime
 * subscriber, so the bell badge and popover share one channel.
 */
export function useNotifications() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        if (!cancelled) {
          setNotifications([]);
          setLoading(false);
        }
        return;
      }
      try {
        const data = await listForUser(userId);
        if (!cancelled) setNotifications(data);
      } catch {
        if (!cancelled) setNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    if (!userId) return undefined;

    const channel = supabase
      .channel(`notifications:${userId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (cancelled) return;
          setNotifications((prev) => [payload.new, ...prev]);
          showToast(payload.new.message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (cancelled) return;
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (cancelled) return;
          setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, showToast]);

  const unreadCount = notifications.reduce((n, item) => (item.read ? n : n + 1), 0);

  // Optimistic mutations; the realtime UPDATE/DELETE reconciles shortly after.
  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await markReadSvc(id);
    } catch {
      /* realtime reconciles */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllReadSvc(userId);
    } catch {
      /* realtime reconciles */
    }
  }, [userId]);

  const remove = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await removeSvc(id);
    } catch {
      /* realtime reconciles */
    }
  }, []);

  return { notifications, unreadCount, loading, markRead, markAllRead, remove };
}
