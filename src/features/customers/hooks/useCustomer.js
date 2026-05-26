import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { getCustomer } from '../services/customerService';

/**
 * Single customer record, kept fresh via a realtime subscription filtered to
 * this id so edits from another tab show up immediately.
 */
export function useCustomer(id) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const data = await getCustomer(id);
        if (!cancelled) {
          setCustomer(data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load customer.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`customer:${id}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${id}`,
        },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  return { customer, loading, error };
}
