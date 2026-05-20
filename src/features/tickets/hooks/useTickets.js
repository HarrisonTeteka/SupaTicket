import { useCallback, useEffect, useRef, useState } from 'react';
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

  // Latest filters in a ref so the realtime handler always refetches with the
  // current filters without needing to re-subscribe.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const refetch = useCallback(async () => {
    try {
      const data = await listTickets(filtersRef.current);
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch whenever the filter values change.
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTickets(filtersRef.current)
      .then((data) => {
        if (!cancelled) {
          setTickets(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterKey]);

  // One realtime subscription for the lifetime of the hook.
  useEffect(() => {
    const channel = supabase
      .channel('tickets:list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { tickets, loading, error, refetch };
}
