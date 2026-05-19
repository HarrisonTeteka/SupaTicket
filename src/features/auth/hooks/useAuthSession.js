import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * Single source of truth for the current auth session.
 * Mirrors Gemini's onAuthStateChanged effect, but using Supabase.
 *
 * Returns:
 *   - session: the supabase Session object, or null when signed out
 *   - user:    convenience accessor for session.user
 *   - loading: true until the first getSession() resolves, so the UI
 *              can show a splash instead of flashing the login screen
 */
export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}
