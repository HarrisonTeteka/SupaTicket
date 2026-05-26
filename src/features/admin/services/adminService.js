import { supabase } from '../../../lib/supabase';
import { logAction } from './systemLogsService';

/**
 * Profile / staff management for the admin Staff Directory and the
 * EditProfileModal.
 */

const COLUMNS =
  'id, name, email, role, status, department, email_notifications, created_at, updated_at';

/** Staff and admins (customers are managed separately and excluded). */
export async function listStaff() {
  const { data, error } = await supabase
    .from('profiles')
    .select(COLUMNS)
    .in('role', ['staff', 'admin'])
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/**
 * Admin edit of any profile (name, role, status, department). The
 * profiles_update_admin RLS policy gates this to admins.
 */
export async function updateProfileAsAdmin(id, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  logAction('profile.update', `${data.email} role=${data.role} status=${data.status}`);
  return data;
}

/**
 * Self edit of one's own profile. The 0002 guard trigger enforces that a
 * non-admin can only change `name` here.
 */
export async function updateOwnProfile(id, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function archiveStaff(id) {
  return updateProfileAsAdmin(id, { status: 'archived' });
}

export async function restoreStaff(id) {
  return updateProfileAsAdmin(id, { status: 'active' });
}

export async function deleteStaff(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
  logAction('profile.delete', id);
}
