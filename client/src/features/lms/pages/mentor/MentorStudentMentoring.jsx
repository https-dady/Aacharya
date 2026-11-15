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
import mentorAssignedStudentsService from '../../services/mentorAssignedStudentsService.js';

const PAGE_SIZE = 20;

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to retrieve mentoring information.'
  );
}

function isCancelled(error, signal) {
  return (
    signal?.aborted
    || error?.name === 'AbortError'
    || error?.code === 'ERR_CANCELED'
  );
}

function Icon({ type }) {
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

    warning: (
      <>
        <path d="m12 3 9 16H3L12 3Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),

    batch: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M8 4v16M8 9h13M8 14h13" />
      </>
    ),

    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
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
          <Icon type={icon} />
        </div>
      </div>
    </article>
  );
}

function StudentStatusBadge({ status }) {
  const styles = {
    ACTIVE: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/15',
    SUSPENDED: 'bg-amber-400/10 text-amber-300 border-amber-400/15',
    DISABLED: 'bg-rose-400/10 text-rose-300 border-rose-400/15',
  };

  return (
    <span
      className={[
        'inline-flex rounded-lg border px-2.5 py-1',
        'text-xs font-semibold',
        styles[status] || 'border-slate-400/15 bg-slate-400/10 text-slate-300',
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
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-sm font-semibold text-[#CDB5F7]">
          {initials || '?'}
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-[#EAEAE6]">
            {student.fullName || 'Unnamed student'}
          </p>

          <p className="mt-1 break-all text-xs text-[#858590]">
            {student.institutionalId || 'No institutional ID'}
          </p>

          <p className="mt-1 break-all text-xs text-[#858590]">
            {student.email || 'No email available'}
          </p>

          {student.sections?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {student.sections.map((section) => (
                <span
                  key={section.id}
                  className="rounded-md border border-[#CDB5F7]/15 bg-[#CDB5F7]/5 px-2 py-1 text-[10px] font-medium text-[#CDB5F7]"
                >
                  {section.name}
                  {section.code ? ` · ${section.code}` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <StudentStatusBadge status={student.status} />

        <Link
          to={`/mentor/students/${encodeURIComponent(student.id)}`}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#454650] px-3 py-2 text-xs font-semibold text-[#D0D0D8] transition hover:border-[#CDB5F7]/40 hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}

function AtRiskStudentRow({ student }) {
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
            {student.percentage === null
              ? '—'
              : `${student.percentage.toFixed(1)}%`}
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

function AttendanceMetric({
  label,
  value,
  style,
}) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
      <p className="text-xs text-[#858590]">
        {label}
      </p>

      <p className={`mt-2 text-2xl font-bold ${style}`}>
        {value}
      </p>
    </div>
  );
}

function Pagination({
  pagination,
  onPageChange,
  loading,
}) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#343640] pt-5">
      <p className="text-xs text-[#858590]">
        Page {pagination.page} of {pagination.totalPages}
        {' · '}
        {pagination.total} students
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!pagination.hasPreviousPage || loading}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-lg border border-[#454650] px-3 py-2 text-xs font-semibold text-[#D0D0D8] transition hover:bg-[#303139] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          disabled={!pagination.hasNextPage || loading}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-lg border border-[#454650] px-3 py-2 text-xs font-semibold text-[#D0D0D8] transition hover:bg-[#303139] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
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

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [selectedSection, setSelectedSection] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [page, setPage] = useState(1);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [dashboardError, setDashboardError] = useState('');
  const [studentsError, setStudentsError] = useState('');
  const [attendanceError, setAttendanceError] = useState('');

  const loadDashboard = useCallback(async (signal) => {
    setDashboardLoading(true);
    setDashboardError('');

    try {
      const result = await mentorDashboardService.getDashboard({
        signal,
      });

      if (!signal.aborted) {
        setDashboard(result);
      }
    } catch (error) {
      if (!isCancelled(error, signal)) {
        setDashboardError(getErrorMessage(error));
      }
    } finally {
      if (!signal.aborted) {
        setDashboardLoading(false);
      }
    }
  }, []);

  const loadStudents = useCallback(async (signal) => {
    setStudentsLoading(true);
    setStudentsError('');

    try {
      const result = await mentorAssignedStudentsService.getStudents({
        page,
        limit: PAGE_SIZE,
        search,
        status,
        signal,
      });

      if (!signal.aborted) {
        setStudents(result.students);
        setPagination(result.pagination);
      }
    } catch (error) {
      if (!isCancelled(error, signal)) {
        setStudentsError(getErrorMessage(error));
      }
    } finally {
      if (!signal.aborted) {
        setStudentsLoading(false);
      }
    }
  }, [page, search, status]);

  const loadAttendance = useCallback(async (signal) => {
    setAttendanceLoading(true);
    setAttendanceError('');

    try {
      const result = await mentorAttendanceService.getOverview(
        {
          sectionId: selectedSection || undefined,
        },
        { signal },
      );

      if (!signal.aborted) {
        setAttendance(result);
      }
    } catch (error) {
      if (!isCancelled(error, signal)) {
        setAttendanceError(getErrorMessage(error));
      }
    } finally {
      if (!signal.aborted) {
        setAttendanceLoading(false);
      }
    }
  }, [selectedSection]);

  useEffect(() => {
    const controller = new AbortController();

    loadDashboard(controller.signal);

    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    const controller = new AbortController();

    loadStudents(controller.signal);

    return () => controller.abort();
  }, [loadStudents]);

  useEffect(() => {
    const controller = new AbortController();

    loadAttendance(controller.signal);

    return () => controller.abort();
  }, [loadAttendance]);

  function handleSearch(event) {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleClearFilters() {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setPage(1);
  }

  const summary = dashboard?.summary;

  const sections = dashboard?.assignments?.sections ?? [];

  const threshold = attendance?.attendance?.threshold ?? 75;

  const attendancePercentage =
    attendance?.attendance?.averagePercentage;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="MENTOR WORKSPACE"
        title="Student Mentoring"
        description="Manage your assigned student follow-up, review attendance patterns and identify students who require academic attention."
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
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition hover:border-[#CDB5F7]/40 hover:bg-[#303139]"
          >
            Full student directory →
          </Link>
        }
      />

      {dashboardError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4"
        >
          <p className="text-sm font-semibold text-rose-300">
            Unable to load Mentor summary
          </p>

          <p className="mt-2 text-sm text-[#A5A6B0]">
            {dashboardError}
          </p>
        </div>
      )}

      <section
        aria-label="Mentoring summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label="Assigned Students"
          value={
            dashboardLoading
              ? '—'
              : summary?.assignedStudents ?? 0
          }
          description="Active students in your assigned sections."
          icon="students"
        />

        <SummaryCard
          label="Assigned Batches"
          value={
            dashboardLoading
              ? '—'
              : summary?.assignedBatches ?? 0
          }
          description="Academic batches assigned to you."
          icon="batch"
        />

        <SummaryCard
          label="Average Attendance"
          value={
            attendanceLoading
              ? '—'
              : attendancePercentage === null
                || attendancePercentage === undefined
                ? 'N/A'
                : `${attendancePercentage.toFixed(1)}%`
          }
          description="Based on actual attendance records."
          icon="attendance"
        />

        <SummaryCard
          label="Students Requiring Attention"
          value={
            attendanceLoading
              ? '—'
              : attendance?.attendance?.belowThresholdCount ?? '—'
          }
          description={`Attendance below ${threshold}%.`}
          icon="warning"
        />
      </section>

      <SectionCard
        eyebrow="STUDENT FOLLOW-UP"
        title="Assigned student directory"
        description="Search and review students belonging to your authorized mentoring sections."
        action={
          <span className="rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-2 text-xs font-semibold text-[#CDB5F7]">
            {pagination?.total ?? 0} students
          </span>
        }
      >
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_auto_auto]"
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#858590]">
              <Icon type="search" />
            </span>

            <label
              htmlFor="mentoring-student-search"
              className="sr-only"
            >
              Search students
            </label>

            <input
              id="mentoring-student-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, institutional ID or email..."
              className="min-h-11 w-full rounded-xl border border-[#3B3C43] bg-[#14161C] py-2.5 pl-11 pr-3 text-sm text-[#EAEAE6] outline-none placeholder:text-[#777986] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            />
          </div>

          <div>
            <label
              htmlFor="mentoring-student-status"
              className="sr-only"
            >
              Student status
            </label>

            <select
              id="mentoring-student-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="min-h-11 w-full rounded-xl border border-[#3B3C43] bg-[#14161C] px-3 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7]"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={studentsLoading}
            className="min-h-11 rounded-xl bg-[#CDB5F7] px-5 py-2.5 text-sm font-semibold text-[#191621] transition hover:bg-[#DCCBFA] disabled:opacity-50"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleClearFilters}
            disabled={studentsLoading && !search && !status}
            className="min-h-11 rounded-xl border border-[#3B3C43] bg-[#26272B] px-5 py-2.5 text-sm font-semibold text-[#EAEAE6] transition hover:bg-[#303139] disabled:opacity-40"
          >
            Clear
          </button>
        </form>

        {studentsError && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4"
          >
            <p className="text-sm text-rose-300">
              {studentsError}
            </p>

            <button
              type="button"
              onClick={() => setPage((current) => current)}
              className="mt-3 text-xs font-semibold text-[#CDB5F7]"
            >
              Retry by refreshing the page.
            </button>
          </div>
        )}

        {studentsLoading ? (
          <div
            role="status"
            aria-label="Loading assigned students"
            className="mt-5 space-y-4"
          >
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-[#343640]/50"
              />
            ))}
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            title="No students found"
            description={
              search || status
                ? 'No assigned students match the selected search and status filters.'
                : 'Students belonging to your assigned sections will appear here.'
            }
            className="mt-5 border-0 bg-transparent"
          />
        ) : (
          <div className="mt-5">
            {students.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
              />
            ))}

            <Pagination
              pagination={pagination}
              loading={studentsLoading}
              onPageChange={setPage}
            />
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="ATTENDANCE FILTER"
        title="Section-wise mentoring overview"
        description="Select one of your assigned sections to review its attendance and student follow-up indicators."
      >
        <div className="max-w-xl">
          <label
            htmlFor="mentoring-section"
            className="mb-2 block text-xs font-semibold text-[#B8B8C2]"
          >
            Assigned section
          </label>

          <select
            id="mentoring-section"
            value={selectedSection}
            onChange={(event) => setSelectedSection(event.target.value)}
            disabled={dashboardLoading || sections.length === 0}
            className="min-h-11 w-full rounded-xl border border-[#3B3C43] bg-[#14161C] px-3 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] disabled:opacity-50"
          >
            <option value="">
              All assigned sections
            </option>

            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
                {section.code ? ` (${section.code})` : ''}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-[#858590]">
            Attendance analytics and at-risk students update when you
            change this selection. The directory above remains scoped
            to all your assigned sections.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="ATTENDANCE ANALYTICS"
        title="Attendance overview"
        description="Actual attendance records for your assigned sections or selected section."
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
        ) : attendanceLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-[#343640]/50"
              />
            ))}
          </div>
        ) : attendance ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AttendanceMetric
                label="Present"
                value={attendance.attendance.present}
                style="text-emerald-300"
              />

              <AttendanceMetric
                label="Absent"
                value={attendance.attendance.absent}
                style="text-rose-300"
              />

              <AttendanceMetric
                label="Late"
                value={attendance.attendance.late}
                style="text-amber-300"
              />
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
        ) : (
          <EmptyState
            title="No attendance information"
            description="Attendance information is not available for your assigned sections."
            className="border-0 bg-transparent"
          />
        )}
      </SectionCard>

      <SectionCard
        eyebrow="STUDENT FOLLOW-UP"
        title="Students requiring attention"
        description={`Students whose attendance is below the configured ${threshold}% threshold.`}
      >
        {attendanceError ? (
          <EmptyState
            title="Attendance risk data unavailable"
            description="The attendance service could not provide student-level risk information."
            className="border-0 bg-transparent"
          />
        ) : attendanceLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-[#343640]/50"
              />
            ))}
          </div>
        ) : !attendance?.atRiskStudents?.length ? (
          <EmptyState
            title="No students requiring attendance follow-up"
            description="No students currently meet the attendance warning criteria in the selected attendance scope."
            className="border-0 bg-transparent"
          />
        ) : (
          <div>
            {attendance.atRiskStudents.map((student) => (
              <AtRiskStudentRow
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
        description="Assignment completion and assessment-result summaries."
      >
        <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
          <p className="text-sm font-semibold text-[#EAEAE6]">
            Academic analytics are not connected yet.
          </p>

          <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
            The current verified Mentor APIs provide assigned student
            records and attendance analytics. Student result summaries
            and assignment progress are not exposed through a verified
            Mentor overview API yet.
          </p>

          <p className="mt-3 text-xs text-[#858590]">
            No estimated grades or fabricated progress values are displayed.
          </p>
        </div>
      </SectionCard>

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

      <p className="text-xs text-[#777986]">
        Dashboard data is generated from existing backend records.
        Last updated:{' '}
        {formatDate(
          attendance?.generatedAt ?? dashboard?.generatedAt,
        )}
      </p>
    </div>
  );
}