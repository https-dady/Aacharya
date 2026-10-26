import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function DashboardIcon({ type }) {
  const commonProps = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    fill: 'none',
    className: 'h-5 w-5',
  };

  if (type === 'departments') {
    return (
      <svg {...commonProps}>
        <rect
          x="3.5"
          y="3.5"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect
          x="13.5"
          y="3.5"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect
          x="3.5"
          y="13.5"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect
          x="13.5"
          y="13.5"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (type === 'hods') {
    return (
      <svg {...commonProps}>
        <circle
          cx="9"
          cy="8"
          r="3.25"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M3.5 19a5.5 5.5 0 0 1 11 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M16 5.25a3.25 3.25 0 0 1 0 6.5M17 14.5a4.5 4.5 0 0 1 3.5 4.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'notifications') {
    return (
      <svg {...commonProps}>
        <path
          d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 21h4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 20a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QuickLink({ to, icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex min-h-28 items-start gap-4 rounded-xl border border-[#383943] bg-[#26272B]/60 p-4 transition-colors hover:border-[#CDB5F7]/50 hover:bg-[#CDB5F7]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7] transition-colors group-hover:bg-[#CDB5F7]/15">
        <DashboardIcon type={icon} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-[#EAEAE6]">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
          {description}
        </p>

        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#CDB5F7]">
          Open section
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

export default function SuperAdminDashboard() {
  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="INSTITUTIONAL ADMINISTRATION"
        title="Super Admin Dashboard"
        description="Manage institutional departments, HOD account provisioning and your account information."
      />

      <section className="mb-6 overflow-hidden rounded-2xl border border-[#343640] bg-[#1D1F27]">
        <div className="h-1.5 bg-gradient-to-r from-[#CDB5F7] via-[#A997D9] to-[#E5DF98]" />

        <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#CDB5F7]">
              Institutional workspace
            </p>

            <h2 className="mt-3 max-w-2xl text-xl font-semibold tracking-tight text-[#EAEAE6] sm:text-2xl">
              Welcome to Aacharya LMS
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A5A6B0]">
              Set up institutional departments and provision authorized
              HOD accounts through the available administration workflows.
            </p>
          </div>

          <Link
            to="/super-admin/departments/new"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-5 py-3 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1F27]"
          >
            + Create department
          </Link>
        </div>
      </section>

      <SectionCard
        eyebrow="WORKSPACE"
        title="Administration shortcuts"
        description="Open a section to continue your administrative tasks."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <QuickLink
            to="/super-admin/departments"
            icon="departments"
            title="Departments"
            description="Open the department directory or register a department."
          />

          <QuickLink
            to="/super-admin/hods"
            icon="hods"
            title="HOD accounts"
            description="Open the HOD account area or provision a new HOD."
          />

          <QuickLink
            to="/super-admin/notifications"
            icon="notifications"
            title="Notifications"
            description="Open the notification centre and review its current integration status."
          />

          <QuickLink
            to="/super-admin/profile"
            icon="profile"
            title="My profile"
            description="Review your authenticated account and available verification information."
          />
        </div>
      </SectionCard>

      <section className="mt-6 rounded-2xl border border-[#454650]/70 bg-[#1D1F27] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E5DF98]">
          Current integration status
        </p>

        <h2 className="mt-2 text-base font-semibold text-[#EAEAE6]">
          Administration services
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
          Department creation and HOD account provisioning use the
          available backend endpoints. Department and HOD directories
          still require supported listing endpoints before they can
          display persisted records.
        </p>
      </section>
    </div>
  );
}