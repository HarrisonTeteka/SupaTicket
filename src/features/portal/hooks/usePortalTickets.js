import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/components/AuthGate';
import { listMyTickets } from '../services/portalService';

/**
 * The current customer's own tickets, kept fresh via realtime.
 * Scoped by RLS — only tickets where `created_by = auth.uid()` come back.
 */
export function usePortalTickets() {
  const { user } = useAuth();
  const userId = user?.id;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listMyTickets(userId);
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

    const channel = supabase
      .channel(`portal:tickets:${userId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `created_by=eq.${userId}`,
        },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { tickets, loading, error };
}
