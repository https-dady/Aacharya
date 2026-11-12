import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import attendanceManagementService from '../../services/attendanceManagementService.js';

const DEFAULT_PAGE_SIZE = 20;
const ATTENDANCE_THRESHOLD = 75;

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load attendance records. Please try again.'
  );
}

function formatPercentage(value) {
  const percentage = Number(value);

  return Number.isFinite(percentage)
    ? `${percentage.toFixed(1)}%`
    : '—';
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function SummaryCard({
  label,
  value,
  description,
  variant = 'default',
}) {
  const valueStyles = {
    default: 'text-[#EAEAE6]',
    danger: 'text-red-300',
    success: 'text-emerald-300',
  };

  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
      <p className="text-sm text-[#9697A2]">
        {label}
      </p>

      <p
        className={`mt-3 text-2xl font-semibold ${
          valueStyles[variant]
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#777986]">
        {description}
      </p>
    </div>
  );
}

function AttendanceStatus({ percentage, threshold }) {
  const isBelowThreshold =
    Number(percentage) < threshold;

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
        isBelowThreshold
          ? 'border-red-500/30 bg-red-500/10 text-red-300'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      {isBelowThreshold
        ? `Below ${threshold}%`
        : `At or Above ${threshold}%`}
    </span>
  );
}

export default function AttendanceOverview() {
  const [students, setStudents] = useState([]);

  const [summary, setSummary] = useState({
    totalStudents: 0,
    averageAttendance: 0,
    lowAttendanceCount: 0,
    attendanceThreshold: ATTENDANCE_THRESHOLD,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  const threshold = useMemo(
    () => Number(summary.attendanceThreshold) || ATTENDANCE_THRESHOLD,
    [summary.attendanceThreshold],
  );

  const loadAttendance = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const result =
        await attendanceManagementService.getAttendanceOverview(
          {
            page: pagination.page,
            limit: pagination.limit,
            search: searchTerm.trim(),
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
          { signal },
        );

      if (signal.aborted) {
        return;
      }

      setStudents(result.students);

      setSummary(result.summary);

      setPagination(result.pagination);
    } catch (requestError) {
      if (
        signal.aborted ||
        requestError?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setStudents([]);

      setError(getErrorMessage(requestError));
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadAttendance(controller.signal);
      }
    });

    return () => {
      controller.abort();
    };
  }, [loadAttendance, refreshVersion]);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }, []);

  const handleStartDateChange = useCallback((event) => {
    setStartDate(event.target.value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }, []);

  const handleEndDateChange = useCallback((event) => {
    setEndDate(event.target.value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshVersion((current) => current + 1);
  }, []);

  const handlePageChange = useCallback((nextPage) => {
    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));
  }, []);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || startDate || endDate,
  );

  const showingStart = pagination.total === 0
    ? 0
    : ((pagination.page - 1) * pagination.limit) + 1;

  const showingEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Attendance Overview"
        description="Monitor department-wide student attendance and identify students who may need academic support."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Attendance Overview',
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/hod/sections">
              <ActionButton variant="secondary">
                View Sections
              </ActionButton>
            </Link>

            <Link to="/hod/attendance/reports">
              <ActionButton>
                Attendance Reports
              </ActionButton>
            </Link>
          </div>
        }
      />

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Students Tracked"
          value={
            loading && pagination.total === 0
              ? '—'
              : summary.totalStudents
          }
          description="Students with attendance records"
        />

        <SummaryCard
          label="Average Attendance"
          value={
            loading && pagination.total === 0
              ? '—'
              : formatPercentage(summary.averageAttendance)
          }
          description="Department-wide average attendance"
        />

        <SummaryCard
          label="Below Attendance Threshold"
          value={
            loading && pagination.total === 0
              ? '—'
              : summary.lowAttendanceCount
          }
          description={`Students below ${threshold}% attendance`}
          variant="danger"
        />
      </div>

      {/* Attendance Records */}
      <SectionCard
        eyebrow="ATTENDANCE MONITORING"
        title="Student Attendance Records"
        description="Review student attendance percentages and identify students below the department attendance threshold."
      >
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="max-w-xl">
            <SearchInput
              name="attendanceSearch"
              label="Search students"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by student name, ID, batch or section..."
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="w-full max-w-xs">
              <label
                htmlFor="attendanceStartDate"
                className="mb-2 block text-sm font-medium text-[#C7C7D0]"
              >
                Start Date
              </label>

              <input
                id="attendanceStartDate"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={handleStartDateChange}
                className="min-h-11 w-full rounded-xl border border-[#343640] bg-[#191A21] px-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              />
            </div>

            <div className="w-full max-w-xs">
              <label
                htmlFor="attendanceEndDate"
                className="mb-2 block text-sm font-medium text-[#C7C7D0]"
              >
                End Date
              </label>

              <input
                id="attendanceEndDate"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={handleEndDateChange}
                className="min-h-11 w-full rounded-xl border border-[#343640] bg-[#191A21] px-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="min-h-11 rounded-xl border border-[#454650] bg-[#26272B] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear Filters
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="min-h-11 rounded-xl bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#191A21] transition hover:bg-[#DDCEFA] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-5"
          >
            <p className="text-sm font-semibold text-red-300">
              Could not load attendance records
            </p>

            <p className="mt-2 text-sm leading-6 text-red-200/80">
              {error}
            </p>

            <button
              type="button"
              onClick={handleRefresh}
              className="mt-4 rounded-lg border border-red-400/30 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-12 text-center"
          >
            <p className="text-sm text-[#C7C7D0]">
              Loading department attendance...
            </p>
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? 'No matching students'
                : 'No attendance records available'
            }
            description={
              hasActiveFilters
                ? 'Try changing your search term or date filters.'
                : 'Attendance records will appear here when attendance has been marked for students in your department.'
            }
            action={
              hasActiveFilters ? (
                <ActionButton
                  variant="secondary"
                  onClick={clearFilters}
                >
                  Clear Filters
                </ActionButton>
              ) : (
                <Link to="/hod/attendance/reports">
                  <ActionButton variant="secondary">
                    View Attendance Reports
                  </ActionButton>
                </Link>
              )
            }
          />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Student
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Student ID
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Batch
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Section
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-center font-medium"
                    >
                      Sessions
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-center font-medium"
                    >
                      Present
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-center font-medium"
                    >
                      Absent
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Attendance
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Status
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Last Attendance
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {students.map((student) => {
                    const percentage = Number(
                      student.attendancePercentage,
                    );

                    return (
                      <tr
                        key={student.id}
                        className="bg-[#191A21] transition hover:bg-[#202129]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#EAEAE6]">
                            {student.studentName || 'Unknown student'}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[#C7C7D0]">
                          {student.studentId || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#C7C7D0]">
                          {student.batchName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#C7C7D0]">
                          {student.sectionName || '—'}
                        </td>

                        <td className="px-4 py-4 text-center text-[#C7C7D0]">
                          {student.totalSessions}
                        </td>

                        <td className="px-4 py-4 text-center text-emerald-300">
                          {student.presentCount + student.lateCount}
                        </td>

                        <td className="px-4 py-4 text-center text-red-300">
                          {student.absentCount}
                        </td>

                        <td className="px-4 py-4">
                          <div className="min-w-24">
                            <p className="font-medium text-[#EAEAE6]">
                              {formatPercentage(percentage)}
                            </p>

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#343640]">
                              <div
                                className={`h-full rounded-full ${
                                  percentage < threshold
                                    ? 'bg-red-400'
                                    : 'bg-emerald-400'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    Math.max(percentage, 0),
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <AttendanceStatus
                            percentage={percentage}
                            threshold={threshold}
                          />
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-[#C7C7D0]">
                          {formatDate(student.latestAttendanceDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#9697A2]">
                Showing{' '}
                <span className="font-medium text-[#EAEAE6]">
                  {showingStart}–{showingEnd}
                </span>{' '}
                of{' '}
                <span className="font-medium text-[#EAEAE6]">
                  {pagination.total}
                </span>{' '}
                students
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={
                    loading ||
                    pagination.page <= 1
                  }
                  className="rounded-lg border border-[#454650] px-3 py-2 text-sm text-[#EAEAE6] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-sm text-[#C7C7D0]">
                  Page {pagination.page} of{' '}
                  {Math.max(pagination.totalPages, 1)}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={
                    loading ||
                    pagination.page >= pagination.totalPages
                  }
                  className="rounded-lg border border-[#454650] px-3 py-2 text-sm text-[#EAEAE6] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* Attendance Policy */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm font-semibold text-amber-200">
          Department Attendance Threshold: {threshold}%
        </p>

        <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
          Students below this threshold are flagged for academic
          review. Attendance percentages and summaries are calculated
          by the department attendance backend.
        </p>
      </div>
    </div>
  );
}