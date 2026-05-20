import { supabase } from '../../../lib/supabase';

/** Network-touching operations for the current user's notifications. */

const COLUMNS = 'id, user_id, message, read, created_at';

/** Most recent notifications for a user, newest first. */
export async function listForUser(userId, limit = 30) {
  const { data, error } = await supabase
    .from('notifications')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function markRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function remove(id) {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}
