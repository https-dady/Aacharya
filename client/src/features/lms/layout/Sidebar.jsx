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
          'focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2',
          'focus-visible:ring-offset-[#14161C]',
          isActive
            ? 'border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]'
            : 'border border-transparent text-[#A4A4AF] hover:bg-[#26272B] hover:text-[#EAEAE6]',
        ].join(' ')
      }
    >
      <span
        aria-hidden="true"
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          'text-xs font-semibold transition-colors',
          'group-hover:bg-[#383943]',
          'group-hover:text-[#EAEAE6]',
        ].join(' ')}
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

  const roleLabel = ROLE_LABELS[role] ?? 'Aacharya LMS';

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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="lms-sidebar"
        aria-label="Main navigation"
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col',
          'border-r border-[#383943] bg-[#14161C]',
          'transition-transform duration-200 ease-in-out',
          'lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-[#383943] px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7] text-lg font-bold text-[#14161C]"
            >
              A
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight text-[#EAEAE6]">
                Aacharya LMS
              </p>

              <p className="truncate text-[10px] font-semibold tracking-[0.12em] text-[#A4A4AF]">
                LEARNING MANAGEMENT
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            className={[
              'rounded-lg p-2 text-[#A4A4AF]',
              'transition-colors hover:bg-[#26272B]',
              'hover:text-[#EAEAE6]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7] lg:hidden',
            ].join(' ')}
            onClick={onClose}
          >
            <span aria-hidden="true" className="text-lg">
              ×
            </span>
          </button>
        </div>

        <div className="border-b border-[#383943] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#858590]">
            Workspace
          </p>

          <p className="mt-2 truncate text-sm font-semibold text-[#E5DF98]">
            {roleLabel}
          </p>
        </div>

        <nav
          aria-label="Workspace navigation"
          className="flex-1 space-y-6 overflow-y-auto px-4 py-5"
        >
          {Object.entries(groupedNavigation).map(
            ([group, items]) => (
              <section key={group}>
                <h2 className="mb-2 px-3 text-[10px] font-bold tracking-[0.16em] text-[#858590]">
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
            <p className="rounded-xl border border-[#383943] bg-[#1D1F27] px-4 py-3 text-sm leading-6 text-[#A4A4AF]">
              No navigation items are available for this role.
            </p>
          )}
        </nav>

        <div className="border-t border-[#383943] p-4">
          <div className="rounded-xl border border-[#383943] bg-[#1D1F27] p-3">
            <p className="text-xs font-semibold text-[#EAEAE6]">
              Aacharya LMS
            </p>

            <p className="mt-1 text-xs leading-5 text-[#A4A4AF]">
              Built around your academic journey.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}