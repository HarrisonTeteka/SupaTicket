import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ensureProfileExists } from '../services/authService';

const PROFILE_COLUMNS = 'id, name, email, role, status, department, created_at, updated_at';

/**
 * Fetches the current user's profile row and keeps it in sync via realtime.
 * Equivalent to Gemini's second auth useEffect (the `userRef` snapshot listener
 * plus the "auto-create profile if missing" fallback).
 */
export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const loadInitial = async () => {
      try {
        const { data, error: selectError } = await supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', userId)
          .maybeSingle();

        if (cancelled) return;
        if (selectError) throw selectError;

        if (data) {
          setProfile(data);
          setLoading(false);
          return;
        }

        // Fallback: trigger should have created the row, but if not, create it.
        const { data: sessionData } = await supabase.auth.getUser();
        if (cancelled) return;
        const created = await ensureProfileExists(sessionData.user);
        if (cancelled) return;
        setProfile(created);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      }
    };

    loadInitial();

    // Live updates to the user's own profile row (role/status changes by admin, etc.)
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === 'DELETE') {
            setProfile(null);
          } else if (payload.new) {
            setProfile(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { profile, loading, error, setProfile };
}
