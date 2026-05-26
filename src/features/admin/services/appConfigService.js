import { supabase } from '../../../lib/supabase';
import { logAction } from '../../../shared/services/systemLogsService';

/**
 * Reads and writes the `app_config` singleton row (id = 1): ticket
 * categories, departments and custom field definitions.
 */

const COLUMNS =
  'id, categories, departments, custom_fields, email_sender, updated_at';

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
