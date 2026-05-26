import { cn } from '../utils/classNames';

const TONES = {
  // Brand-aligned tones — moss green primary, tangerine accent, auburn alert.
  moss: 'bg-[#336021] text-white',
  tangerine: 'bg-[#F58202] text-white',
  cream: 'bg-[#F9EDCC] text-[#9E2A2B]',
  green: 'bg-emerald-100 text-[#336021]',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-[#9E2A2B]/10 text-[#9E2A2B]',
  gray: 'bg-gray-100 text-gray-600',
};

/** Compact KPI card: an icon chip, a big value and a label. */
export function StatCard({ icon: Icon, label, value, hint, tone = 'tangerine' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-md shadow-gray-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      {Icon && (
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
            TONES[tone] || TONES.tangerine
          )}
        >
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-3xl font-black text-[#336021] leading-none mb-1">{value}</p>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">
          {label}
        </p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
