import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { listCustomers } from '../services/customerService';

/**
 * Customer directory list, kept fresh via realtime so an import in one tab
 * appears in another within ~1s. `search` re-fetches with a server-side OR
 * filter on name/email/company/external_id.
 */
export function useCustomers(search = '') {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await listCustomers({ search });
        if (!cancelled) setCustomers(data);
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
  }, [search]);

  return { customers, loading, error };
}
