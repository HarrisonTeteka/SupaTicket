/**
 * Canonical permission catalogue. The Roles editor renders a checkbox per
 * key; RLS policies and `useAuth().can(...)` checks reference the same keys.
 *
 * Adding a permission here is a two-step change: (1) add the key + label
 * below; (2) wire `has_permission(uid, 'new.key')` into the RLS policy or
 * the client gate that should respect it. The seed Admin role in
 * 0015_rbac.sql does NOT auto-pick up new keys, so when you add one bump
 * the seed too (or grant it manually in the Roles UI).
 */

export const PERMISSION_CATEGORIES = {
  Tickets: [
    { key: 'tickets.create', label: 'Create tickets' },
    { key: 'tickets.update', label: 'Update any ticket' },
    { key: 'tickets.delete', label: 'Delete tickets' },
    { key: 'tickets.assign', label: 'Assign tickets to others' },
    { key: 'tickets.bulk',   label: 'Bulk operations on tickets' },
  ],
  Comments: [
    { key: 'comments.post',     label: 'Post comments' },
    { key: 'comments.internal', label: 'Post internal notes' },
  ],
  Customers: [
    { key: 'customers.read',   label: 'View customer directory' },
    { key: 'customers.create', label: 'Create customers' },
    { key: 'customers.edit',   label: 'Edit customers' },
    { key: 'customers.delete', label: 'Delete customers' },
    { key: 'customers.import', label: 'Import customers from CSV' },
  ],
  'Users & roles': [
    { key: 'users.create',      label: 'Create users' },
    { key: 'users.edit',        label: 'Edit users' },
    { key: 'users.delete',      label: 'Delete users' },
    { key: 'users.assign_role', label: 'Change a user’s role' },
    { key: 'roles.manage',      label: 'Manage roles & permissions' },
  ],
  Configuration: [
    { key: 'config.categories',    label: 'Edit categories' },
    { key: 'config.departments',   label: 'Edit departments' },
    { key: 'config.custom_fields', label: 'Edit custom fields' },
    { key: 'config.sla',           label: 'Edit SLA rules' },
    { key: 'config.email',         label: 'Edit email settings' },
  ],
  Reports: [
    { key: 'logs.read',      label: 'View system logs' },
    { key: 'reports.export', label: 'Export reports' },
  ],
};

/** Every permission key, flattened. */
export const ALL_PERMISSIONS = Object.values(PERMISSION_CATEGORIES)
  .flat()
  .map((p) => p.key);

/** Convenience lookup: key -> label. */
export const PERMISSION_LABELS = Object.fromEntries(
  Object.values(PERMISSION_CATEGORIES)
    .flat()
    .map((p) => [p.key, p.label])
);

/** True if every value in the permission object is true. */
export function isFullAccess(permissions) {
  if (!permissions) return false;
  return ALL_PERMISSIONS.every((k) => permissions[k] === true);
}

/** Count of granted permissions in a role. */
export function countPermissions(permissions) {
  if (!permissions) return 0;
  return ALL_PERMISSIONS.filter((k) => permissions[k] === true).length;
}
