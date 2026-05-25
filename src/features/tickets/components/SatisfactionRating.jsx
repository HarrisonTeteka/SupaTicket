import { useState } from 'react';
import { Star } from 'lucide-react';
import { updateTicket } from '../services/ticketsService';

/**
 * 1-5 star CSAT control for a resolved ticket. Interactive when `canRate`
 * (the viewer is the ticket creator); read-only otherwise.
 */
export function SatisfactionRating({ ticket, canRate, onRated }) {
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const rating = ticket.satisfaction_rating || 0;

  const rate = async (value) => {
    if (!canRate || saving) return;
    setSaving(true);
    try {
      const updated = await updateTicket(ticket.id, { satisfaction_rating: value });
      onRated?.(updated);
    } catch {
      /* realtime reconciles */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
        Satisfaction
      </h3>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              disabled={!canRate || saving}
              onClick={() => rate(n)}
              onMouseEnter={() => canRate && setHover(n)}
              className={canRate ? 'cursor-pointer' : 'cursor-default'}
              title={canRate ? `Rate ${n} / 5` : `${rating} / 5`}
            >
              <Star
                size={20}
                className={filled ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
              />
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        {canRate
          ? rating
            ? 'Thanks for rating!'
            : 'Rate your experience with this ticket.'
          : rating
            ? `Rated ${rating} / 5`
            : 'Not yet rated.'}
      </p>
    </div>
  );
}
