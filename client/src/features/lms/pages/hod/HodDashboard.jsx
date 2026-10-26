import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const dashboardSections = [
  {
    title: 'Faculty Management',
    description:
      'Manage faculty accounts and departmental teaching staff.',
    path: '/hod/faculty',
    label: 'Open faculty',
    icon: 'faculty',
    category: 'DEPARTMENT',
  },
  {
    title: 'Mentors & TG',
    description:
      'Manage mentor responsibilities and batch or section assignments.',
    path: '/hod/mentors',
    label: 'Open mentors',
    icon: 'mentors',
    category: 'DEPARTMENT',
  },
  {
    title: 'Batches & Sections',
    description:
      'Organize academic batches and their sections.',
    path: '/hod/batches',
    label: 'Manage batches',
    icon: 'batches',
    category: 'DEPARTMENT',
  },
  {
    title: 'Timetable',
    description:
      'Access the timetable workspace for academic scheduling.',
    path: '/hod/timetable',
    label: 'Open timetable',
    icon: 'timetable',
    category: 'ACADEMICS',
  },
  {
    title: 'Courses',
    description:
      'Access the course management workspace.',
    path: '/hod/courses',
    label: 'Open courses',
    icon: 'courses',
    category: 'ACADEMICS',
  },
  {
    title: 'Attendance',
    description:
      'Access departmental attendance-related workflows.',
    path: '/hod/attendance',
    label: 'Open attendance',
    icon: 'attendance',
    category: 'ACADEMICS',
  },
];

function SectionIcon({ type }) {
  const iconProps = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    fill: 'none',
    className: 'h-5 w-5',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (type) {
    case 'faculty':
      return (
        <svg {...iconProps}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20v-1.5a6 6 0 0 1 12 0V20" />
          <path d="M16 5.5a3.5 3.5 0 0 1 0 6.5" />
          <path d="M18 15a5 5 0 0 1 3 4.5V20" />
        </svg>
      );

    case 'mentors':
      return (
        <svg {...iconProps}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="m16 9 2 2 4-4" />
        </svg>
      );

    case 'batches':
      return (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 4v16M16 4v16M3 10h18M3 15h18" />
        </svg>
      );

    case 'timetable':
      return (
        <svg {...iconProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2" />
        </svg>
      );

    case 'courses':
      return (
        <svg {...iconProps}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
          <path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h6" />
        </svg>
      );

    case 'attendance':
      return (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="m7 12 3 3 7-7M8 2v4M16 2v4" />
        </svg>
      );

    default:
      return null;
  }
}

function WorkspaceCard({ section }) {
  return (
    <Link
      to={section.path}
      className={[
        'group flex min-h-48 flex-col rounded-2xl border',
        'border-[#383943] bg-[#1D1F27] p-5',
        'transition duration-200 hover:-translate-y-0.5',
        'hover:border-[#CDB5F7]/50 hover:bg-[#22232C]',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#CDB5F7]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]">
          <SectionIcon type={section.icon} />
        </div>

        <span className="rounded-full border border-[#383943] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[#A5A6B0]">
          {section.category}
        </span>
      </div>

      <h3 className="mt-5 text-base font-semibold text-[#EAEAE6]">
        {section.title}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-[#A5A6B0]">
        {section.description}
      </p>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#CDB5F7]">
        {section.label}
        <span
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-1"
        >
          →
        </span>
      </span>
    </Link>
  );
}

export default function HodDashboard() {
  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="HOD Dashboard"
        description="Manage departmental resources and access academic administration workspaces."
      />

      <section className="mb-8 overflow-hidden rounded-2xl border border-[#383943] bg-[#1D1F27]">
        <div className="h-1.5 bg-gradient-to-r from-[#CDB5F7] via-[#A997D9] to-[#E5DF98]" />

        <div className="p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#CDB5F7]">
            Head of Department
          </p>

          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#EAEAE6] sm:text-2xl">
            Your departmental workspace
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A5A6B0]">
            Use the workspaces below to manage faculty, coordinate mentors,
            organize batches and sections, and access academic operations.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/hod/faculty"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1F27]"
            >
              Manage faculty
            </Link>

            <Link
              to="/hod/batches"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:border-[#CDB5F7]/50 hover:bg-[#CDB5F7]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              View batches & sections
            </Link>
          </div>
        </div>
      </section>

      <SectionCard
        eyebrow="QUICK ACCESS"
        title="Department workspaces"
        description="Choose a workspace to continue with your departmental responsibilities."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardSections.map((section) => (
            <WorkspaceCard
              key={section.path}
              section={section}
            />
          ))}
        </div>
      </SectionCard>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Dashboard statistics will be displayed when the corresponding
        backend endpoints are available. This page does not use placeholder
        counts or fabricated records.
      </p>
    </div>
  );
}