import { supabase } from '../../../lib/supabase';

/** Network-touching operations for ticket comments. */

const COMMENT_COLUMNS =
  'id, ticket_id, text, internal, author_id, author_name, created_at, updated_at';

export async function listComments(ticketId) {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Add a comment. `actor` is the current user's profile. RLS requires
 * author_id = auth.uid(), so the actor must be the signed-in user.
 */
export async function addComment({ ticketId, text, internal = false }, actor) {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      ticket_id: ticketId,
      text: text.trim(),
      internal,
      author_id: actor?.id ?? null,
      author_name: actor?.name ?? null,
    })
    .select(COMMENT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateComment(id, text) {
  const { data, error } = await supabase
    .from('comments')
    .update({ text: text.trim() })
    .eq('id', id)
    .select(COMMENT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComment(id) {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}
