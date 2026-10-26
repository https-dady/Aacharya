import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const ATTENDANCE_THRESHOLD = 75;

function OverviewIcon({ type }) {
  const paths = {
    attendance: (
      <>
        <rect x="3.5" y="5" width="17" height="16" rx="2" />
        <path d="M7.5 3v4M16.5 3v4M3.5 10h17m-12 5 2.2 2.2 4.3-4.4" />
      </>
    ),
    warning: (
      <>
        <path d="m12 3 9 17H3L12 3Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
    assignments: (
      <>
        <path d="M8 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
        <rect x="8" y="2.5" width="8" height="4" rx="1.5" />
        <path d="M7 12h10M7 16h7" />
      </>
    ),
    results: (
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

function SummaryCard({ title, value, description, icon }) {
  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#A5A6B0]">{title}</p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#858590]">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-[#CDB5F7]">
          <OverviewIcon type={icon} />
        </div>
      </div>
    </article>
  );
}

function NavigationLink({ to, children }) {
  return (
    <Link
      to={to}
      className={[
        'inline-flex min-h-10 items-center justify-center',
        'rounded-xl border border-[#3B3C43] bg-[#26272B]',
        'px-4 py-2 text-sm font-semibold text-[#EAEAE6]',
        'transition-colors hover:border-[#CDB5F7]/40 hover:bg-[#303139]',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#CDB5F7]',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

function DataNotice({ children }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
      <p className="text-sm leading-6 text-[#A5A6B0]">{children}</p>
    </div>
  );
}

export default function MentorAttendance() {
  /*
   * Backend integration is pending.
   *
   * These values must eventually come from attendance, assignment and
   * result APIs scoped to the authenticated mentor's assigned students.
   * Never substitute demo statistics for real academic records.
   */
  const attendanceData = null;
  const assignmentData = null;
  const resultsData = null;

  const hasAcademicData = Boolean(
    attendanceData || assignmentData || resultsData,
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Mentor workspace"
        title="Attendance & Academic Overview"
        description="Monitor attendance, identify students below the required threshold and review available academic progress for your assigned students."
        breadcrumbs={[
          { label: 'Mentor', to: '/mentor/dashboard' },
          { label: 'Attendance & Academics' },
        ]}
        actions={
          <NavigationLink to="/mentor/students">
            Assigned students
          </NavigationLink>
        }
      />

      <div className="rounded-2xl border border-[#E5DF98]/20 bg-[#E5DF98]/[0.05] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5DF98]/10 text-[#E5DF98]">
            <OverviewIcon type="warning" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#E5DF98]">
              Attendance warning threshold: below {ATTENDANCE_THRESHOLD}%
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
              Students whose calculated attendance falls below{' '}
              {ATTENDANCE_THRESHOLD}% should be flagged for mentor follow-up.
              No student-specific warnings can be calculated until actual
              attendance records are available.
            </p>
          </div>
        </div>
      </div>

      <section
        aria-label="Attendance and academic summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          title="Average attendance"
          value="—"
          description="Awaiting verified attendance records"
          icon="attendance"
        />

        <SummaryCard
          title="Below 75% attendance"
          value="—"
          description="Students requiring attendance follow-up"
          icon="warning"
        />

        <SummaryCard
          title="Assignment overview"
          value="—"
          description="Assignment progress for assigned students"
          icon="assignments"
        />

        <SummaryCard
          title="Results overview"
          value="—"
          description="Academic results from available assessments"
          icon="results"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          eyebrow="Attendance"
          title="Attendance monitoring"
          description="Review attendance percentages and identify students who may require intervention."
          action={
            <NavigationLink to="/mentor/students">
              Student directory
            </NavigationLink>
          }
        >
          {attendanceData ? (
            <EmptyState
              title="No attendance records available"
              description="There are no attendance records to display for the selected scope."
              className="border-0 bg-transparent"
            />
          ) : (
            <DataNotice>
              Attendance records have not been connected to this page yet.
              Once integrated, this section will display verified attendance
              summaries and flag students below the 75% threshold.
            </DataNotice>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Assignments"
          title="Assignment progress"
          description="Understand assignment completion and identify pending work."
        >
          {assignmentData ? (
            <EmptyState
              title="No assignment data available"
              description="There are no assignment records to display."
              className="border-0 bg-transparent"
            />
          ) : (
            <DataNotice>
              Assignment statistics are pending backend integration. Future
              metrics should distinguish submitted, pending and evaluated
              assignments using actual records.
            </DataNotice>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Academic performance"
          title="Results overview"
          description="Review assessment results and identify students who may need academic guidance."
        >
          {resultsData ? (
            <EmptyState
              title="No results available"
              description="There are no academic results to display."
              className="border-0 bg-transparent"
            />
          ) : (
            <DataNotice>
              Result summaries and performance trends will appear once the
              actual results data source is integrated. Grades and percentages
              are not estimated or fabricated.
            </DataNotice>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Mentor follow-up"
          title="Students requiring attention"
          description="Use verified attendance and academic information to prioritize mentoring."
        >
          {hasAcademicData ? (
            <EmptyState
              title="No follow-up items available"
              description="There are no follow-up items to display."
              className="border-0 bg-transparent"
            />
          ) : (
            <EmptyState
              title="Academic records are not connected"
              description="Students requiring follow-up will be identified from actual attendance and academic records after backend integration."
              className="border-0 bg-transparent"
              action={
                <NavigationLink to="/mentor/mentoring">
                  Open mentoring overview
                </NavigationLink>
              }
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Mentor actions"
        description="Navigate to the relevant workspace to continue mentoring."
      >
        <div className="flex flex-wrap gap-3">
          <NavigationLink to="/mentor/students">
            Assigned students
          </NavigationLink>

          <NavigationLink to="/mentor/mentoring">
            Student mentoring
          </NavigationLink>

          <NavigationLink to="/mentor/batches">
            My batches & sections
          </NavigationLink>
        </div>
      </SectionCard>

      <p className="text-xs leading-5 text-[#858590]">
        Access control: all student attendance, assignment and result queries
        must be restricted on the server to the authenticated mentor's
        assigned batches and sections.
      </p>
    </div>
  );
}