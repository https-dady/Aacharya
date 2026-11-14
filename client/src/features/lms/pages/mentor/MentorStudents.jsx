import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorAssignedStudentsService from '../../services/mentorAssignedStudentsService.js';

const PAGE_SIZE = 20;

const STUDENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DISABLED', label: 'Disabled' },
];

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

function StudentIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <circle cx="9" cy="8" r="3.25" />

      <path
        d="M3.5 19v-1.25A4.75 4.75 0 0 1 8.25 13h1.5a4.75 4.75 0 0 1 4.75 4.75V19"
        strokeLinecap="round"
      />

      <path
        d="M16 5.2a3.25 3.25 0 0 1 0 6.1M17 13.5a4.75 4.75 0 0 1 3.5 4.58V19"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-4 w-4"
    >
      <circle cx="8.75" cy="8.75" r="5.75" />
      <path d="m13 13 4 4" strokeLinecap="round" />
    </svg>
  );
}

function FilterField({
  label,
  value,
  onChange,
  options,
  id,
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold text-[#B8B8C2]"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={onChange}
        className={[
          'min-h-11 w-full rounded-xl border border-[#3B3C43]',
          'bg-[#14161C] px-3 py-2.5 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
        ].join(' ')}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function getStatusStyles(status) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-400/10 text-emerald-300';

    case 'SUSPENDED':
      return 'bg-amber-400/10 text-amber-300';

    case 'DISABLED':
      return 'bg-rose-400/10 text-rose-300';

    default:
      return 'bg-slate-400/10 text-slate-300';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'ACTIVE':
      return 'Active';

    case 'SUSPENDED':
      return 'Suspended';

    case 'DISABLED':
      return 'Disabled';

    default:
      return 'Unknown';
  }
}

function StudentTable({
  students,
  loading,
  hasActiveFilters,
  onClearFilters,
}) {
  if (loading && students.length === 0) {
    return (
      <div
        className="space-y-4 py-6"
        role="status"
        aria-label="Loading assigned students"
      >
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="h-16 animate-pulse rounded-xl bg-[#26272B]"
          />
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        title={
          hasActiveFilters
            ? 'No matching students found'
            : 'No assigned students yet'
        }
        description={
          hasActiveFilters
            ? 'Try changing your search or status filters to find the student you are looking for.'
            : 'Students assigned to your sections will appear here once assignments are available.'
        }
        className="border-0 bg-transparent py-12"
        action={
          hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-xl border border-[#454650] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139]"
            >
              Clear filters
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="border-b border-[#343640] bg-[#17181F] text-xs uppercase tracking-wide text-[#858590]">
          <tr>
            <th scope="col" className="px-5 py-4 font-semibold">
              Student
            </th>

            <th scope="col" className="px-5 py-4 font-semibold">
              Student ID
            </th>

            <th scope="col" className="px-5 py-4 font-semibold">
              Batch
            </th>

            <th scope="col" className="px-5 py-4 font-semibold">
              Section
            </th>

            <th scope="col" className="px-5 py-4 font-semibold">
              Status
            </th>

            <th scope="col" className="px-5 py-4 font-semibold">
              Email
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#343640]">
          {students.map((student) => {
            const initials = student.fullName
              ?.trim()
              ?.split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join('');

            const batchNames = student.batches
              .map((batch) => batch.name)
              .filter(Boolean);

            const sectionNames = student.sections
              .map((section) => section.name)
              .filter(Boolean);

            return (
              <tr
                key={student.id}
                className="transition-colors hover:bg-[#26272B]/60"
              >
                <td className="px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-sm font-semibold text-[#CDB5F7]">
                      {initials || '?'}
                    </div>

                    <div className="min-w-0">
                      <p className="break-words font-medium text-[#EAEAE6]">
                        {student.fullName || 'Unnamed student'}
                      </p>

                      <p className="mt-1 break-all text-xs text-[#858590]">
                        {student.email || 'Email unavailable'}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 text-[#B8B8C2]">
                  {student.institutionalId || '—'}
                </td>

                <td className="px-5 py-4 text-[#B8B8C2]">
                  {batchNames.length > 0
                    ? batchNames.join(', ')
                    : '—'}
                </td>

                <td className="px-5 py-4 text-[#B8B8C2]">
                  {sectionNames.length > 0
                    ? sectionNames.join(', ')
                    : '—'}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={[
                      'inline-flex rounded-full px-2.5 py-1',
                      'text-xs font-semibold',
                      getStatusStyles(student.status),
                    ].join(' ')}
                  >
                    {getStatusLabel(student.status)}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={[
                      'inline-flex rounded-full px-2.5 py-1',
                      'text-xs font-semibold',
                      student.isEmailVerified
                        ? 'bg-emerald-400/10 text-emerald-300'
                        : 'bg-amber-400/10 text-amber-300',
                    ].join(' ')}
                  >
                    {student.isEmailVerified
                      ? 'Verified'
                      : 'Pending'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  pagination,
  onPageChange,
  loading,
}) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#343640] pt-5">
      <p className="text-sm text-[#858590]">
        Page{' '}
        <span className="font-semibold text-[#EAEAE6]">
          {pagination.page}
        </span>{' '}
        of{' '}
        <span className="font-semibold text-[#EAEAE6]">
          {pagination.totalPages}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={
            loading || !pagination.hasPreviousPage
          }
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-xl border border-[#3B3C43] bg-[#26272B] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          disabled={
            loading || !pagination.hasNextPage
          }
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-xl border border-[#CDB5F7]/30 bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#191621] transition-colors hover:bg-[#DCCBFA] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to load assigned students.'
  );
}

export default function MentorStudents() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);

  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    disabled: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((current) => ({
        ...current,
        page: 1,
      }));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadStudents = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const result =
        await mentorAssignedStudentsService.getStudents({
          page: pagination.page,
          limit: PAGE_SIZE,
          search: debouncedSearch,
          status: status === 'all' ? '' : status,
          signal,
        });

      if (signal.aborted) {
        return;
      }

      setStudents(result.students);
      setSections(result.sections);
      setSummary(result.summary);
      setPagination(result.pagination);
    } catch (requestError) {
      if (
        requestError?.code !== 'ERR_CANCELED'
        && requestError?.name !== 'AbortError'
        && !signal.aborted
      ) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    pagination.page,
    debouncedSearch,
    status,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    loadStudents(controller.signal);

    return () => controller.abort();
  }, [loadStudents]);

  function handleStatusChange(event) {
    setStatus(event.target.value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handlePageChange(nextPage) {
    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));
  }

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatus('all');

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  const hasActiveFilters = Boolean(
    search.trim() || status !== 'all',
  );

  const assignedSectionCount = sections.length;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Mentor workspace"
        title="Assigned Students"
        description="View students belonging to your assigned sections and batches. Access is restricted by your authenticated mentor assignments."
        breadcrumbs={[
          {
            label: 'Mentor',
            to: '/mentor/dashboard',
          },
          {
            label: 'Assigned Students',
          },
        ]}
        actions={
          <Link
            to="/mentor/students/import"
            className={[
              'inline-flex min-h-11 items-center justify-center gap-2',
              'rounded-xl border border-[#CDB5F7]/30',
              'bg-[#CDB5F7] px-4 py-2.5',
              'text-sm font-semibold text-[#191621]',
              'transition-colors hover:bg-[#DCCBFA]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2',
              'focus-visible:ring-offset-[#14161C]',
            ].join(' ')}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4 w-4"
            >
              <path
                d="M10 4v12M4 10h12"
                strokeLinecap="round"
              />
            </svg>

            Import students
          </Link>
        }
      />

      <section
        aria-label="Assigned student summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Assigned students"
          value={summary.total}
          description="Total students in your assigned sections"
          icon={<StudentIcon />}
        />

        <SummaryCard
          label="Active students"
          value={summary.active}
          description="Students with active accounts"
          icon={<StudentIcon />}
        />

        <SummaryCard
          label="Assigned sections"
          value={assignedSectionCount}
          description="Sections currently assigned to you"
          icon={<StudentIcon />}
        />
      </section>

      {error && (
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-4"
          role="alert"
        >
          <p className="text-sm text-rose-300">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              const controller = new AbortController();
              loadStudents(controller.signal);
            }}
            className="rounded-lg border border-rose-400/30 px-4 py-2 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/10"
          >
            Retry
          </button>
        </div>
      )}

      <SectionCard
        title="Find students"
        description="Search by student name, institutional ID or email address and filter by account status."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div className="min-w-0">
            <label
              htmlFor="mentor-student-search"
              className="mb-2 block text-xs font-semibold text-[#B8B8C2]"
            >
              Search students
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#858590]">
                <SearchIcon />
              </span>

              <input
                id="mentor-student-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email or institutional ID"
                autoComplete="off"
                className={[
                  'min-h-11 w-full rounded-xl border border-[#3B3C43]',
                  'bg-[#14161C] py-2.5 pl-10 pr-3 text-sm',
                  'text-[#EAEAE6] placeholder:text-[#686974]',
                  'outline-none transition-colors',
                  'focus:border-[#CDB5F7] focus:ring-2',
                  'focus:ring-[#CDB5F7]/20',
                ].join(' ')}
              />
            </div>
          </div>

          <FilterField
            id="mentor-student-status"
            label="Student status"
            value={status}
            onChange={handleStatusChange}
            options={STUDENT_STATUS_OPTIONS}
          />

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className={[
              'min-h-11 rounded-xl border border-[#3B3C43]',
              'px-4 py-2.5 text-sm font-semibold',
              'transition-colors focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-[#CDB5F7]',
              hasActiveFilters
                ? 'bg-[#26272B] text-[#EAEAE6] hover:bg-[#303139]'
                : 'cursor-not-allowed bg-[#1D1F27] text-[#686974]',
            ].join(' ')}
          >
            Clear filters
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
          <p
            className="text-sm text-[#858590]"
            aria-live="polite"
          >
            {loading
              ? 'Loading student records...'
              : `${pagination.total} student records found`}
          </p>

          <div className="flex flex-wrap gap-3 text-xs text-[#858590]">
            <span>
              Suspended: {summary.suspended}
            </span>

            <span>
              Disabled: {summary.disabled}
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Student records"
        description="Students retrieved from your canonically assigned sections."
      >
        <div className="space-y-5">
          <StudentTable
            students={students}
            loading={loading}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />

          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5DF98]/10 text-[#E5DF98]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="9" />

              <path
                d="M12 11v5m0-8h.01"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#E5DF98]">
              Mentor access boundary
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#B8B8C2]">
              This directory displays students belonging to sections
              assigned to the authenticated mentor. Student access
              restrictions are enforced by the backend, not just
              by frontend visibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}