import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { listStaff } from '../services/adminService';

/**
 * Every profile in the workspace, kept fresh via realtime so a role/status
 * change is reflected immediately in the Staff Directory.
 */
export function useStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listStaff();
        if (!cancelled) setStaff(data);
      } catch {
        if (!cancelled) setStaff([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel('staff:profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { staff, loading };
}
