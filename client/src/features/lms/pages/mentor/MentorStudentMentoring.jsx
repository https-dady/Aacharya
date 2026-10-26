import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function OverviewIcon({ type }) {
  const paths = {
    students: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19v-1.25A4.75 4.75 0 0 1 8.25 13h1.5a4.75 4.75 0 0 1 4.75 4.75V19" />
        <path d="M16 5.2a3.25 3.25 0 0 1 0 6.1M17 13.5a4.75 4.75 0 0 1 3.5 4.58V19" />
      </>
    ),
    attendance: (
      <>
        <rect x="3.5" y="5" width="17" height="16" rx="2" />
        <path d="M7.5 3v4M16.5 3v4M3.5 10h17m-12 5 2.2 2.2 4.3-4.4" />
      </>
    ),
    academic: (
      <>
        <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z" />
        <path d="M6.5 11.5V17c3.4 2.5 7.6 2.5 11 0v-5.5M21 9.5v6" />
      </>
    ),
    progress: (
      <>
        <path d="M4 19V5m0 14h16" />
        <path d="m7 15 4-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {paths[type]}
    </svg>
  );
}

function OverviewCard({ title, description, icon, children }) {
  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-[#CDB5F7]">
          <OverviewIcon type={icon} />
        </div>

        <div className="min-w-0">
          <h2 className="font-semibold text-[#EAEAE6]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#858590]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-[#343640] pt-4">
        {children}
      </div>
    </article>
  );
}

function PendingValue({ label }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-[#A5A6B0]">{label}</span>
      <span className="text-sm font-medium text-[#858590]">
        Not available
      </span>
    </div>
  );
}

function ActionLink({ to, children }) {
  return (
    <Link
      to={to}
      className={[
        'inline-flex min-h-10 items-center justify-center',
        'rounded-xl border border-[#3B3C43] bg-[#26272B]',
        'px-3 py-2 text-sm font-semibold text-[#EAEAE6]',
        'transition-colors hover:border-[#CDB5F7]/40 hover:bg-[#303139]',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#CDB5F7]',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

export default function MentorStudentMentoring() {
  /*
   * The current frontend baseline does not define a confirmed mentoring
   * overview API contract. Do not invent student records, attendance values,
   * grades or progress percentages.
   */
  const mentoringData = null;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Mentor workspace"
        title="Student Mentoring"
        description="Review your assigned students' academic progress, attendance and mentoring needs from one workspace."
        breadcrumbs={[
          { label: 'Mentor', to: '/mentor/dashboard' },
          { label: 'Student Mentoring' },
        ]}
        actions={
          <ActionLink to="/mentor/students">
            Assigned students
          </ActionLink>
        }
      />

      <section
        aria-label="Mentoring overview"
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <OverviewCard
          title="Assigned students"
          description="Students within your authorized batches and sections."
          icon="students"
        >
          <PendingValue label="Student count" />
          <PendingValue label="Students needing attention" />

          <div className="mt-4">
            <ActionLink to="/mentor/students">
              Open student directory
            </ActionLink>
          </div>
        </OverviewCard>

        <OverviewCard
          title="Attendance overview"
          description="Attendance patterns and students who may need follow-up."
          icon="attendance"
        >
          <PendingValue label="Attendance summary" />
          <PendingValue label="Students below 75%" />

          <div className="mt-4">
            <ActionLink to="/mentor/attendance">
              View attendance
            </ActionLink>
          </div>
        </OverviewCard>

        <OverviewCard
          title="Academic performance"
          description="Review available academic results and assignment progress."
          icon="academic"
        >
          <PendingValue label="Results overview" />
          <PendingValue label="Assignment progress" />

          <div className="mt-4">
            <ActionLink to="/mentor/students">
              Select a student
            </ActionLink>
          </div>
        </OverviewCard>

        <OverviewCard
          title="Mentoring follow-up"
          description="Identify students who may require academic guidance."
          icon="progress"
        >
          <PendingValue label="Students requiring follow-up" />
          <PendingValue label="Recent academic changes" />

          <p className="mt-4 text-xs leading-5 text-[#858590]">
            Follow-up indicators will use actual student, attendance and
            academic records once the relevant data sources are integrated.
          </p>
        </OverviewCard>
      </section>

      <SectionCard
        eyebrow="Mentoring workflow"
        title="Review a student's progress"
        description="Start from your assigned-students directory. Individual records must be verified against your mentoring assignments."
      >
        {mentoringData ? (
          <EmptyState
            title="No mentoring activity"
            description="There are no mentoring updates to display."
            className="border-0 bg-transparent"
          />
        ) : (
          <EmptyState
            title="Mentoring data is not connected yet"
            description="Student profiles, attendance records, results and assignment progress will appear here after their actual data sources are integrated. No fabricated academic information is shown."
            className="border-0 bg-transparent py-8"
            action={
              <ActionLink to="/mentor/students">
                Browse assigned students
              </ActionLink>
            }
          />
        )}
      </SectionCard>

      <div className="rounded-2xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#E5DF98]">
          Mentoring access policy
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
          Only students assigned to the authenticated mentor should be
          accessible. Attendance warnings, academic records and student
          details must be based on verified backend data. The backend must
          enforce access restrictions independently of the frontend.
        </p>
      </div>
    </div>
  );
}