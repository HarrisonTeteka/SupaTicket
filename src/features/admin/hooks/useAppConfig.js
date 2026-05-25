import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { getConfig } from '../services/appConfigService';

const EMPTY = { categories: [], departments: [], custom_fields: [] };

/**
 * The app_config singleton (categories, departments, custom fields), kept
 * fresh via realtime so edits in the admin UI propagate to every open client
 * — including the ticket form's category dropdown and custom fields.
 */
export function useAppConfig() {
  const [config, setConfig] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getConfig();
        if (!cancelled && data) {
          setConfig({
            categories: data.categories ?? [],
            departments: data.departments ?? [],
            custom_fields: data.custom_fields ?? [],
          });
        }
      } catch {
        /* keep last-known / empty config */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`app_config:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { config, loading };
}
