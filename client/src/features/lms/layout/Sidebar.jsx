import { NavLink } from 'react-router-dom';
import {
  getRoleNavigation,
  LMS_ROLES,
} from '../config/role-navigation.js';

const ROLE_LABELS = {
  [LMS_ROLES.SUPER_ADMIN]: 'Super Admin',
  [LMS_ROLES.HOD]: 'Head of Department',
  [LMS_ROLES.FACULTY]: 'Faculty',
  [LMS_ROLES.MENTOR]: 'Mentor / TG',
  [LMS_ROLES.STUDENT]: 'Student',
  [LMS_ROLES.ALUMNI]: 'Alumni',
};

const GROUP_LABELS = {
  main: 'MAIN MENU',
  administration: 'ADMINISTRATION',
  department: 'DEPARTMENT',
  academics: 'ACADEMICS',
  teaching: 'TEACHING',
  assessment: 'ASSESSMENT',
  mentoring: 'MENTORING',
  learning: 'LEARNING',
  account: 'ACCOUNT',
};

function getInitials(label) {
  return label
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function NavigationItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.path}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-xl px-3 py-2.5',
          'text-sm font-medium transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          isActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')
      }
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 group-hover:bg-white"
      >
        {getInitials(item.label)}
      </span>

      <span className="min-w-0 flex-1 truncate">
        {item.label}
      </span>
    </NavLink>
  );
}

export default function Sidebar({
  role = LMS_ROLES.SUPER_ADMIN,
  isOpen = true,
  onNavigate,
  onClose,
}) {
  const navigation = getRoleNavigation(role);

  const roleLabel =
    ROLE_LABELS[role] ?? 'Aacharya LMS';

  const groupedNavigation = navigation.reduce(
    (groups, item) => {
      const group = item.group || 'main';

      if (!groups[group]) {
        groups[group] = [];
      }

      groups[group].push(item);

      return groups;
    },
    {},
  );

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        aria-label="Main navigation"
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col',
          'border-r border-slate-200 bg-white',
          'transition-transform duration-200 ease-in-out',
          'lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white"
            >
              A
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight text-slate-900">
                Aacharya LMS
              </p>

              <p className="truncate text-xs text-slate-500">
                Learning Management
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
            onClick={onClose}
          >
            <span aria-hidden="true" className="text-lg">
              ×
            </span>
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-slate-800">
            {roleLabel}
          </p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {Object.entries(groupedNavigation).map(
            ([group, items]) => (
              <section key={group}>
                <h2 className="mb-2 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-400">
                  {GROUP_LABELS[group] || group.toUpperCase()}
                </h2>

                <div className="space-y-1">
                  {items.map((item) => (
                    <NavigationItem
                      key={item.id}
                      item={item}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </section>
            ),
          )}

          {navigation.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No navigation items are available for this role.
            </p>
          )}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">
              Aacharya LMS
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Academic workspace
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}