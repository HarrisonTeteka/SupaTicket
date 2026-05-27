import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/components/AuthGate';
import {
  getDashboardMetrics,
  listMyOpenTickets,
  listRecentTickets,
} from '../services/dashboardService';

/**
 * Dashboard data: aggregated KPIs (server-side RPC) plus two small
 * bounded row lists (recent + my open). All three refresh on any change
 * to the `tickets` table.
 */
export function useDashboardMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({});
  const [recent, setRecent] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id;

    const load = async () => {
      try {
        const [m, r, my] = await Promise.all([
          getDashboardMetrics(userId),
          listRecentTickets(6),
          listMyOpenTickets(userId),
        ]);
        if (!cancelled) {
          setMetrics(m);
          setRecent(r);
          setMine(my);
        }
      } catch {
        if (!cancelled) {
          setMetrics({});
          setRecent([]);
          setMine([]);
        }
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
  }, [user?.id]);

  return { metrics, recent, mine, loading };
}
