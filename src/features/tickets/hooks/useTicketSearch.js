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
    if (!q) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchTickets(q);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, delay]);

  return { results, loading };
}
