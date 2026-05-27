import { supabase } from '../../../lib/supabase';

/**
 * Calls the admin-create-user Edge Function. The caller's bearer token is
 * forwarded automatically by supabase.functions.invoke so the function can
 * verify the user via `has_permission(uid, 'users.create')`.
 *
 * Returns `{ id, warning? }`. Throws with a useful message on 4xx/5xx.
 */
export async function createUserAsAdmin({
  email,
  name,
  role_id,
  department,
  send_invite = true,
  password,
}) {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: { email, name, role_id, department, send_invite, password },
  });
  if (error) {
    // FunctionsHttpError carries a `context` with the response body; surface
    // the server's `error` field when present.
    let serverMessage = '';
    try {
      const body = await error.context?.json?.();
      serverMessage = body?.error || '';
    } catch (_) {
      // ignore
    }
    throw new Error(serverMessage || error.message || 'Could not create user.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
