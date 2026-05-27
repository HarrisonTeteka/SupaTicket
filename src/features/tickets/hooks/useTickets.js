import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { listTickets } from '../services/ticketsService';

/**
 * Tickets list with filtering, pagination + realtime.
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
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Serialise filters only (not page/pageSize) so filter changes reset page.
  const filterKey = JSON.stringify(filters);

  // Reset to page 0 when filters change.
  const prevFilterKey = useRef(filterKey);
  if (prevFilterKey.current !== filterKey) {
    prevFilterKey.current = filterKey;
    if (page !== 0) setPage(0);
  }

  const refetch = useCallback(async () => {
    try {
      const { tickets: data, totalCount: total } = await listTickets({
        ...JSON.parse(filterKey),
        page,
        pageSize,
      });
      setTickets(data);
      setTotalCount(total);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filterKey, page, pageSize]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { tickets: data, totalCount: total } = await listTickets({
          ...JSON.parse(filterKey),
          page,
          pageSize,
        });
        if (!cancelled) {
          setTickets(data);
          setTotalCount(total);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Re-subscribed when filters/page/pageSize change — keeps the realtime
    // handler refetching with the current slice.
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
  }, [filterKey, page, pageSize]);

  return { tickets, loading, error, refetch, page, setPage, pageSize, setPageSize, totalCount };
}
