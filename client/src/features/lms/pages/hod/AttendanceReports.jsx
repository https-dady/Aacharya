import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import attendanceManagementService from '../../services/attendanceManagementService.js';

const PAGE_SIZE = 20;

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
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getStatusStyles(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PRESENT':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'LATE':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    case 'ABSENT':
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#C7C7D0]';
  }
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load attendance reports.'
  );
}

function createEmptyReport(page = 1) {
  return {
    department: null,
    summary: {
      totalRecords: 0,
      averageAttendance: 0,
      belowThreshold: 0,
      attendanceThreshold: 75,
    },
    records: [],
    pagination: {
      page,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 0,
    },
  };
}

export default function AttendanceReports() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    section: '',
  });

  const [appliedFilters, setAppliedFilters] = useState(null);

  const [report, setReport] = useState(createEmptyReport());

  const [page, setPage] = useState(1);

  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [hasGeneratedReport, setHasGeneratedReport] =
    useState(false);

  const [refreshVersion, setRefreshVersion] = useState(0);

  const loadReport = useCallback(
    async (signal) => {
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
              page,
              limit: PAGE_SIZE,
            },
            {
              signal,
            },
          );

        if (signal.aborted) {
          return;
        }

        setReport(result);
        setHasGeneratedReport(true);
      } catch (requestError) {
        if (signal.aborted) {
          return;
        }

        setError(getErrorMessage(requestError));
        setReport(createEmptyReport(page));
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [appliedFilters, page],
  );

  useEffect(() => {
    if (!appliedFilters) {
      return undefined;
    }

    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadReport(controller.signal);
      }
    });

    return () => {
      controller.abort();
    };
  }, [loadReport, appliedFilters, refreshVersion]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));
  }

  function handleSubmit(event) {
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

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setPage(1);
    setError('');
    setHasGeneratedReport(false);

    setAppliedFilters({
      startDate: filters.startDate,
      endDate: filters.endDate,
      section: filters.section.trim(),
    });
  }

  function handleReset() {
    setFilters({
      startDate: '',
      endDate: '',
      section: '',
    });

    setErrors({});
    setAppliedFilters(null);
    setHasGeneratedReport(false);
    setError('');
    setPage(1);
    setReport(createEmptyReport());
  }

  function handleRefresh() {
    setRefreshVersion((current) => current + 1);
  }

  function handlePreviousPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function handleNextPage() {
    setPage((current) =>
      Math.min(
        Math.max(1, report.pagination.totalPages),
        current + 1,
      ),
    );
  }

  const summary = report.summary;
  const records = report.records;
  const pagination = report.pagination;

  const threshold = summary.attendanceThreshold || 75;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Attendance Reports"
        description="Generate department-scoped attendance reports using date ranges and section filters."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Attendance', to: '/hod/attendance' },
          { label: 'Attendance Reports' },
        ]}
        actions={
          <Link to="/hod/attendance">
            <ActionButton variant="secondary">
              Back to Attendance
            </ActionButton>
          </Link>
        }
      />

      {report.department && (
        <div className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9697A2]">
            Active Department
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              {report.department.name || 'Department'}
            </h2>

            {report.department.code && (
              <span className="rounded-md border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-2 py-1 text-xs font-medium text-[#CDB5F7]">
                {report.department.code}
              </span>
            )}
          </div>
        </div>
      )}

      <SectionCard
        eyebrow="REPORT CONFIGURATION"
        title="Filter Attendance Records"
        description="Select a date range and optionally enter a section name or section code."
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
            />

            <FormField
              label="End Date"
              name="endDate"
              type="date"
              value={filters.endDate}
              onChange={handleChange}
              error={errors.endDate}
            />

            <FormField
              label="Section"
              name="section"
              value={filters.section}
              onChange={handleChange}
              placeholder="e.g. Section A"
              helperText="Leave blank to include all sections."
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
            >
              Reset Filters
            </ActionButton>

            <ActionButton type="submit" loading={loading}>
              Generate Report
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-5"
        >
          <p className="text-sm font-medium text-red-300">
            Attendance report request failed
          </p>

          <p className="mt-2 text-sm leading-6 text-red-200/80">
            {error}
          </p>

          {appliedFilters && (
            <ActionButton
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={handleRefresh}
            >
              Try Again
            </ActionButton>
          )}
        </div>
      )}

      <SectionCard
        eyebrow="REPORT SUMMARY"
        title="Attendance Statistics"
        description={
          hasGeneratedReport
            ? 'Statistics returned by the department attendance report API.'
            : 'Apply filters to retrieve attendance report statistics.'
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
            <p className="text-sm text-[#9697A2]">
              Attendance Records
            </p>

            <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
              {hasGeneratedReport && !loading
                ? summary.totalRecords
                : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
            <p className="text-sm text-[#9697A2]">
              Average Attendance
            </p>

            <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
              {hasGeneratedReport && !loading
                ? formatPercentage(summary.averageAttendance)
                : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-[#191A21] p-5">
            <p className="text-sm text-[#9697A2]">
              Students Below {threshold}%
            </p>

            <p className="mt-3 text-2xl font-semibold text-red-300">
              {hasGeneratedReport && !loading
                ? summary.belowThreshold
                : '—'}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="REPORT DETAILS"
        title="Attendance Records"
        description="Detailed attendance entries returned by the backend."
      >
        {loading ? (
          <div
            role="status"
            className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-12 text-center"
          >
            <p className="text-sm text-[#C7C7D0]">
              Generating attendance report...
            </p>
          </div>
        ) : !hasGeneratedReport ? (
          <EmptyState
            title="No report generated yet"
            description="Choose your report filters and select Generate Report to retrieve department attendance records."
          />
        ) : records.length === 0 ? (
          <EmptyState
            title="No attendance records found"
            description="No records match the selected date range and section filter."
            action={
              <ActionButton
                variant="secondary"
                onClick={handleReset}
              >
                Reset Filters
              </ActionButton>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[1150px] text-left text-sm">
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
                      Section
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Faculty
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Attendance
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {records.map((record) => {
                    const isBelowThreshold =
                      Number(record.attendancePercentage) < threshold;

                    return (
                      <tr
                        key={record.id}
                        className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                          {formatDate(record.date)}
                        </td>

                        <td className="px-4 py-4 font-medium text-[#EAEAE6]">
                          {record.studentName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.studentId || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.sectionName || '—'}
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-[#D0D0D8]">
                            {record.courseName || '—'}
                          </p>

                          {record.courseCode && (
                            <p className="mt-1 text-xs text-[#9697A2]">
                              {record.courseCode}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.facultyName || '—'}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              isBelowThreshold
                                ? 'font-semibold text-red-300'
                                : 'font-semibold text-emerald-300'
                            }
                          >
                            {formatPercentage(
                              record.attendancePercentage,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyles(record.status)}`}
                          >
                            {record.status || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#343640] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#9697A2]">
                Showing {records.length} of {pagination.total} records
                <span className="mx-2">·</span>
                Page {pagination.page} of{' '}
                {Math.max(1, pagination.totalPages)}
              </p>

              <div className="flex items-center gap-2">
                <ActionButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={handlePreviousPage}
                >
                  Previous
                </ActionButton>

                <ActionButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={
                    page >= pagination.totalPages || loading
                  }
                  onClick={handleNextPage}
                >
                  Next
                </ActionButton>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Report information
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          Reports are retrieved from the authenticated HOD's department.
          Attendance status is the recorded session status, while the
          attendance percentage is the student's overall percentage
          calculated by the backend for the selected attendance query.
        </p>
      </div>
    </div>
  );
}