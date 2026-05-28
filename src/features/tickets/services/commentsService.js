import { supabase } from '../../../lib/supabase';

/** Network-touching operations for ticket comments. */

const COMMENT_COLUMNS =
  'id, ticket_id, text, internal, original_text, edited_at, author_id, author_name, created_at, updated_at';

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

/**
 * Edit a comment's body. Captures the pre-edit text into `original_text`
 * on the first edit only (subsequent edits leave it alone), and stamps
 * `edited_at`. Two round-trips (read + update) — fine for a human-triggered
 * action. Migration 0021 added the columns.
 *
 * Robustness notes:
 * - maybeSingle() so a missing/RLS-hidden row produces a clean error
 *   instead of PostgREST's "cannot coerce the result" message.
 * - The UPDATE no longer chains `.select().single()`: when RLS allows
 *   UPDATE but the RETURNING row is hidden by the SELECT policy, the
 *   returned rowset is empty and `.single()` errors. The useComments()
 *   realtime channel re-fetches on UPDATE anyway, so the UI refreshes
 *   without us round-tripping the row.
 */
export async function updateComment(id, text) {
  const { data: existing, error: fetchError } = await supabase
    .from('comments')
    .select('text, original_text')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error('Comment not found (it may have been deleted).');

  const update = {
    text: text.trim(),
    edited_at: new Date().toISOString(),
  };
  if (!existing.original_text) {
    update.original_text = existing.text;
  }

  const { error, count } = await supabase
    .from('comments')
    .update(update, { count: 'exact' })
    .eq('id', id);
  if (error) throw error;
  if (count === 0) {
    throw new Error("You can't edit this comment — only the author can.");
  }
}

export async function deleteComment(id) {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}
