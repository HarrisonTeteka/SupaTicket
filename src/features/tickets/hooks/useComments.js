import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { listComments } from '../services/commentsService';

/**
 * Comments for a ticket, oldest-first, kept fresh via realtime. Any insert /
 * update / delete on the ticket's comments triggers a reload.
 */
export function useComments(ticketId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticketId) {
      setComments([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const reload = async () => {
      try {
        const data = await listComments(ticketId);
        if (!cancelled) {
          setComments(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    reload();

    const channel = supabase
      .channel(`comments:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `ticket_id=eq.${ticketId}`,
        },
        reload
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  return { comments, loading, error };
}
