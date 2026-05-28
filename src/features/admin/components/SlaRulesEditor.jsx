import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Save, Timer } from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../../auth/components/AuthGate';
import { updateOverdueAfterDays, updateSlaRules } from '../services/appConfigService';
import { TICKET_PRIORITIES } from '../../tickets/tickets.utils';
import { PriorityBadge } from '../../tickets/components/PriorityBadge';
import { Button } from '../../../shared/components/Button';
import { Select } from '../../../shared/components/Select';
import { Input } from '../../../shared/components/Input';
import { EmptyState } from '../../../shared/components/EmptyState';

const UNIT_OPTIONS = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours',   label: 'hours' },
  { value: 'days',    label: 'days' },
];

const UNIT_TO_MINS = { minutes: 1, hours: 60, days: 1440 };

/** Smart unit pick: prefer the largest unit that divides evenly. */
function minsToReadable(totalMins) {
  if (totalMins == null) return { value: 0, unit: 'minutes' };
  if (totalMins % 1440 === 0) return { value: totalMins / 1440, unit: 'days' };
  if (totalMins % 60 === 0) return { value: totalMins / 60, unit: 'hours' };
  return { value: totalMins, unit: 'minutes' };
}

function readableToMins({ value, unit }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * (UNIT_TO_MINS[unit] || 1));
}

function rulesFromConfig(configRules) {
  // Mirror migration 0009 shape, defensive against missing priorities.
  const out = {};
  for (const p of TICKET_PRIORITIES) {
    const r = configRules?.[p] || {};
    out[p] = {
      response: minsToReadable(r.response_mins ?? 0),
      resolution: minsToReadable(r.resolution_mins ?? 0),
    };
  }
  return out;
}

function configFromRules(uiRules) {
  const out = {};
  for (const p of TICKET_PRIORITIES) {
    const r = uiRules[p] || { response: {}, resolution: {} };
    out[p] = {
      response_mins: readableToMins(r.response),
      resolution_mins: readableToMins(r.resolution),
    };
  }
  return out;
}

/**
 * Admin SLA tab: edits the per-priority response / resolution targets
 * stored in `app_config.sla_rules` (migration 0009). The DB trigger
 * `tickets_compute_sla()` reads these on every insert + priority change,
 * so edits take effect on new tickets immediately. Existing tickets keep
 * their already-computed `response_due_at` / `resolution_due_at` (they
 * recompute only if their priority changes again).
 *
 * Gated by the `config.sla` permission.
 */
export function SlaRulesEditor() {
  const { config, loading } = useAppConfig();
  const { can } = useAuth();
  const canEdit = can ? can('config.sla') : false;

  const initial = useMemo(() => rulesFromConfig(config.sla_rules), [config.sla_rules]);
  const [draft, setDraft] = useState(initial);
  const [overdueDraft, setOverdueDraft] = useState(String(config.overdue_after_days ?? 7));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  // Re-seed draft when the realtime channel ships an external change.
  useEffect(() => {
    setDraft(initial);
  }, [initial]);
  useEffect(() => {
    setOverdueDraft(String(config.overdue_after_days ?? 7));
  }, [config.overdue_after_days]);

  const dirty = useMemo(
    () =>
      JSON.stringify(draft) !== JSON.stringify(initial) ||
      Number(overdueDraft) !== (config.overdue_after_days ?? 7),
    [draft, initial, overdueDraft, config.overdue_after_days]
  );

  const setField = (priority, kind, key) => (e) => {
    setDraft((d) => ({
      ...d,
      [priority]: {
        ...d[priority],
        [kind]: { ...d[priority][kind], [key]: e.target.value },
      },
    }));
  };

  const save = async () => {
    setError('');
    const nextOverdue = Math.max(0, Math.floor(Number(overdueDraft) || 0));
    setSaving(true);
    try {
      await updateSlaRules(configFromRules(draft));
      if (nextOverdue !== (config.overdue_after_days ?? 7)) {
        await updateOverdueAfterDays(nextOverdue);
      }
      setSavedAt(new Date());
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-40 bg-surface border border-line-strong rounded-2xl animate-pulse" />;
  }

  if (!canEdit) {
    return (
      <EmptyState
        icon={Timer}
        title="Read-only"
        description="You don't have the config.sla permission. Ask an admin to grant it."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-black text-brand-primary uppercase tracking-wide">
            SLA targets per priority
          </h2>
          <p className="text-xs text-fg-muted mt-1">
            Applied to new tickets on creation. Existing tickets keep their
            current due dates unless their priority changes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && !dirty && (
            <span className="text-xs text-emerald-700">Saved</span>
          )}
          <Button onClick={save} loading={saving} disabled={!dirty}>
            <Save size={14} /> Save changes
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {TICKET_PRIORITIES.map((priority) => (
          <div
            key={priority}
            className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr] gap-3 sm:gap-4 items-end p-4 bg-surface border border-line-strong rounded-2xl"
          >
            <div className="flex items-center">
              <PriorityBadge priority={priority} />
            </div>
            <DurationField
              label="First response within"
              data={draft[priority]?.response}
              onChangeValue={setField(priority, 'response', 'value')}
              onChangeUnit={setField(priority, 'response', 'unit')}
            />
            <DurationField
              label="Resolution within"
              data={draft[priority]?.resolution}
              onChangeValue={setField(priority, 'resolution', 'value')}
              onChangeUnit={setField(priority, 'resolution', 'unit')}
            />
          </div>
        ))}
      </div>

      <div className="p-4 bg-surface border border-line-strong rounded-2xl space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-brand-primary uppercase tracking-wide">
          <AlertTriangle size={14} /> Overdue threshold
        </h3>
        <p className="text-xs text-fg-muted">
          Tickets older than this (since creation) get flipped to status
          <strong> Overdue</strong> by a scheduled job. Set to <strong>0</strong> to
          disable. Terminal statuses (Resolved / Closed) are never touched.
        </p>
        <div className="grid grid-cols-[1fr_120px] gap-2 max-w-xs">
          <Input
            type="number"
            min="0"
            step="1"
            value={overdueDraft}
            onChange={(e) => setOverdueDraft(e.target.value)}
          />
          <div className="flex items-center px-3 py-3 bg-surface-2 rounded-xl text-sm text-fg-secondary border border-line-strong">
            days
          </div>
        </div>
      </div>
    </div>
  );
}

function DurationField({ label, data, onChangeValue, onChangeUnit }) {
  return (
    <div>
      <label className="text-xs font-semibold text-fg-muted uppercase tracking-widest block mb-2">
        {label}
      </label>
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <Input
          type="number"
          min="0"
          step="1"
          value={data?.value ?? 0}
          onChange={onChangeValue}
        />
        <Select
          value={data?.unit ?? 'minutes'}
          onChange={onChangeUnit}
          options={UNIT_OPTIONS}
        />
      </div>
    </div>
  );
}
