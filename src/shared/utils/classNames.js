/** Join truthy class fragments into one className string. */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}
