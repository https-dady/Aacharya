import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import facultyManagementService, {
  FACULTY_STATUSES,
} from '../../services/facultyManagementService.js';

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

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Active',
    className:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },

  SUSPENDED: {
    label: 'Suspended',
    className:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },

  DISABLED: {
    label: 'Disabled',
    className:
      'border-rose-500/25 bg-rose-500/10 text-rose-300',
  },
};

const STATUS_ACTION_CONFIG = {
  ACTIVE: {
    label: 'Activate',
    description:
      'The faculty member will regain access to the LMS and must sign in again.',
    variant: 'primary',
  },

  SUSPENDED: {
    label: 'Suspend',
    description:
      'The faculty member will immediately lose access to the LMS. Existing sessions will be revoked.',
    variant: 'secondary',
  },

  DISABLED: {
    label: 'Disable',
    description:
      'The faculty account will be disabled. Existing sessions will be revoked.',
    variant: 'danger',
  },
};

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || fallback
  );
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

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-1',
        'text-xs font-medium',
        config?.className
          || 'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
      ].join(' ')}
    >
      {config?.label || status || 'Unknown'}
    </span>
  );
}

function StatusConfirmationDialog({
  faculty,
  targetStatus,
  loading,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, onCancel]);

  if (!faculty || !targetStatus) {
    return null;
  }

  const config = STATUS_ACTION_CONFIG[targetStatus];

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/65 p-4 backdrop-blur-sm',
      ].join(' ')}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
          && !loading
        ) {
          onCancel();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="faculty-status-dialog-title"
        aria-describedby="faculty-status-dialog-description"
        className={[
          'w-full max-w-md rounded-2xl',
          'border border-[#454650] bg-[#1D1F27]',
          'p-6 shadow-2xl shadow-black/30',
        ].join(' ')}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#CDB5F7]">
              ACCOUNT MANAGEMENT
            </span>

            <h2
              id="faculty-status-dialog-title"
              className="mt-2 text-xl font-semibold text-[#EAEAE6]"
            >
              {config.label} faculty account?
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close confirmation dialog"
            className={[
              'rounded-lg p-2 text-[#A5A6B0]',
              'transition-colors hover:bg-[#303139]',
              'hover:text-white disabled:opacity-40',
            ].join(' ')}
          >
            ✕
          </button>
        </div>

        <div className="rounded-xl border border-[#383943] bg-[#14161C] p-4">
          <p className="text-sm font-semibold text-[#EAEAE6]">
            {faculty.fullName}
          </p>

          <p className="mt-1 text-xs text-[#A5A6B0]">
            {faculty.institutionalId}
          </p>

          <p className="mt-3 text-xs text-[#A5A6B0]">
            Current status
          </p>

          <div className="mt-2">
            <StatusBadge status={faculty.status} />
          </div>
        </div>

        <p
          id="faculty-status-dialog-description"
          className="mt-5 text-sm leading-6 text-[#B5B5C0]"
        >
          {config.description}
        </p>

        <p className="mt-3 text-xs leading-5 text-[#858590]">
          This operation will be recorded in the institutional audit
          log. The faculty member will need to sign in again after
          account reactivation.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </ActionButton>

          <ActionButton
            type="button"
            variant={config.variant}
            loading={loading}
            onClick={onConfirm}
          >
            Confirm {config.label}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

function FacultyActions({
  faculty,
  onRequestStatusChange,
  statusUpdating,
}) {
  const facultyId = faculty.id || faculty._id;

  if (!facultyId) {
    return (
      <span className="text-xs text-[#858590]">
        Record ID unavailable
      </span>
    );
  }

  const detailsPath = `/hod/faculty/${encodeURIComponent(facultyId)}`;

  const editPath = `${detailsPath}/edit`;

  const availableStatusActions = [];

  if (faculty.status !== FACULTY_STATUSES.ACTIVE) {
    availableStatusActions.push(FACULTY_STATUSES.ACTIVE);
  }

  if (faculty.status !== FACULTY_STATUSES.SUSPENDED) {
    availableStatusActions.push(FACULTY_STATUSES.SUSPENDED);
  }

  if (faculty.status !== FACULTY_STATUSES.DISABLED) {
    availableStatusActions.push(FACULTY_STATUSES.DISABLED);
  }

  return (
    <div className="flex min-w-[210px] flex-wrap gap-2">
      <Link
        to={detailsPath}
        state={{ faculty }}
        aria-label={`View details for ${faculty.fullName}`}
      >
        <ActionButton variant="secondary" size="sm">
          View
        </ActionButton>
      </Link>

      <Link
        to={editPath}
        state={{ faculty }}
        aria-label={`Edit ${faculty.fullName}`}
      >
        <ActionButton size="sm">
          Edit
        </ActionButton>
      </Link>

      {faculty.status === FACULTY_STATUSES.ACTIVE && (
        <Link
          to="/hod/faculty/grant-mentor"
          state={{ faculty }}
          aria-label={`Manage mentor role for ${faculty.fullName}`}
        >
          <ActionButton variant="outline" size="sm">
            {faculty.role === 'MENTOR'
              ? 'Manage Mentor'
              : 'Grant Mentor'}
          </ActionButton>
        </Link>
      )}

      {availableStatusActions.map((status) => {
        const config = STATUS_ACTION_CONFIG[status];

        return (
          <ActionButton
            key={status}
            type="button"
            size="sm"
            variant={config.variant}
            disabled={statusUpdating}
            onClick={() => {
              onRequestStatusChange(faculty, status);
            }}
            aria-label={`${config.label} ${faculty.fullName}`}
          >
            {config.label}
          </ActionButton>
        );
      })}
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

  const [notice, setNotice] = useState('');

  const [confirmation, setConfirmation] = useState(null);

  const [updatingFacultyId, setUpdatingFacultyId] = useState(null);

  const loadFaculty = useCallback(
    async (signal) => {
      setIsLoading(true);

      setError('');

      try {
        const result = await facultyManagementService.listFaculty(
          {
            page,
            limit: PAGE_SIZE,

            search: search.trim() || undefined,

            status: status !== 'ALL' ? status : undefined,

            role: role !== 'ALL' ? role : undefined,
          },
          {
            signal,
          },
        );

        if (signal?.aborted) {
          return;
        }

        setFacultyMembers(result.faculty);

        setPagination(
          getPagination(result, page),
        );
      } catch (requestError) {
        if (
          requestError?.code === 'ERR_CANCELED'
          || signal?.aborted
        ) {
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
    },
    [
      page,
      role,
      search,
      status,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadFaculty(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadFaculty]);

  const handleSearchChange = useCallback((event) => {
    setSearch(event.target.value);

    setPage(1);
  }, []);

  const handleStatusChange = useCallback((event) => {
    setStatus(event.target.value);

    setPage(1);
  }, []);

  const handleRoleChange = useCallback((event) => {
    setRole(event.target.value);

    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');

    setStatus('ALL');

    setRole('ALL');

    setPage(1);
  }, []);

  const requestStatusChange = useCallback(
    (faculty, targetStatus) => {
      if (!faculty || updatingFacultyId) {
        return;
      }

      if (
        !Object.values(FACULTY_STATUSES).includes(targetStatus)
      ) {
        return;
      }

      if (faculty.status === targetStatus) {
        return;
      }

      setNotice('');

      setConfirmation({
        faculty,
        targetStatus,
      });
    },
    [updatingFacultyId],
  );

  const cancelStatusChange = useCallback(() => {
    if (updatingFacultyId) {
      return;
    }

    setConfirmation(null);
  }, [updatingFacultyId]);

  const confirmStatusChange = useCallback(async () => {
    if (!confirmation || updatingFacultyId) {
      return;
    }

    const {
      faculty,
      targetStatus,
    } = confirmation;

    const facultyId = faculty.id || faculty._id;

    if (!facultyId) {
      setError('The selected faculty account has no valid ID.');

      setConfirmation(null);

      return;
    }

    setUpdatingFacultyId(facultyId);

    setError('');

    setNotice('');

    try {
      const updatedFaculty =
        await facultyManagementService.updateFacultyStatus(
          facultyId,
          targetStatus,
        );

      setFacultyMembers((currentMembers) =>
        currentMembers.map((member) => {
          const memberId = member.id || member._id;

          return memberId === facultyId
            ? {
                ...member,
                ...updatedFaculty,
              }
            : member;
        }),
      );

      setNotice(
        `${updatedFaculty.fullName || faculty.fullName} account status updated to ${targetStatus}.`,
      );

      setConfirmation(null);

      /*
       * Reload from the server so pagination and status filters
       * remain accurate if the updated record no longer matches
       * the current filter.
       */
      await loadFaculty();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Unable to update the faculty account status.',
        ),
      );
    } finally {
      setUpdatingFacultyId(null);
    }
  }, [
    confirmation,
    loadFaculty,
    updatingFacultyId,
  ]);

  const columns = useMemo(
    () => [
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

        render: (value) => (
          <StatusBadge status={value} />
        ),
      },

      {
        key: 'actions',
        header: 'Actions',

        render: (_value, faculty) => (
          <FacultyActions
            faculty={faculty}
            onRequestStatusChange={requestStatusChange}
            statusUpdating={Boolean(updatingFacultyId)}
          />
        ),
      },
    ],
    [
      requestStatusChange,
      updatingFacultyId,
    ],
  );

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
        description="Manage faculty accounts, monitor account status, and review departmental teaching staff."

        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Faculty Management',
          },
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
              Add Faculty
            </ActionButton>
          </Link>
        }
      />

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'mb-5 rounded-xl border',
            'border-emerald-500/25 bg-emerald-500/10',
            'p-4 text-sm text-emerald-200',
          ].join(' ')}
        >
          {notice}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Total Matching Records
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {isLoading ? '—' : pagination.total}
          </p>

          <p className="mt-1 text-xs text-[#777986]">
            Total records matching current filters.
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
              disabled={isLoading || Boolean(updatingFacultyId)}
            />

            <FilterSelect
              name="faculty-status-filter"
              label="Account status"
              value={status}
              onChange={handleStatusChange}
              options={FACULTY_STATUS_OPTIONS}
              disabled={isLoading || Boolean(updatingFacultyId)}
            />

          </div>

          {error && (
            <div
              role="alert"
              className={[
                'rounded-xl border border-rose-500/30',
                'bg-rose-500/10 p-4 text-sm leading-6 text-rose-200',
              ].join(' ')}
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

            <p
              className="text-sm text-[#A5A6B0]"
              aria-live="polite"
            >
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
                  disabled={Boolean(updatingFacultyId)}
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
            columns={columns}
            data={facultyMembers}
            rowKey={(faculty) => (
              faculty.id
              || faculty._id
              || faculty.institutionalId
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
                    || Boolean(updatingFacultyId)
                    || !pagination.hasPreviousPage
                  }
                  onClick={() => {
                    setPage((currentPage) =>
                      Math.max(1, currentPage - 1),
                    );
                  }}
                >
                  Previous
                </ActionButton>

                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={
                    isLoading
                    || Boolean(updatingFacultyId)
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
        department. Department-level access restrictions and account
        status changes are enforced by the backend.
      </p>

      <StatusConfirmationDialog
        faculty={confirmation?.faculty}
        targetStatus={confirmation?.targetStatus}
        loading={Boolean(updatingFacultyId)}
        onCancel={cancelStatusChange}
        onConfirm={confirmStatusChange}
      />

    </div>
  );
}