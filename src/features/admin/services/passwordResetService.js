import { supabase } from '../../../lib/supabase';

/**
 * Calls the admin-reset-password Edge Function. The caller's bearer token
 * is forwarded automatically by supabase.functions.invoke so the function
 * can verify the user via `has_permission(uid, 'users.reset_password')`.
 *
 * Throws with the server's error message on 4xx/5xx.
 */
export async function resetUserPasswordAsAdmin({ user_id, new_password }) {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', {
    body: { user_id, new_password },
  });
  if (error) {
    let serverMessage = '';
    try {
      const body = await error.context?.json?.();
      serverMessage = body?.error || '';
    } catch (_) {
      // ignore
    }
    throw new Error(serverMessage || error.message || 'Could not reset password.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
