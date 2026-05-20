import { Badge } from '../../../shared/components/Badge';
import { statusColor } from '../tickets.utils';

/** Coloured pill for a ticket status. */
export function StatusBadge({ status }) {
  return <Badge className={statusColor(status)}>{status}</Badge>;
}
