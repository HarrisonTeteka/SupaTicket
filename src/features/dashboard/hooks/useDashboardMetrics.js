import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/components/AuthGate';
import { listTicketsForMetrics } from '../services/dashboardService';
import { computeMetrics } from '../selectors/dashboardSelectors';

/**
 * Dashboard ticket data + derived KPIs, refreshed on any change to the
 * `tickets` table so every widget stays live.
 */
export function useDashboardMetrics() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listTicketsForMetrics();
        if (!cancelled) setTickets(data);
      } catch {
        if (!cancelled) setTickets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`dashboard:tickets:${crypto.randomUUID()}`)
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
  }, []);

  const metrics = useMemo(
    () => computeMetrics(tickets, user?.id),
    [tickets, user?.id]
  );

  return { tickets, metrics, loading };
}
