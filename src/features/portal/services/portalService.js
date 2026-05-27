import { supabase } from '../../../lib/supabase';
import { logAction } from '../../../shared/services/systemLogsService';

/**
 * Network operations scoped to the current customer. RLS already restricts
 * customers to their own tickets and non-internal comments — these helpers
 * just keep the column lists lean.
 */

const PORTAL_TICKET_COLUMNS =
  'id, ticket_number, title, description, category, priority, status, ' +
  'assigned_to, assignee_name, attachments, tags, created_at, updated_at, ' +
  'resolved_at, satisfaction_rating, response_due_at, resolution_due_at';

const PORTAL_COMMENT_COLUMNS =
  'id, ticket_id, text, author_id, author_name, created_at';

export async function listMyTickets(userId) {
  const { data, error } = await supabase
    .from('tickets')
    .select(PORTAL_TICKET_COLUMNS)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMyTicket(id, userId) {
  if (!userId) throw new Error('getMyTicket requires a userId');
  const { data, error } = await supabase
    .from('tickets')
    .select(PORTAL_TICKET_COLUMNS)
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createMyTicket(input, actor) {
  const row = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    priority: input.priority || 'Medium',
    status: 'Open',
    created_by: actor?.id ?? null,
    creator_name: actor?.name ?? null,
    creator_role: actor?.role ?? null,
  };
  const { data, error } = await supabase
    .from('tickets')
    .insert(row)
    .select(PORTAL_TICKET_COLUMNS)
    .single();
  if (error) throw error;
  logAction('ticket.create', `#${data.ticket_number}`);
  return data;
}

export async function listMyComments(ticketId) {
  const { data, error } = await supabase
    .from('comments')
    .select(PORTAL_COMMENT_COLUMNS)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addMyComment({ ticketId, text }, actor) {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      ticket_id: ticketId,
      text: text.trim(),
      internal: false,
      author_id: actor?.id ?? null,
      author_name: actor?.name ?? null,
    })
    .select(PORTAL_COMMENT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

/** Customer rating on their own resolved ticket (1-5). */
export async function rateMyTicket(id, rating) {
  const { data, error } = await supabase
    .from('tickets')
    .update({ satisfaction_rating: rating })
    .eq('id', id)
    .select(PORTAL_TICKET_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

/** Categories the customer can pick from when raising a ticket. */
export async function listPortalCategories() {
  // RLS blocks customer reads of app_config, so we fall back to a stable
  // built-in set. Phase 8 keeps this simple; a future phase can expose a
  // public_categories view via SECURITY DEFINER if we want admin control.
  return ['Technical', 'Account', 'Billing', 'General', 'Feedback'];
}
