import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { listCustomers } from '../services/customerService';

/**
 * Customer directory list, kept fresh via realtime so an import in one tab
 * appears in another within ~1s. `search` re-fetches with a server-side OR
 * filter on name/email/company/external_id. Server-paginated.
 */
export function useCustomers(search = '') {
  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reset to first page when search changes so results match intent.
  useEffect(() => { setPage(0); }, [search]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { customers: data, totalCount: count } = await listCustomers({ search, page, pageSize });
        if (!cancelled) {
          setCustomers(data);
          setTotalCount(count);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load customers.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`customers:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [search, page, pageSize]);

  return { customers, loading, error, page, setPage, pageSize, totalCount };
}
