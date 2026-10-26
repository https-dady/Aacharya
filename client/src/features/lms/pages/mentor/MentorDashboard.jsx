import { Link } from 'react-router-dom';

import useAuth from '../../../auth/context/useAuth.js';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function OverviewCard({ title, description, icon, children }) {
  return (
    <SectionCard
      title={title}
      description={description}
      icon={icon}
      className="h-full"
    >
      {children}
    </SectionCard>
  );
}

function MetricCard({ label, value, description }) {
  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm font-medium text-[#A5A6B0]">
        {label}
      </p>

      <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#858590]">
        {description}
      </p>
    </article>
  );
}

function QuickAction({ title, description, to, icon }) {
  return (
    <Link
      to={to}
      className={[
        'group flex min-w-0 items-start gap-4 rounded-xl',
        'border border-[#343640] bg-[#191A21] p-4',
        'transition-colors hover:border-[#CDB5F7]/50',
        'hover:bg-[#20212A]',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#CDB5F7]',
      ].join(' ')}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-[#CDB5F7]">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold text-[#EAEAE6] transition-colors group-hover:text-[#CDB5F7]">
          {title}
        </span>

        <span className="mt-1 block text-sm leading-5 text-[#A5A6B0]">
          {description}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="shrink-0 text-lg text-[#858590] transition-transform group-hover:translate-x-1 group-hover:text-[#CDB5F7]"
      >
        →
      </span>
    </Link>
  );
}

function Icon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function MentorDashboard() {
  const { user } = useAuth();

  const displayName =
    user?.fullName?.trim() ||
    user?.name?.trim() ||
    'Mentor';

  const departmentName =
    typeof user?.department === 'string'
      ? user.department
      : user?.department?.name || '';

  const assignedBatches = Array.isArray(user?.assignedBatches)
    ? user.assignedBatches
    : [];

  const assignedSections = Array.isArray(user?.assignedSections)
    ? user.assignedSections
    : [];

  const assignedStudents = Array.isArray(user?.assignedStudents)
    ? user.assignedStudents
    : [];

  const hasBatchData =
    Array.isArray(user?.assignedBatches) ||
    Array.isArray(user?.assignedSections);

  const hasStudentData = Array.isArray(user?.assignedStudents);

  const batchCount = hasBatchData
    ? new Set(
        assignedBatches
          .map((batch) =>
            typeof batch === 'string'
              ? batch
              : batch?._id || batch?.id || batch?.name,
          )
          .filter(Boolean),
      ).size
    : null;

  const sectionCount = hasBatchData
    ? new Set(
        assignedSections
          .map((section) =>
            typeof section === 'string'
              ? section
              : section?._id || section?.id || section?.name,
          )
          .filter(Boolean),
      ).size
    : null;

  const studentCount = hasStudentData
    ? assignedStudents.length
    : null;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="MENTOR / TG WORKSPACE"
        title={`Welcome back, ${displayName}`}
        description="Manage your assigned students, monitor attendance and access your mentoring responsibilities."
        breadcrumbs={[
          {
            label: 'Mentor',
            to: '/mentor/dashboard',
          },
          {
            label: 'Dashboard',
          },
        ]}
      />

      <section className="relative overflow-hidden rounded-2xl border border-[#CDB5F7]/20 bg-gradient-to-br from-[#262333] via-[#1D1F27] to-[#1D1F27] p-5 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#CDB5F7]/[0.06] blur-3xl"
        />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#CDB5F7]">
              Mentoring overview
            </p>

            <h2 className="mt-3 max-w-2xl text-xl font-semibold leading-8 text-[#EAEAE6] sm:text-2xl">
              Support your students throughout their academic journey.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A5A6B0]">
              Access your assigned batches, manage student records and
              review attendance-related information from one workspace.
            </p>

            {departmentName && (
              <p className="mt-4 text-sm text-[#B8B8C2]">
                Department:{' '}
                <span className="font-medium text-[#EAEAE6]">
                  {departmentName}
                </span>
              </p>
            )}
          </div>

          <Link
            to="/mentor/students"
            className={[
              'inline-flex min-h-11 shrink-0 items-center justify-center',
              'gap-2 rounded-xl bg-[#CDB5F7] px-4 py-3',
              'text-sm font-semibold text-[#17151E]',
              'transition-colors hover:bg-[#DCCBFA]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2',
              'focus-visible:ring-offset-[#1D1F27]',
            ].join(' ')}
          >
            View assigned students

            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section aria-label="Mentoring summary">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#EAEAE6]">
            Your mentoring summary
          </h2>

          <p className="mt-1 text-sm text-[#858590]">
            Counts will appear when the corresponding assigned records are
            available in the authenticated user context.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Assigned batches"
            value={batchCount === null ? '—' : batchCount}
            description={
              batchCount === null
                ? 'Assigned batch data is not available.'
                : 'Batches assigned to your mentoring account.'
            }
          />

          <MetricCard
            label="Assigned sections"
            value={sectionCount === null ? '—' : sectionCount}
            description={
              sectionCount === null
                ? 'Assigned section data is not available.'
                : 'Sections represented in your account.'
            }
          />

          <MetricCard
            label="Assigned students"
            value={studentCount === null ? '—' : studentCount}
            description={
              studentCount === null
                ? 'Student records are not available in the current account context.'
                : 'Students represented in your assigned-student records.'
            }
          />

          <MetricCard
            label="Attendance overview"
            value="—"
            description="Attendance summaries will be displayed when their records are available."
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <OverviewCard
          title="Assigned students"
          description="Access the student records within your permitted mentoring scope."
          icon={
            <Icon>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </Icon>
          }
        >
          {hasStudentData && assignedStudents.length > 0 ? (
            <div className="space-y-3">
              {assignedStudents.slice(0, 5).map((student, index) => {
                const studentId =
                  student?._id || student?.id || index;

                const studentName =
                  student?.fullName ||
                  student?.name ||
                  student?.studentName ||
                  'Student name unavailable';

                const studentRoll =
                  student?.rollNumber ||
                  student?.enrollmentNumber ||
                  student?.registrationNumber;

                return (
                  <div
                    key={studentId}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#303139] text-sm font-semibold text-[#CDB5F7]">
                      {studentName
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part.charAt(0))
                        .join('')
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-[#EAEAE6]">
                        {studentName}
                      </p>

                      {studentRoll && (
                        <p className="mt-1 text-xs text-[#858590]">
                          {studentRoll}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              <Link
                to="/mentor/students"
                className="inline-flex min-h-10 items-center text-sm font-semibold text-[#CDB5F7] hover:text-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                View all assigned students
                <span className="ml-2" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          ) : (
            <EmptyState
              title="Assigned student records unavailable"
              description="Student information will appear here when assigned-student records are supplied. The dashboard does not generate sample student records."
              action={
                <Link
                  to="/mentor/students"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                >
                  Open assigned students
                </Link>
              }
            />
          )}
        </OverviewCard>

        <OverviewCard
          title="My batches and sections"
          description="Review the batches and sections associated with your mentoring assignment."
          icon={
            <Icon>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18M9 10v10" />
            </Icon>
          }
        >
          {hasBatchData &&
          (assignedBatches.length > 0 || assignedSections.length > 0) ? (
            <div className="space-y-4">
              {assignedBatches.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#858590]">
                    Assigned batches
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {assignedBatches.map((batch, index) => {
                      const name =
                        typeof batch === 'string'
                          ? batch
                          : batch?.name ||
                            batch?.batchName ||
                            batch?.code ||
                            `Batch ${index + 1}`;

                      return (
                        <span
                          key={batch?._id || batch?.id || `${name}-${index}`}
                          className="rounded-lg border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6]"
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {assignedSections.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#858590]">
                    Assigned sections
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {assignedSections.map((section, index) => {
                      const name =
                        typeof section === 'string'
                          ? section
                          : section?.name ||
                            section?.sectionName ||
                            section?.code ||
                            `Section ${index + 1}`;

                      return (
                        <span
                          key={
                            section?._id ||
                            section?.id ||
                            `${name}-${index}`
                          }
                          className="rounded-lg border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6]"
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <Link
                to="/mentor/batches"
                className="inline-flex min-h-10 items-center text-sm font-semibold text-[#CDB5F7] hover:text-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Open batches and sections
                <span className="ml-2" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          ) : (
            <EmptyState
              title="No assignment information available"
              description="Your assigned batches and sections will appear here when that information is available in your account context."
              action={
                <Link
                  to="/mentor/batches"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                >
                  View my batches
                </Link>
              }
            />
          )}
        </OverviewCard>
      </section>

      <SectionCard
        eyebrow="MENTORING WORKSPACE"
        title="Quick actions"
        description="Navigate directly to your main mentoring workflows."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <QuickAction
            title="Assigned students"
            description="View student records within your assigned batches and sections."
            to="/mentor/students"
            icon={
              <Icon>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </Icon>
            }
          />

          <QuickAction
            title="Bulk student import"
            description="Open the CSV/XLSX student import workflow for permitted assignments."
            to="/mentor/students/import"
            icon={
              <Icon>
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 17v3h14v-3" />
              </Icon>
            }
          />

          <QuickAction
            title="My batches and sections"
            description="Review the groups associated with your mentoring responsibilities."
            to="/mentor/batches"
            icon={
              <Icon>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 10h18M9 10v10" />
              </Icon>
            }
          />

          <QuickAction
            title="Attendance"
            description="Access the attendance overview for your assigned students."
            to="/mentor/attendance"
            icon={
              <Icon>
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M8 2v4M16 2v4M3 9h18M8 13h3M8 17h6" />
              </Icon>
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="ACADEMIC OVERSIGHT"
        title="Student attendance and academic progress"
        description="Access the relevant attendance and academic information for students within your mentoring scope."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5DF98]/10 text-[#E5DF98]">
                <Icon>
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M8 2v4M16 2v4M3 9h18M8 13h3M8 17h6" />
                </Icon>
              </span>

              <div>
                <h3 className="text-sm font-semibold text-[#EAEAE6]">
                  Attendance overview
                </h3>

                <p className="mt-1 text-xs text-[#858590]">
                  Assigned students
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#A5A6B0]">
              Attendance percentages, records and warnings for students
              below 75% attendance will be represented here when the
              relevant records are available.
            </p>

            <Link
              to="/mentor/attendance"
              className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#CDB5F7] hover:text-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              Open attendance
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-[#CDB5F7]">
                <Icon>
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                  <path d="M8 7h8M8 11h8" />
                </Icon>
              </span>

              <div>
                <h3 className="text-sm font-semibold text-[#EAEAE6]">
                  Academic overview
                </h3>

                <p className="mt-1 text-xs text-[#858590]">
                  Relevant student information
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#A5A6B0]">
              Relevant academic information will be displayed according
              to the mentor's assigned students and permitted scope.
            </p>

            <Link
              to="/mentor/students"
              className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#CDB5F7] hover:text-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              View student records
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}