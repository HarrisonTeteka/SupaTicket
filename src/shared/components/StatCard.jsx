import { cn } from '../utils/classNames';

const TONES = {
  navy: 'bg-[#12344d] text-white',
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
  gray: 'bg-gray-100 text-gray-500',
};

/** Compact KPI card: an icon chip, a big value and a label. */
export function StatCard({ icon: Icon, label, value, hint, tone = 'indigo' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
      {Icon && (
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
            TONES[tone] || TONES.indigo
          )}
        >
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-black text-[#12344d] leading-tight">{value}</p>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide truncate">
          {label}
        </p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
