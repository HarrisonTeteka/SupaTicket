import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { getTicket } from '../services/ticketsService';

/**
 * A single ticket by id, kept fresh via a realtime subscription filtered to
 * that row. Updates trigger a refetch rather than trusting `payload.new`.
 */
export function useTicket(id) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getTicket(id);
      setTicket(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        if (!cancelled) {
          setTicket(null);
          setLoading(false);
        }
        return;
      }
      try {
        const data = await getTicket(id);
        if (!cancelled) {
          setTicket(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    if (!id) return undefined;

    const channel = supabase
      .channel(`ticket:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${id}` },
        async (payload) => {
          if (cancelled) return;
          if (payload.eventType === 'DELETE') {
            setTicket(null);
            return;
          }
          const data = await getTicket(id);
          if (!cancelled) setTicket(data);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  return { ticket, loading, error, refetch, setTicket };
}
