/**
 * Small pure helpers shared by the auth feature.
 * Anything that touches the network goes in authService.js;
 * anything that reads cross-feature constants goes in shared/utils/constants.js.
 */

export function deriveNameFromEmail(email) {
  if (!email || typeof email !== 'string') return 'User';
  const local = email.split('@')[0] || 'User';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Has this profile row been loaded into a usable shape?
 * Mirrors Gemini's `userData` ready-check in a single place.
 */
export function isProfileReady(profile) {
  return Boolean(profile && profile.id && profile.role && profile.status);
}

export function isAdminProfile(profile) {
  return profile?.role === 'admin';
}
