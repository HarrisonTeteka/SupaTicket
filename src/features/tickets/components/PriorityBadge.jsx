import { Badge } from '../../../shared/components/Badge';
import { priorityColor } from '../tickets.utils';

/** Coloured pill for a ticket priority. */
export function PriorityBadge({ priority }) {
  return <Badge className={priorityColor(priority)}>{priority}</Badge>;
}
