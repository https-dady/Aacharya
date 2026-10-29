import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import DataTable from '../../components/DataTable.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const PAGE_SIZE = 20;

const FACULTY_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DISABLED', label: 'Disabled' },
];

const FACULTY_ROLE_OPTIONS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'MENTOR', label: 'Mentor / TG' },
];

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || fallback
  );
}

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body;
}

function getPagination(data, requestedPage) {
  const pagination = data?.pagination;

  return {
    page: Number(pagination?.page ?? requestedPage),
    limit: Number(pagination?.limit ?? PAGE_SIZE),
    total: Number(pagination?.total ?? 0),
    totalPages: Number(pagination?.totalPages ?? 0),
    hasNextPage: Boolean(pagination?.hasNextPage),
    hasPreviousPage: Boolean(pagination?.hasPreviousPage),
  };
}

const FACULTY_COLUMNS = [
  {
    key: 'institutionalId',
    header: 'Institutional ID',
    accessor: 'institutionalId',
  },
  {
    key: 'fullName',
    header: 'Faculty Member',
    accessor: 'fullName',
  },
  {
    key: 'email',
    header: 'Email Address',
    accessor: 'email',
    render: (value) => value || 'Not provided',
  },
  {
    key: 'role',
    header: 'Role',
    accessor: 'role',
    render: (value) => {
      const isMentor = value === 'MENTOR';

      return (
        <span
          className={[
            'inline-flex rounded-full border px-2.5 py-1',
            'text-xs font-medium',
            isMentor
              ? 'border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#D8C7FA]'
              : 'border-[#454650] bg-[#292A32] text-[#D0D0D8]',
          ].join(' ')}
        >
          {isMentor ? 'Mentor / TG' : 'Faculty'}
        </span>
      );
    },
  },
  {
    key: 'status',
    header: 'Account Status',
    accessor: 'status',
    render: (value) => {
      const statusStyles = {
        ACTIVE:
          'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
        SUSPENDED:
          'border-amber-500/25 bg-amber-500/10 text-amber-300',
        DISABLED:
          'border-rose-500/25 bg-rose-500/10 text-rose-300',
      };

      return (
        <span
          className={[
            'inline-flex rounded-full border px-2.5 py-1',
            'text-xs font-medium',
            statusStyles[value]
              ?? 'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
          ].join(' ')}
        >
          {value || 'Unknown'}
        </span>
      );
    },
  },
    {
    key: 'actions',
    header: 'Actions',
    render: (_value, faculty) => (
      <div className="flex flex-wrap gap-2">
        <Link
          to="/hod/faculty/details"
          state={{ faculty }}
          aria-label={`View details for ${faculty.fullName || 'faculty member'}`}
        >
          <ActionButton variant="secondary" size="sm">
            View
          </ActionButton>
        </Link>

        <Link
          to="/hod/faculty/edit"
          state={{ faculty }}
          aria-label={`Edit ${faculty.fullName || 'faculty member'}`}
        >
          <ActionButton size="sm">
            Edit
          </ActionButton>
        </Link>

        {faculty.status === 'ACTIVE'
          && ['FACULTY', 'MENTOR'].includes(faculty.role) && (
            <Link
              to="/hod/faculty/grant-mentor"
              state={{ faculty }}
              aria-label={
                faculty.role === 'MENTOR'
                  ? `Manage mentor assignments for ${faculty.fullName || 'faculty member'}`
                  : `Grant mentor role to ${faculty.fullName || 'faculty member'}`
              }
            >
              <ActionButton variant="outline" size="sm">
                {faculty.role === 'MENTOR'
                  ? 'Manage Assignments'
                  : 'Grant Mentor'}
              </ActionButton>
            </Link>
          )}
      </div>
    ),
  },
];

