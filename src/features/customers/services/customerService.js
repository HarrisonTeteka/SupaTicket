import { supabase } from '../../../lib/supabase';
import { logAction } from '../../admin/services/systemLogsService';

/**
 * CRUD for CRM-imported customer records. Staff and admins can read/write;
 * portal customers have no access (RLS).
 */

const COLUMNS =
  'id, external_id, name, email, phone, company, ' +
  'address_line1, address_line2, city, state, postal_code, country, notes, ' +
  'created_by, created_at, updated_at';

const SEARCH_COLUMNS = 'id, external_id, name, email, company';

/** List customers, newest first, with optional substring filter (name/email/company/external_id). */
export async function listCustomers({ search } = {}) {
  let query = supabase
    .from('customers')
    .select(COLUMNS)
    .order('created_at', { ascending: false });

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(
      `name.ilike.${q},email.ilike.${q},company.ilike.${q},external_id.ilike.${q}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCustomer(id) {
  const { data, error } = await supabase
    .from('customers')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Search the directory for the ticket-form picker. Lean columns. */
export async function searchCustomers(query, limit = 20) {
  const q = String(query || '').trim();
  let req = supabase
    .from('customers')
    .select(SEARCH_COLUMNS)
    .order('name')
    .limit(limit);
  if (q) {
    const like = `%${q}%`;
    req = req.or(
      `name.ilike.${like},email.ilike.${like},company.ilike.${like},external_id.ilike.${like}`
    );
  }
  const { data, error } = await req;
  if (error) throw error;
  return data ?? [];
}

export async function createCustomer(input, actor) {
  const row = sanitize(input, actor);
  const { data, error } = await supabase
    .from('customers')
    .insert(row)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  logAction('customer.create', `${data.name} (${data.external_id})`);
  return data;
}

export async function updateCustomer(id, patch) {
  const clean = sanitize(patch);
  const { data, error } = await supabase
    .from('customers')
    .update(clean)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  logAction('customer.update', `${data.name} (${data.external_id})`);
  return data;
}

export async function deleteCustomer(id) {
  const { data: existing } = await supabase
    .from('customers')
    .select('name, external_id')
    .eq('id', id)
    .maybeSingle();
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
  logAction(
    'customer.delete',
    existing ? `${existing.name} (${existing.external_id})` : id
  );
}

/**
 * Bulk upsert customers keyed on external_id (case-insensitive). Postgres
 * `on conflict` needs a matching unique index — we created one on
 * lower(external_id) in 0014, but PostgREST's upsert path matches on the
 * literal column, so we do the dedupe in two steps: fetch existing rows by
 * external_id and split into inserts vs updates. Returns counts and any
 * per-row errors.
 *
 * Chunks of 500 rows so we never blow past the PostgREST request limit.
 */
export async function bulkUpsertCustomers(rows, actor) {
  const result = { inserted: 0, updated: 0, failed: [] };
  if (!rows.length) return result;

  const externalIds = rows.map((r) => r.external_id);
  const { data: existing, error: lookupErr } = await supabase
    .from('customers')
    .select('id, external_id')
    .in('external_id', externalIds);
  if (lookupErr) throw lookupErr;

  const existingByExtId = new Map(
    (existing ?? []).map((c) => [c.external_id.toLowerCase(), c.id])
  );

  const toInsert = [];
  const toUpdate = [];
  rows.forEach((row, idx) => {
    const sanitized = sanitize(row, actor);
    const existingId = existingByExtId.get(row.external_id.toLowerCase());
    if (existingId) toUpdate.push({ idx, id: existingId, row: sanitized });
    else toInsert.push({ idx, row: sanitized });
  });

  // Inserts in chunks of 500
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const payload = chunk.map((c) => c.row);
    const { error } = await supabase.from('customers').insert(payload);
    if (error) {
      // Don't lose the whole chunk on one bad row — retry per-row
      for (const c of chunk) {
        const { error: rowErr } = await supabase.from('customers').insert(c.row);
        if (rowErr) result.failed.push({ row: c.idx, message: rowErr.message });
        else result.inserted += 1;
      }
    } else {
      result.inserted += chunk.length;
    }
  }

  // Updates one-by-one — small batches, predictable error attribution.
  for (const u of toUpdate) {
    const { error } = await supabase
      .from('customers')
      .update(u.row)
      .eq('id', u.id);
    if (error) result.failed.push({ row: u.idx, message: error.message });
    else result.updated += 1;
  }

  logAction(
    'customer.import',
    `inserted=${result.inserted} updated=${result.updated} failed=${result.failed.length}`
  );

  return result;
}

/** Whitelist columns and trim strings; null out empty optional fields. */
function sanitize(input, actor) {
  const pick = (v) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  };
  const row = {
    external_id: pick(input.external_id),
    name: pick(input.name),
    email: pick(input.email),
    phone: pick(input.phone),
    company: pick(input.company),
    address_line1: pick(input.address_line1),
    address_line2: pick(input.address_line2),
    city: pick(input.city),
    state: pick(input.state),
    postal_code: pick(input.postal_code),
    country: pick(input.country),
    notes: pick(input.notes),
  };
  if (actor?.id) row.created_by = actor.id;
  // Don't send nulls for required columns; the DB CHECK / NOT NULL will reject.
  return row;
}
