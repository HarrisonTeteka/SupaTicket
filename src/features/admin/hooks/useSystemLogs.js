import { useCallback, useEffect, useState } from 'react';
import { listLogs } from '../services/systemLogsService';

const PAGE_SIZE = 25;

/**
 * Paginated, filterable system-log reader for the admin Logs tab. Owns its
 * own filter + page state; changing filters resets to the first page.
 */
export function useSystemLogs() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [logs, setLogs] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await listLogs({
          ...JSON.parse(filterKey),
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        if (!cancelled) {
          setLogs(result.logs);
          setCount(result.count);
        }
      } catch {
        if (!cancelled) {
          setLogs([]);
          setCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [filterKey, page]);

  const applyFilters = useCallback((next) => {
    setFilters(next);
    setPage(0);
  }, []);

  return {
    logs,
    count,
    loading,
    page,
    setPage,
    filters,
    setFilters: applyFilters,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)),
  };
}
