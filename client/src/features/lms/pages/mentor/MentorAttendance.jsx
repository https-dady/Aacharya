import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorAttendanceService from '../../services/mentorAttendanceService.js';

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
        <path
          d="m7 15 4-4 3 2 5-6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),

    section: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M8 4v16M8 9h13M8 14h13" />
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
  title,
  value,
  description,
  icon,
}) {
  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 transition-colors hover:border-[#CDB5F7]/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#A5A6B0]">
            {title}
          </p>

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
      <p className="text-sm leading-6 text-[#A5A6B0]">
        {children}
      </p>
    </div>
  );
}

function AttendanceProgress({ percentage }) {
  if (percentage === null || percentage === undefined) {
    return (
      <span className="text-xs text-[#858590]">
        No records
      </span>
    );
  }

  const safePercentage = Math.max(
    0,
    Math.min(100, percentage),
  );

  const isBelowThreshold = percentage < 75;

  return (
    <div className="min-w-[130px] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={[
            'text-sm font-semibold',
            isBelowThreshold
              ? 'text-rose-300'
              : 'text-emerald-300',
          ].join(' ')}
        >
          {percentage.toFixed(2)}%
        </span>

        <span className="text-[11px] text-[#858590]">
          / 100
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#343640]">
        <div
          className={[
            'h-full rounded-full transition-all',
            isBelowThreshold
              ? 'bg-rose-400'
              : 'bg-emerald-400',
          ].join(' ')}
          style={{
            width: `${safePercentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function AtRiskStudentsTable({ students }) {
  if (students.length === 0) {
    return (
      <EmptyState
        title="No students requiring attention"
        description="There are no students below the attendance threshold in the available attendance records."
        className="border-0 bg-transparent py-8"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="border-b border-[#343640] bg-[#17181F] text-xs uppercase tracking-wide text-[#858590]">
          <tr>
            <th scope="col" className="px-4 py-4 font-semibold">
              Student
            </th>

            <th scope="col" className="px-4 py-4 font-semibold">
              Institutional ID
            </th>

            <th scope="col" className="px-4 py-4 font-semibold">
              Attendance
            </th>

            <th scope="col" className="px-4 py-4 font-semibold">
              Present
            </th>

            <th scope="col" className="px-4 py-4 font-semibold">
              Absent
            </th>

            <th scope="col" className="px-4 py-4 font-semibold">
              Late
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#343640]">
          {students.map((student) => (
            <tr
              key={student.id}
              className="transition-colors hover:bg-[#26272B]/60"
            >
              <td className="px-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-[#EAEAE6]">
                    {student.fullName}
                  </p>

                  <p className="mt-1 break-all text-xs text-[#858590]">
                    {student.email || 'Email unavailable'}
                  </p>
                </div>
              </td>

              <td className="px-4 py-4 text-[#B8B8C2]">
                {student.institutionalId || '—'}
              </td>

              <td className="px-4 py-4">
                <AttendanceProgress
                  percentage={student.percentage}
                />
              </td>

              <td className="px-4 py-4 text-emerald-300">
                {student.present}
              </td>

              <td className="px-4 py-4 text-rose-300">
                {student.absent}
              </td>

              <td className="px-4 py-4 text-amber-300">
                {student.late}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceBreakdown({ attendance }) {
  const records = [
    {
      label: 'Present',
      value: attendance.present,
      style: 'text-emerald-300',
      bar: 'bg-emerald-400',
    },
    {
      label: 'Absent',
      value: attendance.absent,
      style: 'text-rose-300',
      bar: 'bg-rose-400',
    },
    {
      label: 'Late',
      value: attendance.late,
      style: 'text-amber-300',
      bar: 'bg-amber-400',
    },
  ];

  return (
    <div className="space-y-5">
      {records.map((record) => {
        const percentage = attendance.totalRecords > 0
          ? (record.value / attendance.totalRecords) * 100
          : 0;

        return (
          <div key={record.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm text-[#B8B8C2]">
                {record.label}
              </span>

              <span className={`text-sm font-semibold ${record.style}`}>
                {record.value}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#343640]">
              <div
                className={`h-full rounded-full ${record.bar}`}
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DateFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onReset,
  loading,
  error,
}) {
  return (
    <SectionCard
      title="Attendance date range"
      description="Filter attendance records by session date."
    >
      <form
        onSubmit={onApply}
        className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end"
      >
        <div>
          <label
            htmlFor="attendance-start-date"
            className="mb-2 block text-xs font-semibold text-[#B8B8C2]"
          >
            Start date
          </label>

          <input
            id="attendance-start-date"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={onStartDateChange}
            className="min-h-11 w-full rounded-xl border border-[#3B3C43] bg-[#14161C] px-3 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
          />
        </div>

        <div>
          <label
            htmlFor="attendance-end-date"
            className="mb-2 block text-xs font-semibold text-[#B8B8C2]"
          >
            End date
          </label>

          <input
            id="attendance-end-date"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={onEndDateChange}
            className="min-h-11 w-full rounded-xl border border-[#3B3C43] bg-[#14161C] px-3 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-xl bg-[#CDB5F7] px-5 py-2.5 text-sm font-semibold text-[#191621] transition-colors hover:bg-[#DCCBFA] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Apply filters'}
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={loading}
          className="min-h-11 rounded-xl border border-[#3B3C43] bg-[#26272B] px-5 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-rose-300"
        >
          {error}
        </p>
      )}
    </SectionCard>
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to load attendance overview.'
  );
}

export default function MentorAttendance() {
  const [overview, setOverview] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sectionId, setSectionId] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: '',
    sectionId: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');

  const loadOverview = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const result = await mentorAttendanceService.getOverview(
        {
          startDate: appliedFilters.startDate || undefined,
          endDate: appliedFilters.endDate || undefined,
          sectionId: appliedFilters.sectionId || undefined,
        },
        { signal },
      );

      if (!signal.aborted) {
        setOverview(result);
      }
    } catch (requestError) {
      if (
        !signal.aborted
        && requestError?.code !== 'ERR_CANCELED'
        && requestError?.name !== 'AbortError'
      ) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [appliedFilters]);

  useEffect(() => {
    const controller = new AbortController();

    loadOverview(controller.signal);

    return () => controller.abort();
  }, [loadOverview]);

  function handleApplyFilters(event) {
    event.preventDefault();

    if (
      startDate
      && endDate
      && startDate > endDate
    ) {
      setFilterError(
        'End date must be on or after start date.',
      );

      return;
    }

    setFilterError('');

    setAppliedFilters({
      startDate,
      endDate,
      sectionId,
    });
  }

  function handleResetFilters() {
    setStartDate('');
    setEndDate('');
    setSectionId('');
    setFilterError('');

    setAppliedFilters({
      startDate: '',
      endDate: '',
      sectionId: '',
    });
  }

  const attendance = overview?.attendance;
  const students = overview?.students;

  const averagePercentage = attendance?.averagePercentage;

  const selectedSection = overview?.sections?.find(
    (section) => section.id === appliedFilters.sectionId,
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Mentor workspace"
        title="Attendance & Academic Overview"
        description="Monitor attendance, identify students below the required threshold and review available academic progress for your assigned students."
        breadcrumbs={[
          {
            label: 'Mentor',
            to: '/mentor/dashboard',
          },
          {
            label: 'Attendance & Academics',
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <NavigationLink to="/mentor/class-attendance">
              Mark class attendance
            </NavigationLink>

            <NavigationLink to="/mentor/students">
              Assigned students
            </NavigationLink>
          </div>
        }
      />

      <div className="rounded-2xl border border-[#E5DF98]/20 bg-[#E5DF98]/[0.05] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5DF98]/10 text-[#E5DF98]">
            <OverviewIcon type="warning" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#E5DF98]">
              Attendance warning threshold: below{' '}
              {attendance?.threshold ?? 75}%
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#B8B8C2]">
              Students whose calculated attendance falls below the
              required threshold are identified for mentor follow-up.
              Students without attendance records are not assigned an
              artificial zero percentage.
            </p>
          </div>
        </div>
      </div>

      <SectionCard
        title="Section filter"
        description="View attendance across all assigned sections or isolate one assigned section."
      >
        <div className="max-w-xl">
          <label
            htmlFor="mentor-attendance-section"
            className="mb-2 block text-xs font-semibold text-[#B8B8C2]"
          >
            Assigned section
          </label>

          <select
            id="mentor-attendance-section"
            value={sectionId}
            onChange={(event) => {
              setSectionId(event.target.value);
              setFilterError('');
            }}
            disabled={loading || !overview?.sections?.length}
            className="min-h-11 w-full rounded-xl border border-[#3B3C43] bg-[#14161C] px-3 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              All assigned sections
            </option>

            {(overview?.sections ?? []).map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
                {section.code ? ` (${section.code})` : ''}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-[#858590]">
            Section selection is applied together with the date range below.
          </p>
        </div>
      </SectionCard>

      <DateFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(event) => {
          setStartDate(event.target.value);
          setFilterError('');
        }}
        onEndDateChange={(event) => {
          setEndDate(event.target.value);
          setFilterError('');
        }}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        loading={loading}
        error={filterError}
      />

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-4"
        >
          <p className="text-sm text-rose-300">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              const controller = new AbortController();
              loadOverview(controller.signal);
            }}
            className="rounded-lg border border-rose-400/30 px-4 py-2 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/10"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !overview ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          role="status"
          aria-label="Loading attendance overview"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-2xl border border-[#343640] bg-[#1D1F27]"
            />
          ))}
        </div>
      ) : overview ? (
        <>
          {selectedSection && (
            <div className="rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/[0.06] px-4 py-3">
              <p className="text-sm text-[#CDB5F7]">
                Showing attendance for{' '}
                <span className="font-semibold">
                  {selectedSection.name}
                  {selectedSection.code
                    ? ` (${selectedSection.code})`
                    : ''}
                </span>
              </p>
            </div>
          )}

          <section
            aria-label="Attendance and academic summary"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <SummaryCard
              title="Average attendance"
              value={
                averagePercentage === null
                  ? '—'
                  : `${averagePercentage}%`
              }
              description="Present records as a share of all attendance records"
              icon="attendance"
            />

            <SummaryCard
              title="Below 75% attendance"
              value={attendance.belowThresholdCount}
              description="Students requiring attendance follow-up"
              icon="warning"
            />

            <SummaryCard
              title="Attendance records"
              value={attendance.totalRecords}
              description="Records in the selected date range"
              icon="assignments"
            />

            <SummaryCard
              title="Assigned students"
              value={students.totalAssigned}
              description={
                appliedFilters.sectionId
                  ? 'Students assigned to the selected section'
                  : 'Students in your active assigned sections'
              }
              icon="results"
            />
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard
              eyebrow="Attendance"
              title="Attendance breakdown"
              description="Distribution of actual attendance records."
            >
              <div className="mb-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#343640] bg-[#17181F] p-3">
                  <p className="text-xs text-[#858590]">
                    Present
                  </p>

                  <p className="mt-2 text-xl font-bold text-emerald-300">
                    {attendance.present}
                  </p>
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#17181F] p-3">
                  <p className="text-xs text-[#858590]">
                    Absent
                  </p>

                  <p className="mt-2 text-xl font-bold text-rose-300">
                    {attendance.absent}
                  </p>
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#17181F] p-3">
                  <p className="text-xs text-[#858590]">
                    Late
                  </p>

                  <p className="mt-2 text-xl font-bold text-amber-300">
                    {attendance.late}
                  </p>
                </div>
              </div>

              <AttendanceBreakdown
                attendance={attendance}
              />
            </SectionCard>

            <SectionCard
              eyebrow="Student coverage"
              title="Attendance record coverage"
              description="Shows which assigned students have attendance records in the selected period."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
                  <p className="text-xs text-[#858590]">
                    Assigned students
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[#EAEAE6]">
                    {students.totalAssigned}
                  </p>
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
                  <p className="text-xs text-[#858590]">
                    With records
                  </p>

                  <p className="mt-2 text-2xl font-bold text-emerald-300">
                    {students.withAttendanceRecords}
                  </p>
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#17181F] p-4">
                  <p className="text-xs text-[#858590]">
                    Without records
                  </p>

                  <p className="mt-2 text-2xl font-bold text-amber-300">
                    {students.withoutAttendanceRecords}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#343640] bg-[#17181F] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#B8B8C2]">
                    Sections assigned
                  </p>

                  <span className="text-sm font-semibold text-[#CDB5F7]">
                    {overview.sections.length}
                  </span>
                </div>

                {overview.sections.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {overview.sections.map((section) => (
                      <span
                        key={section.id}
                        className="rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1.5 text-xs font-medium text-[#CDB5F7]"
                      >
                        {section.name}
                        {section.code
                          ? ` (${section.code})`
                          : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#858590]">
                    No active sections are assigned.
                  </p>
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            eyebrow="Mentor follow-up"
            title="Students requiring attention"
            description={`Students with attendance below ${attendance.threshold}% based on their recorded attendance.`}
            action={
              <NavigationLink to="/mentor/students">
                Student directory
              </NavigationLink>
            }
          >
            <AtRiskStudentsTable
              students={overview.atRiskStudents}
            />
          </SectionCard>
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          eyebrow="Assignments"
          title="Assignment progress"
          description="Understand assignment completion and identify pending work."
        >
          <DataNotice>
            Assignment statistics are pending backend integration.
            This section will distinguish submitted, pending and
            evaluated assignments using actual records.
          </DataNotice>
        </SectionCard>

        <SectionCard
          eyebrow="Academic performance"
          title="Results overview"
          description="Review assessment results and identify students who may need academic guidance."
        >
          <DataNotice>
            Result summaries and performance trends will appear after
            the actual assessment-results data source is integrated.
            Grades and percentages are not estimated.
          </DataNotice>
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
        All attendance records are restricted by the backend to
        sections assigned to the authenticated mentor. Attendance
        percentages are calculated from actual records only.
      </p>
    </div>
  );
}