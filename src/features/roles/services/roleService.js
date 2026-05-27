import { supabase } from '../../../lib/supabase';
import { logAction } from '../../admin/services/systemLogsService';

/** CRUD for the `roles` table. RLS gates writes on `roles.manage`. */

const COLUMNS =
  'id, name, description, permissions, system_name, is_system, created_at, updated_at';

export async function listRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select(COLUMNS)
    .order('is_system', { ascending: false })
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getRole(id) {
  const { data, error } = await supabase
    .from('roles')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Create a custom (non-system) role. */
export async function createRole({ name, description, permissions }) {
  const { data, error } = await supabase
    .from('roles')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      permissions: permissions || {},
      system_name: 'staff',
      is_system: false,
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  logAction('role.create', data.name);
  return data;
}

/** Update name/description/permissions. System roles get name/description
 *  locked client-side but the server still accepts a permissions update. */
export async function updateRole(id, patch) {
  const clean = {};
  if (patch.name !== undefined) clean.name = String(patch.name).trim();
  if (patch.description !== undefined)
    clean.description = patch.description?.trim() || null;
  if (patch.permissions !== undefined) clean.permissions = patch.permissions;

  const { data, error } = await supabase
    .from('roles')
    .update(clean)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  logAction('role.update', data.name);
  return data;
}

export async function deleteRole(id) {
  const { data: existing } = await supabase
    .from('roles')
    .select('name, is_system')
    .eq('id', id)
    .maybeSingle();
  if (existing?.is_system) {
    throw new Error('System roles cannot be deleted.');
  }
  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) throw error;
  logAction('role.delete', existing?.name || id);
}