function FilterSelect({
  label,
  value,
  onChange,
  options,
  name,
  disabled = false,
}) {
  return (
    <div className="min-w-0 flex-1">
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-medium text-[#A5A6B0]"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={[
          'min-h-11 w-full rounded-xl border border-[#454650]',
          'bg-[#1D1F27] px-3 py-2.5 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2',
          'focus:ring-[#CDB5F7]/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
        ].join(' ')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FacultyList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [role, setRole] = useState('ALL');
  const [page, setPage] = useState(1);

  const [facultyMembers, setFacultyMembers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFaculty = useCallback(async (signal) => {
    setIsLoading(true);
    setError('');

    const params = {
      page,
      limit: PAGE_SIZE,
    };

    if (search.trim()) {
      params.search = search.trim();
    }

    if (status !== 'ALL') {
      params.status = status;
    }

    if (role !== 'ALL') {
      params.role = role;
    }

    try {
      const response = await api.get('/v1/provisioning/faculty', {
        params,
        signal,
      });

      const data = getResponseData(response);

      if (!Array.isArray(data?.faculty)) {
        throw new Error(
          'The server returned an unexpected faculty list response.',
        );
      }

      setFacultyMembers(data.faculty);
      setPagination(getPagination(data, page));
    } catch (requestError) {
      if (requestError?.code === 'ERR_CANCELED') {
        return;
      }

      setFacultyMembers([]);
      setPagination({
        page,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      setError(
        getErrorMessage(
          requestError,
          'Unable to load faculty accounts. Please try again.',
        ),
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [page, role, search, status]);

  useEffect(() => {
    const controller = new AbortController();

    loadFaculty(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadFaculty]);

  function resetFilters() {
    setSearch('');
    setStatus('ALL');
    setRole('ALL');
    setPage(1);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setPage(1);
  }

  function handleRoleChange(event) {
    setRole(event.target.value);
    setPage(1);
  }

  const hasActiveFilters = (
    search.trim() !== ''
    || status !== 'ALL'
    || role !== 'ALL'
  );

  const facultyOnPage = facultyMembers.filter(
    (faculty) => faculty.role === 'FACULTY',
  ).length;

  const mentorsOnPage = facultyMembers.filter(
    (faculty) => faculty.role === 'MENTOR',
  ).length;

  const startRecord = pagination.total === 0
    ? 0
    : ((pagination.page - 1) * pagination.limit) + 1;

  const endRecord = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Faculty Management"
        description="Manage faculty accounts and review departmental teaching staff."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Faculty Management' },
        ]}
        actions={
          <Link to="/hod/faculty/new">
            <ActionButton
              variant="primary"
              leadingIcon={
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Create Faculty
            </ActionButton>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Matching Accounts
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {isLoading ? '—' : pagination.total}
          </p>

          <p className="mt-1 text-xs text-[#777986]">
            Total records matching the current filters.
          </p>
        </div>

        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Faculty on This Page
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {isLoading ? '—' : facultyOnPage}
          </p>

          <p className="mt-1 text-xs text-[#777986]">
            Faculty accounts on the current page.
          </p>
        </div>

        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Mentor / TG on This Page
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {isLoading ? '—' : mentorsOnPage}
          </p>

          <p className="mt-1 text-xs text-[#777986]">
            Mentor accounts on the current page.
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="STAFF DIRECTORY"
        title="Department faculty"
        description="Search and filter faculty accounts by institutional ID, name, email, role, or account status."
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,1.6fr)_minmax(160px,1fr)_minmax(160px,1fr)]">
            <div>
              <label
                htmlFor="faculty-search"
                className="mb-2 block text-xs font-medium text-[#A5A6B0]"
              >
                Search faculty
              </label>

              <SearchInput
                name="faculty-search"
                label="Search faculty by ID, name, or email"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by name, ID, or email..."
              />
            </div>

            <FilterSelect
              name="faculty-role-filter"
              label="Account role"
              value={role}
              onChange={handleRoleChange}
              options={FACULTY_ROLE_OPTIONS}
              disabled={isLoading}
            />

            <FilterSelect
              name="faculty-status-filter"
              label="Account status"
              value={status}
              onChange={handleStatusChange}
              options={FACULTY_STATUS_OPTIONS}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200"
            >
              <p>{error}</p>

              <ActionButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => loadFaculty()}
                className="mt-3"
              >
                Retry
              </ActionButton>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p className="text-sm text-[#A5A6B0]" aria-live="polite">
              {isLoading
                ? 'Loading faculty records…'
                : `Showing ${startRecord}–${endRecord} of ${pagination.total} records`}
            </p>

            <div className="flex flex-wrap gap-2">
              {hasActiveFilters && (
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={resetFilters}
                >
                  Clear filters
                </ActionButton>
              )}

              <Link to="/hod/faculty/new">
                <ActionButton size="sm">
                  Create faculty account
                </ActionButton>
              </Link>
            </div>
          </div>

          <DataTable
            columns={FACULTY_COLUMNS}
            data={facultyMembers}
            rowKey={(faculty) => (
              faculty.id || faculty._id || faculty.institutionalId
            )}
            loading={isLoading}
            ariaLabel="Department faculty directory"
            emptyTitle={
              error
                ? 'Faculty records unavailable'
                : hasActiveFilters
                  ? 'No matching faculty records'
                  : 'No faculty records found'
            }
            emptyDescription={
              error
                ? 'The faculty directory could not be loaded. Retry the request to load the latest records.'
                : hasActiveFilters
                  ? 'No records match the selected filters. Clear the filters or try another search.'
                  : 'No faculty or Mentor/TG accounts are currently available in your department.'
            }
            emptyAction={
              error ? (
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={() => loadFaculty()}
                >
                  Retry loading
                </ActionButton>
              ) : hasActiveFilters ? (
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={resetFilters}
                >
                  Clear filters
                </ActionButton>
              ) : null
            }
          />

          {pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-[#343640] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#A5A6B0]">
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className="flex gap-2">
                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={
                    isLoading
                    || !pagination.hasPreviousPage
                  }
                  onClick={() => {
                    setPage((currentPage) => Math.max(1, currentPage - 1));
                  }}
                >
                  Previous
                </ActionButton>

                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={
                    isLoading
                    || !pagination.hasNextPage
                  }
                  onClick={() => {
                    setPage((currentPage) => currentPage + 1);
                  }}
                >
                  Next
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        Faculty records are retrieved from the authenticated HOD's
        department. Department-level access restrictions are enforced
        by the backend.
      </p>
    </div>
  );
}