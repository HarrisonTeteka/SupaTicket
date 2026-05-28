import { supabase } from '../../../lib/supabase';
import { logAction } from '../../../shared/services/systemLogsService';

/**
 * Reads and writes the `app_config` singleton row (id = 1): ticket
 * categories, departments and custom field definitions.
 */

const COLUMNS =
  'id, categories, departments, custom_fields, email_sender, sla_rules, overdue_after_days, updated_at';

export async function getConfig() {
  const { data, error } = await supabase
    .from('app_config')
    .select(COLUMNS)
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function patchConfig(patch) {
  const { data, error } = await supabase
    .from('app_config')
    .update(patch)
    .eq('id', 1)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategories(categories) {
  const data = await patchConfig({ categories });
  logAction('config.update', 'categories');
  return data;
}

export async function updateDepartments(departments) {
  const data = await patchConfig({ departments });
  logAction('config.update', 'departments');
  return data;
}

export async function updateCustomFields(customFields) {
  const data = await patchConfig({ custom_fields: customFields });
  logAction('config.update', 'custom_fields');
  return data;
}

export async function updateEmailSender(emailSender) {
  const data = await patchConfig({ email_sender: emailSender });
  logAction('config.update', 'email_sender');
  return data;
}

/**
 * Replace the per-priority SLA targets. Shape is mirrored from
 * migration 0009: `{ <priority>: { response_mins, resolution_mins } }`.
 * The DB trigger `tickets_compute_sla()` reads these on insert / priority
 * change to set `response_due_at` / `resolution_due_at` on each ticket.
 */
export async function updateSlaRules(slaRules) {
  const data = await patchConfig({ sla_rules: slaRules });
  logAction('config.update', 'sla_rules');
  return data;
}

/**
 * Update the "overdue" day threshold (migration 0022). Tickets older than
 * this (since created_at) and still in a non-terminal status get flipped
 * to status='Overdue' by the mark_overdue_tickets() pg_cron job. Pass 0
 * or null to disable.
 */
export async function updateOverdueAfterDays(days) {
  const data = await patchConfig({ overdue_after_days: days });
  logAction('config.update', 'overdue_after_days');
  return data;
}
