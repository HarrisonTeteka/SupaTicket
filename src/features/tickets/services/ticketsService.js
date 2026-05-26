import { supabase } from '../../../lib/supabase';
import { looksLikeTicketNumber, TERMINAL_STATUSES } from '../tickets.utils';
import { logAction } from '../../../shared/services/systemLogsService';

/**
 * All network-touching ticket operations. Components and hooks call these
 * instead of using the supabase client directly.
 */

// Explicit column list — excludes the generated `fts` tsvector column.
// `customer:customers(...)` joins the linked CRM customer when present so the
// UI can render their name/company without a second round-trip.
const TICKET_COLUMNS =
  'id, ticket_number, title, description, category, priority, status, ' +
  'parent_id, assigned_to, assignee_name, attachments, custom_data, tags, ' +
  'created_by, creator_name, creator_role, created_at, updated_at, ' +
  'resolved_at, first_response_at, satisfaction_rating, ' +
  'response_due_at, resolution_due_at, customer_id, ' +
  'customer:customers(id, external_id, name, email, phone, company)';

/**
 * List tickets, newest first. `filters` keys: status, priority, assigned_to,
 * category. `parentId` of `null` returns only top-level tickets; a uuid
 * returns that ticket's sub-tickets.
 */
export async function listTickets(filters = {}) {
  let query = supabase
    .from('tickets')
    .select(TICKET_COLUMNS)
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.tag) query = query.contains('tags', [filters.tag]);
  if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);

  if (filters.parentId === null) query = query.is('parent_id', null);
  else if (filters.parentId) query = query.eq('parent_id', filters.parentId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTicket(id) {
  const { data, error } = await supabase
    .from('tickets')
    .select(TICKET_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listSubTickets(parentId) {
  return listTickets({ parentId });
}

/**
 * Insert a ticket. `actor` is the current user's profile ({ id, name }); it
 * stamps created_by / creator_name (denormalised so display survives a user
 * deletion — see PHASES.md).
 */
export async function createTicket(input, actor) {
  const row = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    priority: input.priority || 'Medium',
    status: input.status || 'Open',
    parent_id: input.parent_id || null,
    assigned_to: input.assigned_to || null,
    assignee_name: input.assignee_name || null,
    custom_data: input.custom_data || {},
    tags: input.tags || [],
    customer_id: input.customer_id || null,
    created_by: actor?.id ?? null,
    creator_name: actor?.name ?? null,
    creator_role: actor?.role ?? null,
  };
  const { data, error } = await supabase
    .from('tickets')
    .insert(row)
    .select(TICKET_COLUMNS)
    .single();
  if (error) throw error;
  logAction('ticket.create', `#${data.ticket_number}`);
  return data;
}

/**
 * Patch a ticket. Pass only the fields that change. When `assigned_to`
 * changes, also pass `assignee_name` so the denormalised copy stays in sync.
 */
export async function updateTicket(id, patch) {
  const { data: current, error: fetchError } = await supabase
    .from('tickets')
    .select('status')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;
  if (TERMINAL_STATUSES.includes(current.status)) {
    throw new Error('This ticket is resolved or closed and cannot be edited.');
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(patch)
    .eq('id', id)
    .select(TICKET_COLUMNS)
    .single();
  if (error) throw error;
  logAction('ticket.update', `#${data.ticket_number}`);
  return data;
}

export async function deleteTicket(id) {
  // Capture the ticket number first so the audit log entry is meaningful.
  const { data: existing } = await supabase
    .from('tickets')
    .select('ticket_number')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) throw error;
  logAction('ticket.delete', existing ? `#${existing.ticket_number}` : id);
}

/** Every distinct tag in use across the workspace, sorted alphabetically. */
export async function listAllTags() {
  const { data, error } = await supabase.from('tickets').select('tags');
  if (error) throw error;
  const set = new Set();
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) set.add(tag);
  }
  return Array.from(set).sort();
}

/** Active staff/admin profiles a ticket can be assigned to (excludes customers). */
export async function listAssignees() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, department')
    .eq('status', 'active')
    .in('role', ['staff', 'admin'])
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/**
 * Search tickets for the topbar: an all-digit query is matched exactly
 * against ticket_number; anything else is a full-text query over `fts`.
 */
export async function searchTickets(query) {
  const q = String(query).trim();
  if (!q) return [];

  const columns = 'id, ticket_number, title, status, priority';

  if (looksLikeTicketNumber(q)) {
    const { data, error } = await supabase
      .from('tickets')
      .select(columns)
      .eq('ticket_number', Number(q))
      .limit(10);
    if (error) throw error;
    return data ?? [];
  }

  const { data, error } = await supabase
    .from('tickets')
    .select(columns)
    .textSearch('fts', q, { type: 'websearch' })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
