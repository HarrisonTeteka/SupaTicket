import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Contact,
  FileBarChart2,
  Mail,
  ScrollText,
  Shield,
  SlidersHorizontal,
  Tags,
  Users,
} from 'lucide-react';

// Each admin tab pulls a distinct slice of code (Reports drags CSV export
// logic, Logs drags the paginated reader, etc.). Lazy-loading each tab
// keeps the AdminPage entry chunk small — only the chosen tab loads.
const StaffDirectory = lazy(() =>
  import('../components/StaffDirectory').then((m) => ({ default: m.StaffDirectory }))
);
const RolesEditor = lazy(() =>
  import('../../roles/components/RolesEditor').then((m) => ({ default: m.RolesEditor }))
);
const CustomersList = lazy(() =>
  import('../../customers/components/CustomersList').then((m) => ({ default: m.CustomersList }))
);
const CategoriesEditor = lazy(() =>
  import('../components/CategoriesEditor').then((m) => ({ default: m.CategoriesEditor }))
);
const DepartmentsEditor = lazy(() =>
  import('../components/DepartmentsEditor').then((m) => ({ default: m.DepartmentsEditor }))
);
const CustomFieldsBuilder = lazy(() =>
  import('../components/CustomFieldsBuilder').then((m) => ({ default: m.CustomFieldsBuilder }))
);
const EmailSettingsEditor = lazy(() =>
  import('../components/EmailSettingsEditor').then((m) => ({ default: m.EmailSettingsEditor }))
);
const SystemLogsView = lazy(() =>
  import('../components/SystemLogsView').then((m) => ({ default: m.SystemLogsView }))
);
const ReportsPage = lazy(() => import('../../reports/pages/ReportsPage'));

const TABS = [
  { id: 'staff', label: 'Staff', icon: Users, component: StaffDirectory },
  { id: 'roles', label: 'Roles', icon: Shield, component: RolesEditor },
  { id: 'customers', label: 'Customers', icon: Contact, component: CustomersList },
  { id: 'categories', label: 'Categories', icon: Tags, component: CategoriesEditor },
  { id: 'departments', label: 'Departments', icon: Building2, component: DepartmentsEditor },
  { id: 'fields', label: 'Custom Fields', icon: SlidersHorizontal, component: CustomFieldsBuilder },
  { id: 'email', label: 'Email', icon: Mail, component: EmailSettingsEditor },
  { id: 'reports', label: 'Reports', icon: FileBarChart2, component: ReportsPage },
  { id: 'logs', label: 'Logs', icon: ScrollText, component: SystemLogsView },
];

/** Admin / System Settings page. Tab selection lives in `?tab=` search param. */
export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const active = TABS.some((t) => t.id === requested) ? requested : 'staff';
  const ActiveTab = TABS.find((t) => t.id === active)?.component;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 bg-surface-2 rounded-xl p-1 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setParams({ tab: t.id })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                active === t.id
                  ? 'bg-surface text-brand-primary shadow-sm'
                  : 'text-fg-secondary hover:text-fg'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <Suspense fallback={<TabLoader />}>
        {ActiveTab && <ActiveTab />}
      </Suspense>
    </div>
  );
}

function TabLoader() {
  return (
    <div className="h-40 bg-surface border border-line-strong rounded-2xl animate-pulse" />
  );
}
