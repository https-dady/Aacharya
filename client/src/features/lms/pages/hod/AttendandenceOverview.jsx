import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import attendanceManagementService from '../../services/attendanceManagementService.js';

const PAGE_SIZE = 20;

function formatPercentage(value) {
  const percentage = Number(value);

  return Number.isFinite(percentage)
    ? `${percentage.toFixed(1)}%`
    : '—';
}

function getAttendanceStatus(percentage, threshold) {
  return Number(percentage) < Number(threshold)
    ? 'Below threshold'
    : 'At or above threshold';
}

function getAttendanceStatusStyles(percentage, threshold) {
  return Number(percentage) < Number(threshold)
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load department attendance.'
  );
}

export default function AttendanceOverview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [attendance, setAttendance] = useState({
    department: null,
    summary: {
      totalStudents: 0,
      averageAttendance: 0,
      lowAttendanceCount: 0,
      attendanceThreshold: 75,
    },
    students: [],
    pagination: {
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 0,
    },
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result =
        await attendanceManagementService.getAttendanceOverview({
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch,
        });

      setAttendance(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    let isActive = true;

    Promise.resolve().then(() => {
      if (isActive) {
        loadAttendance();
      }
    });

    return () => {
      isActive = false;
    };
  }, [loadAttendance, refreshVersion]);

  const summary = attendance.summary;
  const students = attendance.students;
  const pagination = attendance.pagination;

  const threshold = summary.attendanceThreshold || 75;

  const averageAttendance = useMemo(
    () => formatPercentage(summary.averageAttendance),
    [summary.averageAttendance],
  );

  function handleSearchChange(event) {
    setSearchTerm(event.target.value);
  }

  function handleRefresh() {
    setRefreshVersion((current) => current + 1);
  }

  function handleClearSearch() {
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
  }

  function handlePreviousPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function handleNextPage() {
    setPage((current) =>
      Math.min(
        Math.max(1, pagination.totalPages),
        current + 1,
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Attendance Overview"
        description="Monitor department-wide student attendance and identify students who may require academic support."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Attendance Overview' },
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

      {attendance.department && (
        <div className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9697A2]">
            Active Department
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              {attendance.department.name || 'Department'}
            </h2>

            {attendance.department.code && (
              <span className="rounded-md border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-2 py-1 text-xs font-medium text-[#CDB5F7]">
                {attendance.department.code}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Students Tracked
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {loading ? '—' : summary.totalStudents}
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Students with attendance records
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Average Attendance
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {loading ? '—' : averageAttendance}
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Department-wide average
          </p>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Below Attendance Threshold
          </p>

          <p className="mt-3 text-2xl font-semibold text-red-300">
            {loading ? '—' : summary.lowAttendanceCount}
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Students below {threshold}% attendance
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="ATTENDANCE MONITORING"
        title="Student Attendance Records"
        description={`Review student-wise attendance summaries. Students below ${threshold}% are highlighted for attention.`}
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <SearchInput
              name="attendanceSearch"
              label="Search attendance records"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search student, ID, batch, or section..."
            />
          </div>

          <ActionButton
            type="button"
            variant="secondary"
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </ActionButton>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-5"
          >
            <p className="text-sm font-medium text-red-300">
              Attendance request failed
            </p>

            <p className="mt-2 text-sm leading-6 text-red-200/80">
              {error}
            </p>

            <ActionButton
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={handleRefresh}
            >
              Try Again
            </ActionButton>
          </div>
        )}

        {loading ? (
          <div
            role="status"
            className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-12 text-center"
          >
            <p className="text-sm text-[#C7C7D0]">
              Loading department attendance...
            </p>
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            title={
              debouncedSearch
                ? 'No matching students'
                : 'No attendance records available'
            }
            description={
              debouncedSearch
                ? 'Try another student name, ID, batch, or section.'
                : 'Attendance summaries will appear here when students have recorded attendance in this department.'
            }
            action={
              debouncedSearch ? (
                <ActionButton
                  variant="secondary"
                  onClick={handleClearSearch}
                >
                  Clear Search
                </ActionButton>
              ) : null
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Student
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Student ID
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Batch
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Section
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Sessions
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Present
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
                  {students.map((student) => {
                    const isBelowThreshold =
                      student.attendancePercentage < threshold;

                    return (
                      <tr
                        key={student.id}
                        className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#EAEAE6]">
                            {student.studentName}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {student.studentId || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {student.batchName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {student.sectionName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {student.totalSessions}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {student.attendedSessions}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`font-semibold ${
                              isBelowThreshold
                                ? 'text-red-300'
                                : 'text-emerald-300'
                            }`}
                          >
                            {formatPercentage(
                              student.attendancePercentage,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getAttendanceStatusStyles(
                              student.attendancePercentage,
                              threshold,
                            )}`}
                          >
                            {getAttendanceStatus(
                              student.attendancePercentage,
                              threshold,
                            )}
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
                Showing {students.length} of {pagination.total} students
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

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm font-medium text-amber-200">
          Attendance threshold: {threshold}%
        </p>

        <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
          Attendance percentages and low-attendance counts are calculated
          by the department-scoped backend. This page is read-only; marking
          or modifying attendance is not part of the available HOD API.
        </p>
      </div>
    </div>
  );
}