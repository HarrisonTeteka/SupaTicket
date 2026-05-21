import { useSearchParams } from 'react-router-dom';
import { Building2, ScrollText, SlidersHorizontal, Tags, Users } from 'lucide-react';
import { StaffDirectory } from '../components/StaffDirectory';
import { CategoriesEditor } from '../components/CategoriesEditor';
import { DepartmentsEditor } from '../components/DepartmentsEditor';
import { CustomFieldsBuilder } from '../components/CustomFieldsBuilder';
import { SystemLogsView } from '../components/SystemLogsView';

const TABS = [
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'fields', label: 'Custom Fields', icon: SlidersHorizontal },
  { id: 'logs', label: 'Logs', icon: ScrollText },
];

/** Admin / System Settings page. Tab selection lives in `?tab=` search param. */
export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const active = TABS.some((t) => t.id === requested) ? requested : 'staff';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setParams({ tab: t.id })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                active === t.id
                  ? 'bg-white text-[#12344d] shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {active === 'staff' && <StaffDirectory />}
      {active === 'categories' && <CategoriesEditor />}
      {active === 'departments' && <DepartmentsEditor />}
      {active === 'fields' && <CustomFieldsBuilder />}
      {active === 'logs' && <SystemLogsView />}
    </div>
  );
}
