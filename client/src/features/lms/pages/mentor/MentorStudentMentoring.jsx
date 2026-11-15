import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorDashboardService from '../../services/mentorDashboardService.js';
import mentorAttendanceService from '../../services/mentorAttendanceService.js';

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to retrieve mentoring information.'
  );
}

function isRequestCancelled(error, signal) {
  return (
    signal?.aborted
    || error?.name === 'AbortError'
    || error?.code === 'ERR_CANCELED'
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon,
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 transition-colors hover:border-[#CDB5F7]/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#A5A6B0]">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#858590]">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-[#CDB5F7]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function Icon({ type }) {
  const icons = {
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

    warning: (
      <>
        <path d="m12 3 9 16H3L12 3Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),

    progress: (
      <>
        <path d="M4 19V5m0 14h16" />
        <path d="m7 15 4-4 3 2 5-6" />
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
      {icons[type]}
    </svg>
  );
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-4"
    >
      <span className="sr-only">
        Loading mentoring information.
      </span>

      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-xl border border-[#343640] bg-[#1D1F27] p-5"
        >
          <div className="h-4 w-40 rounded bg-[#343640]" />
          <div className="mt-4 h-3 w-28 rounded bg-[#343640]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5"
    >
      <h3 className="font-semibold text-[#EAEAE6]">
        Unable to load mentoring information
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#17151E] transition-colors hover:bg-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
      >
        Try again
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: 'bg-emerald-400/10 text-emerald-300',
    SUSPENDED: 'bg-amber-400/10 text-amber-300',
    DISABLED: 'bg-rose-400/10 text-rose-300',
  };

  return (
    <span
      className={[
        'inline-flex rounded-lg px-2.5 py-1',
        'text-xs font-semibold',
        styles[status] || 'bg-slate-400/10 text-slate-300',
      ].join(' ')}
    >
      {status || 'UNKNOWN'}
    </span>
  );
}

function StudentRow({ student }) {
  const initials = student.fullName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#343640] py-4 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-sm font-semibold text-[#CDB5F7]">
          {initials || '?'}
        </div>

        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-[#EAEAE6]">
            {student.fullName || 'Unnamed student'}
          </p>

          <p className="mt-1 text-xs text-[#858590]">
            {student.institutionalId || 'No institutional ID'}
          </p>
        </div>
      </div>

      <Link
        to={`/mentor/students/${encodeURIComponent(student.id)}`}
        className="inline-flex items-center gap-2 rounded-lg border border-[#454650] px-3 py-2 text-xs font-semibold text-[#D0D0D8] transition hover:border-[#CDB5F7]/40 hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
      >
        View student

        <span aria-hidden="true">
          →
        </span>
      </Link>
    </div>
  );
}

function AtRiskStudentRow({ student }) {
  const percentage = student.percentage;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#343640] py-4 last:border-0">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-[#EAEAE6]">
          {student.fullName || 'Unnamed student'}
        </p>

        <p className="mt-1 text-xs text-[#858590]">
          {student.institutionalId || 'No institutional ID'}
        </p>

        <p className="mt-2 text-xs text-[#A5A6B0]">
          {student.present} present · {student.absent} absent · {student.late} late
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-lg font-bold text-rose-300">
            {percentage === null
              ? '—'
              : `${percentage.toFixed(1)}%`}
          </p>

          <p className="text-xs text-[#858590]">
            Attendance
          </p>
        </div>

        <Link
          to={`/mentor/students/${encodeURIComponent(student.id)}`}
          aria-label={`View ${student.fullName || 'student'} details`}
          className="rounded-lg border border-[#454650] px-3 py-2 text-sm text-[#D0D0D8] transition hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          →
        </Link>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function MentorStudentMentoring() {
  const [dashboard, setDashboard] = useState(null);
  const [attendance, setAttendance] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [attendanceError, setAttendanceError] = useState('');

  const loadMentoringData = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    setAttendanceError('');

    const [dashboardResult, attendanceResult] =
      await Promise.allSettled([
        mentorDashboardService.getDashboard({ signal }),

        mentorAttendanceService.getOverview(
          {},
          { signal },
        ),
      ]);

    if (signal.aborted) {
      return;
    }

    if (dashboardResult.status === 'fulfilled') {
      setDashboard(dashboardResult.value);
    } else {
      const requestError = dashboardResult.reason;

      if (!isRequestCancelled(requestError, signal)) {
        setError(getErrorMessage(requestError));
      }
    }

    if (attendanceResult.status === 'fulfilled') {
      setAttendance(attendanceResult.value);
    } else {
      const requestError = attendanceResult.reason;

      if (!isRequestCancelled(requestError, signal)) {
        setAttendanceError(getErrorMessage(requestError));
      }
    }

    if (!signal.aborted) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadMentoringData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadMentoringData]);

  const assignedStudentCount =
    dashboard?.summary?.assignedStudents ?? 0;

  const assignedBatchCount =
    dashboard?.summary?.assignedBatches ?? 0;

  const assignedSectionCount =
    dashboard?.summary?.assignedSections ?? 0;

  const attendancePercentage =
    attendance?.attendance?.averagePercentage;

  const attendanceThreshold =
    attendance?.attendance?.threshold ?? 75;

  const atRiskStudents =
    attendance?.atRiskStudents ?? [];

  const recentStudents =
    dashboard?.recentStudents ?? [];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="MENTOR WORKSPACE"
        title="Student Mentoring"
        description="Monitor your assigned students, review attendance patterns and identify students who may require academic attention."
        breadcrumbs={[
          {
            label: 'Mentor',
            to: '/mentor/dashboard',
          },
          {
            label: 'Student Mentoring',
          },
        ]}
        actions={
          <Link
            to="/mentor/students"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition hover:border-[#CDB5F7]/40 hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Assigned Students
          </Link>
        }
      />

      {error && (
        <ErrorState
          message={error}
          onRetry={() => {
            const controller = new AbortController();

            loadMentoringData(controller.signal);
          }}
        />
      )}

      {!error && (
        <>
          <section
            aria-label="Mentoring summary"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <SummaryCard
              label="Assigned Students"
              value={loading ? '—' : assignedStudentCount}
              description="Active students in your assigned sections."
              icon={<Icon type="students" />}
            />

            <SummaryCard
              label="Assigned Batches"
              value={loading ? '—' : assignedBatchCount}
              description="Academic batches assigned to you."
              icon={<Icon type="progress" />}
            />

            <SummaryCard
              label="Average Attendance"
              value={
                loading
                  ? '—'
                  : attendancePercentage === null
                    || attendancePercentage === undefined
                    ? 'N/A'
                    : `${attendancePercentage.toFixed(1)}%`
              }
              description="Based on available attendance records."
              icon={<Icon type="attendance" />}
            />

            <SummaryCard
              label="Students Requiring Attention"
              value={
                loading
                  ? '—'
                  : attendance
                    ? attendance.attendance.belowThresholdCount
                    : '—'
              }
              description={`Attendance below ${attendanceThreshold}%.`}
              icon={<Icon type="warning" />}
            />
          </section>

          {loading ? (
            <LoadingState />
          ) : (
            <>
              <SectionCard
                eyebrow="ATTENDANCE ANALYTICS"
                title="Attendance overview"
                description="Attendance statistics from your currently assigned sections."
                action={
                  <Link
                    to="/mentor/attendance"
                    className="rounded-lg border border-[#454650] px-3 py-2 text-sm font-semibold text-[#D0D0D8] transition hover:bg-[#303139]"
                  >
                    Detailed attendance →
                  </Link>
                }
              >
                {attendanceError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"
                  >
                    <p className="text-sm text-amber-200">
                      Attendance analytics are currently unavailable.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#A5A6B0]">
                      {attendanceError}
                    </p>
                  </div>
                ) : !attendance ? (
                  <EmptyState
                    title="No attendance information"
                    description="Attendance information is not available for your assigned sections."
                    className="border-0 bg-transparent"
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {[
                        {
                          label: 'Present',
                          value: attendance.attendance.present,
                          style: 'text-emerald-300',
                        },
                        {
                          label: 'Absent',
                          value: attendance.attendance.absent,
                          style: 'text-rose-300',
                        },
                        {
                          label: 'Late',
                          value: attendance.attendance.late,
                          style: 'text-amber-300',
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl border border-[#343640] bg-[#17181F] p-4"
                        >
                          <p className="text-xs text-[#858590]">
                            {item.label}
                          </p>

                          <p className={`mt-2 text-2xl font-bold ${item.style}`}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[#B8B8C2]">
                          Average attendance
                        </span>

                        <span className="text-sm font-semibold text-[#EAEAE6]">
                          {attendancePercentage === null
                            ? 'N/A'
                            : `${attendancePercentage.toFixed(1)}%`}
                        </span>
                      </div>

                      <div
                        className="h-3 overflow-hidden rounded-full bg-[#343640]"
                        role="progressbar"
                        aria-label="Average attendance"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={attendancePercentage ?? 0}
                      >
                        <div
                          className="h-full rounded-full bg-[#CDB5F7] transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, attendancePercentage ?? 0),
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-[#858590]">
                        {attendance.students.withAttendanceRecords} students
                        have attendance records out of{' '}
                        {attendance.students.totalAssigned} assigned students.
                      </p>
                    </div>
                  </>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="STUDENT FOLLOW-UP"
                title="Students requiring attention"
                description={`Students whose attendance is below the configured ${attendanceThreshold}% threshold.`}
              >
                {attendanceError ? (
                  <EmptyState
                    title="Attendance risk data unavailable"
                    description="The attendance service could not provide student-level risk information."
                    className="border-0 bg-transparent"
                  />
                ) : atRiskStudents.length === 0 ? (
                  <EmptyState
                    title="No students requiring attendance follow-up"
                    description={
                      attendance?.students?.totalAssigned === 0
                        ? 'You currently have no active students in your assigned sections.'
                        : 'No students currently meet the attendance warning criteria in the available records.'
                    }
                    className="border-0 bg-transparent"
                  />
                ) : (
                  <div>
                    {atRiskStudents.map((student) => (
                      <AtRiskStudentRow
                        key={student.id}
                        student={student}
                      />
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="RECENT STUDENT ACTIVITY"
                title="Recently added assigned students"
                description="Latest student accounts within your authorized mentoring sections."
                action={
                  <Link
                    to="/mentor/students"
                    className="text-sm font-semibold text-[#CDB5F7] hover:text-[#E0D1FA]"
                  >
                    View all →
                  </Link>
                }
              >
                {recentStudents.length === 0 ? (
                  <EmptyState
                    title="No assigned students available"
                    description="Students assigned to your sections will appear here."
                    className="border-0 bg-transparent"
                  />
                ) : (
                  <div>
                    {recentStudents.map((student) => (
                      <StudentRow
                        key={student.id}
                        student={student}
                      />
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="ACADEMIC PERFORMANCE"
                title="Academic progress"
                description="Academic results and assignment completion analytics."
              >
                <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
                  <p className="text-sm font-semibold text-[#EAEAE6]">
                    Academic analytics are not connected yet.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
                    The current Mentor backend provides assigned student
                    records and attendance analytics. Student result
                    summaries and assignment progress are not exposed
                    through a verified Mentor overview API yet.
                  </p>

                  <p className="mt-3 text-xs text-[#858590]">
                    No estimated grades or fabricated progress values
                    are displayed.
                  </p>
                </div>
              </SectionCard>
            </>
          )}
        </>
      )}

      <div className="rounded-2xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#E5DF98]">
          Mentoring access policy
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
          Student records and attendance information are retrieved
          through authenticated Mentor APIs. Only students belonging
          to your currently assigned active sections are included.
          Backend authorization and data scoping remain mandatory.
        </p>
      </div>

      <div className="text-xs text-[#777986]">
        Dashboard data is generated from existing backend records.
        Last updated: {formatDate(attendance?.generatedAt ?? dashboard?.generatedAt)}
      </div>
    </div>
  );
}