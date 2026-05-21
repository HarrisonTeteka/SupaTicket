import { supabase } from '../../../lib/supabase';
import { deriveNameFromEmail } from './auth.utils';
import { logAction } from '../../admin/services/systemLogsService';

/**
 * All network-touching auth operations live here. Hooks and components
 * should call these instead of using the supabase client directly, so
 * we have a single place to add logging / error handling later.
 */

export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  logAction('auth.login', email.trim());
  return data;
}

export async function signUpWithEmail({ email, password, name }) {
  const cleanEmail = email.trim();
  const displayName = (name && name.trim()) || deriveNameFromEmail(cleanEmail);

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      // Stored on auth.users.raw_user_meta_data; the on_auth_user_created
      // trigger uses this to seed profiles.name.
      data: { name: displayName },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Fallback: if the on_auth_user_created trigger ever didn't fire for the
 * signed-in user (e.g. accounts created before the migration was applied),
 * insert a minimal profile row. The first user with no profile becomes admin.
 *
 * Idempotent — a unique-violation on profiles.id is swallowed.
 */
export async function ensureProfileExists(authUser) {
  if (!authUser?.id) return null;

  // Cheap check first.
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, name, email, role, status, department')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) return existing;

  // Decide role: first profile in the table becomes admin.
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  const role = (count ?? 0) === 0 ? 'admin' : 'staff';

  const name =
    authUser.user_metadata?.name?.trim() ||
    deriveNameFromEmail(authUser.email);

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id,
      name,
      email: authUser.email ?? '',
      role,
      status: 'active',
    })
    .select('id, name, email, role, status, department')
    .single();

  // If another tab raced us and inserted first, just re-read.
  if (error && error.code === '23505') {
    const { data: again } = await supabase
      .from('profiles')
      .select('id, name, email, role, status, department')
      .eq('id', authUser.id)
      .maybeSingle();
    return again;
  }
  if (error) throw error;
  return data;
}
