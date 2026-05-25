import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { listTickets } from '../services/ticketsService';

/**
 * Tickets list with filtering + realtime.
 *
 * On any change to the `tickets` table the whole filtered list is refetched —
 * we don't trust `payload.new` (RLS column filtering can reshape it, same
 * reasoning as the profile realtime fix in HANDOVER.md Fix 9).
 *
 * Pass `filters` as a plain object; its values are compared by content, so a
 * fresh object literal each render is fine.
 */
export function useTickets(filters = {}) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters are compared by content, not identity.
  const filterKey = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    try {
      const data = await listTickets(JSON.parse(filterKey));
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listTickets(JSON.parse(filterKey));
        if (!cancelled) {
          setTickets(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Re-subscribed when the filters change — cheap, and keeps the realtime
    // handler refetching with the current filters.
    const channel = supabase
      .channel(`tickets:list:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [filterKey]);

  return { tickets, loading, error, refetch };
}
