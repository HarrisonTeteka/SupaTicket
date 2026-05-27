import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { listRoles } from '../services/roleService';

/** All roles in the workspace, kept fresh via realtime. */
export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listRoles();
        if (!cancelled) setRoles(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load roles.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`roles:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roles' },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { roles, loading, error };
}
