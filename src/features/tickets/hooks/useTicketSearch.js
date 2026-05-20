import { useEffect, useState } from 'react';
import { searchTickets } from '../services/ticketsService';

/**
 * Debounced ticket search, used by the topbar search box. Returns up to ten
 * matches; an empty query clears the results without hitting the network.
 */
export function useTicketSearch(query, delay = 200) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = String(query || '').trim();
    let cancelled = false;

    const run = async () => {
      if (!q) {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const data = await searchTickets(q);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(run, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, delay]);

  return { results, loading };
}
