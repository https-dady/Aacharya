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
  main: 'Main menu',
  administration: 'Administration',
  department: 'Department',
  academics: 'Academics',
  teaching: 'Teaching',
  assessment: 'Assessment',
  mentoring: 'Mentoring',
  learning: 'Learning',
  account: 'Account',
};

const NAVIGATION_ICONS = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),

  departments: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V4h8v3M3 12h18M10 12v3h4v-3" />
    </>
  ),

  'hod-accounts': (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20z" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 6.8M18 14a5 5 0 0 1 3.5 4.5V20" />
    </>
  ),

  faculty: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2z" />
    </>
  ),

  mentors: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 20v-1a6 6 0 0 1 12 0v1M15 15a5 5 0 0 1 7 4v1" />
    </>
  ),

  batches: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 4v16M16 4v16M3 10h18M3 15h18" />
    </>
  ),

  timetable: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h3M15 14h1" />
    </>
  ),

  courses: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 4.5v17M8 6h8M8 10h7" />
    </>
  ),

  attendance: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 3v3M16 3v3M8 11l2.5 2.5L16 8.5M8 17h8" />
    </>
  ),

  assignments: (
    <>
      <path d="M8 4H5a2 2 0 0 0-2 2v14h18V6a2 2 0 0 0-2-2h-3" />
      <rect x="8" y="2" width="8" height="5" rx="1.5" />
      <path d="M7 12h10M7 16h7" />
    </>
  ),

  quizzes: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-1.1.9-1.8 1.2-1.8 2.5M12 17h.01" />
    </>
  ),

  results: (
    <>
      <path d="M4 20V11h4v9M10 20V4h4v16M16 20v-7h4v7" />
      <path d="M2 21h20" />
    </>
  ),

  students: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21v-2a7 7 0 0 1 14 0v2z" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 6.8M18 15a5 5 0 0 1 4 5" />
    </>
  ),

  'student-import': (
    <>
      <path d="M12 16V3M7 8l5-5 5 5" />
      <path d="M4 14v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" />
    </>
  ),

  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2z" />
    </>
  ),
};

function getInitials(label = '') {
  return label
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function NavigationIcon({ item }) {
  const icon = NAVIGATION_ICONS[item.id] ?? (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </>
  );

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[21px] w-[21px] shrink-0"
    >
      {icon}
    </svg>
  );
}

function NavigationItem({
  item,
  onNavigate,
}) {
  return (
    <NavLink
      to={item.path}
      end
      title={item.label}
      aria-label={item.label}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'group relative flex min-h-11 items-center rounded-xl',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[#CDB5F7]',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-[#14161C]',
          'lg:justify-center lg:px-0',
          isActive
            ? 'bg-[#CDB5F7]/10 text-[#CDB5F7]'
            : 'text-[#92929F] hover:bg-[#26272B] hover:text-[#EAEAE6]',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#CDB5F7] lg:bottom-2.5 lg:top-2.5"
            />
          )}

          <span
            className={[
              'flex h-10 w-10 shrink-0 items-center justify-center',
              'rounded-xl transition-colors',
              'group-hover:bg-white/[0.03]',
              isActive ? 'text-[#CDB5F7]' : '',
            ].join(' ')}
          >
            <NavigationIcon item={item} />
          </span>

          <span className="min-w-0 flex-1 truncate pr-3 text-sm font-medium lg:hidden">
            {item.label}
          </span>

          {isActive && (
            <span className="mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E5DF98] lg:hidden" />
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarBrand() {
  return (
    <div className="flex h-[76px] shrink-0 items-center border-b border-[#30313B] px-5 lg:justify-center lg:px-0">
      <div
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#CDB5F7] text-lg font-extrabold text-[#14161C] shadow-[0_4px_20px_rgba(205,181,247,0.12)]"
      >
        A
      </div>

      <div className="ml-3 min-w-0 lg:hidden">
        <p className="truncate text-sm font-extrabold tracking-tight text-[#EAEAE6]">
          Aacharya
        </p>

        <p className="mt-0.5 truncate text-[9px] font-bold tracking-[0.14em] text-[#858590]">
          LEARNING MANAGEMENT
        </p>
      </div>
    </div>
  );
}

export default function Sidebar({
  role = LMS_ROLES.SUPER_ADMIN,
  isOpen = false,
  onNavigate,
  onClose,
}) {
  const normalizedRole =
    typeof role === 'string'
      ? role.trim().toUpperCase()
      : '';

  const navigation = getRoleNavigation(normalizedRole);

  const roleLabel =
    ROLE_LABELS[normalizedRole] ?? 'Aacharya LMS';

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
          tabIndex={0}
          className="fixed inset-0 z-40 cursor-default bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="lms-sidebar"
        aria-label="Main navigation"
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col',
          'border-r border-[#30313B] bg-[#14161C]',
          'transition-transform duration-200 ease-in-out',
          'lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-[88px]',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <SidebarBrand />

        <div className="flex h-[62px] shrink-0 items-center border-b border-[#30313B] px-5 lg:justify-center lg:px-0">
          <div
            title={roleLabel}
            aria-label={`Current workspace: ${roleLabel}`}
            className="flex h-9 min-w-0 items-center gap-3 rounded-xl border border-[#E5DF98]/10 bg-[#E5DF98]/[0.04] px-3 lg:h-10 lg:w-10 lg:justify-center lg:border-transparent lg:bg-transparent lg:px-0"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#E5DF98]/10 text-[10px] font-extrabold text-[#E5DF98]"
            >
              {getInitials(roleLabel)}
            </span>

            <span className="truncate text-xs font-semibold text-[#E5DF98] lg:hidden">
              {roleLabel}
            </span>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            className={[
              'ml-auto rounded-lg p-2 text-[#92929F]',
              'transition-colors hover:bg-[#26272B]',
              'hover:text-[#EAEAE6]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7] lg:hidden',
            ].join(' ')}
            onClick={onClose}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                d="m6 6 12 12M18 6 6 18"
              />
            </svg>
          </button>
        </div>

        <nav
          aria-label="Workspace navigation"
          className="flex-1 space-y-5 overflow-y-auto px-4 py-5 lg:space-y-3 lg:px-3"
        >
          {Object.entries(groupedNavigation).map(
            ([group, items], groupIndex) => (
              <section
                key={group}
                aria-label={GROUP_LABELS[group] || group}
              >
                <h2 className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#777783] lg:sr-only">
                  {GROUP_LABELS[group] || group}
                </h2>

                {groupIndex > 0 && (
                  <div
                    aria-hidden="true"
                    className="mb-3 hidden h-px bg-[#30313B] lg:block"
                  />
                )}

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
            <p className="rounded-xl border border-[#383943] bg-[#1D1F27] px-3 py-3 text-xs leading-5 text-[#A4A4AF] lg:hidden">
              No navigation items are available for this role.
            </p>
          )}
        </nav>

        <div className="shrink-0 border-t border-[#30313B] p-4 lg:flex lg:justify-center lg:p-3">
          <div
            title="Built around your academic journey"
            className="flex items-center gap-3 rounded-xl bg-[#1D1F27] p-3 lg:h-12 lg:w-12 lg:justify-center lg:p-0"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#CDB5F7]/10 text-sm font-bold text-[#CDB5F7]"
            >
              A
            </span>

            <span className="min-w-0 lg:hidden">
              <span className="block text-xs font-semibold text-[#EAEAE6]">
                Aacharya LMS
              </span>

              <span className="mt-1 block text-[10px] text-[#858590]">
                Your academic journey
              </span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}