import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import attendanceManagementService from '../../services/attendanceManagementService.js';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_THRESHOLD = 75;

const INITIAL_FILTERS = {
  startDate: '',
  endDate: '',
  section: '',
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load attendance reports. Please try again.'
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

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function AttendanceStatus({ status }) {
  const normalizedStatus = String(status || '').toUpperCase();

  const styles = {
    PRESENT:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    ABSENT:
      'border-red-500/30 bg-red-500/10 text-red-300',
    LATE:
      'border-amber-500/30 bg-amber-500/10 text-amber-200',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[normalizedStatus] ||
        'border-[#454650] bg-[#26272B] text-[#C7C7D0]'
      }`}
    >
      {normalizedStatus || 'Unknown'}
    </span>
  );
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

export default function AttendanceReports() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(null);

  const [records, setRecords] = useState([]);

  const [summary, setSummary] = useState({
    totalRecords: 0,
    averageAttendance: 0,
    belowThreshold: 0,
    attendanceThreshold: DEFAULT_THRESHOLD,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] =
    useState(false);

  const [refreshVersion, setRefreshVersion] = useState(0);

  const threshold =
    Number(summary.attendanceThreshold) || DEFAULT_THRESHOLD;

  const loadReports = useCallback(async (signal) => {
    if (!appliedFilters) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result =
        await attendanceManagementService.getAttendanceReports(
          {
            ...appliedFilters,
            page: pagination.page,
            limit: pagination.limit,
          },
          { signal },
        );

      if (signal.aborted) {
        return;
      }

      setRecords(result.records);
      setSummary(result.summary);
      setPagination(result.pagination);

      setHasGeneratedReport(true);
    } catch (requestError) {
      if (
        signal.aborted ||
        requestError?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setRecords([]);
      setError(getErrorMessage(requestError));
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    appliedFilters,
    pagination.page,
    pagination.limit,
  ]);

  useEffect(() => {
    if (!appliedFilters) {
      return undefined;
    }

    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadReports(controller.signal);
      }
    });

    return () => {
      controller.abort();
    };
  }, [loadReports, refreshVersion, appliedFilters]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));
  }, []);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();

    const nextErrors = {};

    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      nextErrors.endDate =
        'End date must be on or after the start date.';
    }

    if (
      filters.section.trim().length > 100
    ) {
      nextErrors.section =
        'Section name cannot exceed 100 characters.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    setRecords([]);
    setError('');

    setAppliedFilters({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      section: filters.section.trim() || undefined,
    });

    setHasGeneratedReport(true);
  }, [filters]);

  const handleReset = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
    setAppliedFilters(null);

    setErrors({});
    setError('');

    setRecords([]);

    setSummary({
      totalRecords: 0,
      averageAttendance: 0,
      belowThreshold: 0,
      attendanceThreshold: DEFAULT_THRESHOLD,
    });

    setPagination({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      total: 0,
      totalPages: 0,
    });

    setHasGeneratedReport(false);
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

  const showingStart = pagination.total === 0
    ? 0
    : ((pagination.page - 1) * pagination.limit) + 1;

  const showingEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Attendance Reports"
        description="Review department attendance records over a selected period and identify sections requiring attention."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Attendance',
            to: '/hod/attendance',
          },
          {
            label: 'Attendance Reports',
          },
        ]}
        actions={
          <Link to="/hod/attendance">
            <ActionButton variant="secondary">
              Back to Attendance
            </ActionButton>
          </Link>
        }
      />

      {/* Report Filters */}
      <SectionCard
        eyebrow="REPORT CONFIGURATION"
        title="Filter Attendance Records"
        description="Choose a date range and optionally specify a section."
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <FormField
              label="Start Date"
              name="startDate"
              type="date"
              value={filters.startDate}
              onChange={handleChange}
              error={errors.startDate}
              max={filters.endDate || undefined}
            />

            <FormField
              label="End Date"
              name="endDate"
              type="date"
              value={filters.endDate}
              onChange={handleChange}
              error={errors.endDate}
              min={filters.startDate || undefined}
            />

            <FormField
              label="Section"
              name="section"
              value={filters.section}
              onChange={handleChange}
              placeholder="e.g. Section A"
              helperText="Leave blank to include all sections."
              error={errors.section}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Reset Filters
            </ActionButton>

            <ActionButton
              type="submit"
              loading={loading}
            >
              Generate Report
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-5"
        >
          <p className="text-sm font-semibold text-red-300">
            Unable to generate attendance report
          </p>

          <p className="mt-2 text-sm leading-6 text-red-200/80">
            {error}
          </p>

          <ActionButton
            variant="secondary"
            className="mt-4"
            onClick={handleRefresh}
          >
            Try Again
          </ActionButton>
        </div>
      )}

      {/* Report Summary */}
      <SectionCard
        eyebrow="REPORT SUMMARY"
        title="Attendance Statistics"
        description={
          hasGeneratedReport
            ? 'Summary returned by the department attendance report service.'
            : 'Generate a report to view attendance statistics.'
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Attendance Records"
            value={
              hasGeneratedReport
                ? summary.totalRecords
                : '—'
            }
            description="Records matching the selected filters"
          />

          <SummaryCard
            label="Average Attendance"
            value={
              hasGeneratedReport
                ? formatPercentage(summary.averageAttendance)
                : '—'
            }
            description="Department attendance average"
          />

          <SummaryCard
            label={`Below ${threshold}%`}
            value={
              hasGeneratedReport
                ? summary.belowThreshold
                : '—'
            }
            description="Students below attendance threshold"
            variant="danger"
          />
        </div>
      </SectionCard>

      {/* Report Records */}
      <SectionCard
        eyebrow="REPORT DETAILS"
        title="Attendance Records"
        description="Detailed attendance entries matching the selected report filters."
        action={
          hasGeneratedReport && (
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh Report
            </ActionButton>
          )
        }
      >
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-12 text-center"
          >
            <p className="text-sm text-[#C7C7D0]">
              Generating attendance report...
            </p>
          </div>
        ) : error ? (
          <EmptyState
            title="Report unavailable"
            description="The report could not be loaded. Use the retry action above to try again."
          />
        ) : !hasGeneratedReport ? (
          <EmptyState
            title="No report generated yet"
            description="Choose your filters and generate a report to retrieve actual department attendance records."
          />
        ) : records.length === 0 ? (
          <EmptyState
            title="No attendance records available"
            description="No actual attendance records were found for the selected filters."
            action={
              <ActionButton
                variant="secondary"
                onClick={handleReset}
              >
                Reset Report
              </ActionButton>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Date
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Student
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Student ID
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Batch / Section
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Attendance
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Marked By
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-[#C7C7D0]">
                        {formatDate(record.date)}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-[#EAEAE6]">
                          {record.studentName || 'Unknown student'}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-[#C7C7D0]">
                        {record.studentId || '—'}
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-[#EAEAE6]">
                          {record.batchName || '—'}
                        </p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {record.sectionName || '—'}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-[#EAEAE6]">
                          {record.courseName || '—'}
                        </p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {record.courseCode || ''}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-[#C7C7D0]">
                        {formatPercentage(record.attendancePercentage)}
                      </td>

                      <td className="px-4 py-4">
                        <AttendanceStatus status={record.status} />
                      </td>

                      <td className="px-4 py-4 text-[#C7C7D0]">
                        {record.facultyName || '—'}
                      </td>
                    </tr>
                  ))}
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
                records
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

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm font-semibold text-amber-200">
          Attendance Threshold: {threshold}%
        </p>

        <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
          Students below the department attendance threshold are
          identified by the backend report summary. The report displays
          actual attendance entries and does not generate sample records.
        </p>
      </div>
    </div>
  );
}