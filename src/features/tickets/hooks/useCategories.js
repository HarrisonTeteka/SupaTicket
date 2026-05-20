import { useEffect, useState } from 'react';
import { listCategories } from '../services/ticketsService';

/**
 * Workspace ticket categories from `app_config`. Fetched once on mount.
 * Phase 4 adds the categories editor + realtime; for now this is read-only.
 */
export function useCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
