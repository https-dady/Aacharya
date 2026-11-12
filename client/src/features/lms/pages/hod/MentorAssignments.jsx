import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import mentorManagementService from '../../services/mentorManagementService.js';

import ActionButton from '../../components/ActionButton.jsx';
import DataTable from '../../components/DataTable.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const PAGE_SIZE = 20;
const CLEAR_CONFIRMATION = 'CLEAR_DEPARTMENT_MENTOR_ASSIGNMENTS';

const INITIAL_PAGINATION = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load mentor assignments. Please try again.'
  );
}

function formatAssignedItems(items, emptyLabel) {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyLabel;
  }

  return (
    items
      .map((item) => item?.name || item?.code)
      .filter(Boolean)
      .join(', ') || emptyLabel
  );
}

function getStatusStyles(status) {
  const styles = {
    ACTIVE:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    SUSPENDED:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
    DISABLED:
      'border-rose-500/25 bg-rose-500/10 text-rose-300',
  };

  return (
    styles[status] ||
    'border-[#454650] bg-[#292A32] text-[#A5A6B0]'
  );
}

function normalizeMentorForTable(mentor) {
  return {
    ...mentor,
    facultyName: mentor.fullName || '',
    batch: formatAssignedItems(
      mentor.assignedBatches,
      'No batch assigned',
    ),
    section: formatAssignedItems(
      mentor.assignedSections,
      'No section assigned',
    ),
  };
}

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
      <p className="text-sm text-[#A5A6B0]">{label}</p>

      <p
        className="mt-3 text-2xl font-semibold text-[#EAEAE6]"
        aria-live="polite"
      >
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#777986]">
        {description}
      </p>
    </div>
  );
}

const ASSIGNMENT_COLUMNS = [
  {
    key: 'facultyName',
    header: 'Faculty Member',
    accessor: 'facultyName',
    render: (value, mentor) => (
      <div className="min-w-[170px]">
        <p className="font-medium text-[#EAEAE6]">
          {value || 'Unnamed faculty member'}
        </p>

        {mentor.email && (
          <p className="mt-1 break-all text-xs text-[#858590]">
            {mentor.email}
          </p>
        )}
      </div>
    ),
  },
  {
    key: 'institutionalId',
    header: 'Institutional ID',
    accessor: 'institutionalId',
    render: (value) => (
      <span className="whitespace-nowrap font-mono text-xs text-[#CDB5F7]">
        {value || '—'}
      </span>
    ),
  },
  {
    key: 'batch',
    header: 'Assigned Batches',
    accessor: 'batch',
    render: (value) => (
      <span className="block min-w-[140px] max-w-[260px] whitespace-normal leading-5 text-[#C7C7D0]">
        {value}
      </span>
    ),
  },
  {
    key: 'section',
    header: 'Assigned Sections',
    accessor: 'section',
    render: (value) => (
      <span className="block min-w-[140px] max-w-[260px] whitespace-normal leading-5 text-[#C7C7D0]">
        {value}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Account Status',
    accessor: 'status',
    render: (value) => (
      <span
        className={[
          'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1',
          'text-xs font-medium',
          getStatusStyles(value),
        ].join(' ')}
      >
        {value || 'UNKNOWN'}
      </span>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (_value, mentor) => (
      <Link
        to="/hod/faculty/grant-mentor"
        state={{
          faculty: {
            id: mentor.id,
            institutionalId: mentor.institutionalId,
            fullName: mentor.fullName,
            email: mentor.email,
            role: mentor.role,
            status: mentor.status,
            assignedBatches: mentor.assignedBatches,
            assignedSections: mentor.assignedSections,
          },
        }}
        aria-label={`Manage assignments for ${mentor.fullName || 'mentor'}`}
      >
        <ActionButton
          variant="outline"
          size="sm"
        >
          Manage
        </ActionButton>
      </Link>
    ),
  },
];

export default function MentorAssignments() {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [mentors, setMentors] = useState([]);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [reloadKey, setReloadKey] = useState(0);

  const [showClearPanel, setShowClearPanel] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [clearNotice, setClearNotice] = useState('');

  const loadMentors = useCallback(
    async (signal) => {
      setIsLoading(true);
      setError('');

      try {
        const result = await mentorManagementService.listMentors(
          {
            page,
            limit: PAGE_SIZE,
            search: submittedSearch,
          },
          { signal },
        );

        if (signal?.aborted) {
          return;
        }

        setMentors(
          result.items.map(normalizeMentorForTable),
        );

        setPagination(result.pagination);
      } catch (requestError) {
        if (
          signal?.aborted ||
          requestError?.code === 'ERR_CANCELED'
        ) {
          return;
        }

        setMentors([]);
        setPagination(INITIAL_PAGINATION);
        setError(getErrorMessage(requestError));
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [page, submittedSearch],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadMentors(controller.signal);

    return () => controller.abort();
  }, [loadMentors, reloadKey]);

  const handleSearchChange = useCallback((event) => {
    setSearch(event.target.value);
  }, []);

  const handleSearch = useCallback((value) => {
    setPage(1);
    setSubmittedSearch(String(value ?? '').trim());
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch('');
    setSubmittedSearch('');
    setPage(1);
  }, []);

  const handleRetry = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  const handleClearDepartmentAssignments = useCallback(
    async (event) => {
      event.preventDefault();

      setClearError('');
      setClearNotice('');

      if (clearConfirmation !== CLEAR_CONFIRMATION) {
        setClearError(
          `Type ${CLEAR_CONFIRMATION} exactly to confirm this action.`,
        );
        return;
      }

      setIsClearing(true);

      try {
        const data =
          await mentorManagementService.clearDepartmentAssignments();

        const sectionCount =
          Number(data?.unassignedSectionCount) || 0;

        const mentorCount =
          Number(data?.clearedMentorCount) || 0;

        setClearNotice(
          `Department assignments cleared. ${sectionCount} section(s) unassigned across ${mentorCount} mentor account(s). Mentor roles and accounts were preserved.`,
        );

        setClearConfirmation('');
        setShowClearPanel(false);
        setPage(1);

        setReloadKey((current) => current + 1);
      } catch (requestError) {
        setClearError(getErrorMessage(requestError));
      } finally {
        setIsClearing(false);
      }
    },
    [clearConfirmation],
  );

  const pageBatchCount = useMemo(() => {
    const batchIds = new Set();

    mentors.forEach((mentor) => {
      mentor.assignedBatches.forEach((batch) => {
        if (batch?.id) {
          batchIds.add(batch.id);
        }
      });
    });

    return batchIds.size;
  }, [mentors]);

  const pageSectionCount = useMemo(() => {
    const sectionIds = new Set();

    mentors.forEach((mentor) => {
      mentor.assignedSections.forEach((section) => {
        if (section?.id) {
          sectionIds.add(section.id);
        }
      });
    });

    return sectionIds.size;
  }, [mentors]);

  const pageRangeStart =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;

  const pageRangeEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Mentor Assignments"
        description="Review mentors and their assigned batches and sections within your department."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Mentor Assignments',
          },
        ]}
        actions={
          <>
            <ActionButton
              variant="danger"
              onClick={() => {
                setShowClearPanel((current) => !current);
                setClearError('');
                setClearNotice('');
                setClearConfirmation('');
              }}
              disabled={isClearing}
            >
              {showClearPanel
                ? 'Cancel Clear All'
                : 'Clear All Assignments'}
            </ActionButton>

            <Link to="/hod/faculty/grant-mentor">
              <ActionButton>
                Grant Mentor Role
              </ActionButton>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Total Mentors"
          value={
            isLoading && pagination.total === 0
              ? '—'
              : pagination.total
          }
          description="Total mentor records matching the current search."
        />

        <SummaryCard
          label="Current Page Coverage"
          value={
            isLoading && mentors.length === 0
              ? '—'
              : `${pageBatchCount} batches · ${pageSectionCount} sections`
          }
          description="Distinct assigned batches and sections on this page only."
        />
      </div>

      {clearNotice && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"
        >
          {clearNotice}
        </div>
      )}

      {showClearPanel && (
        <form
          onSubmit={handleClearDepartmentAssignments}
          className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/5 p-5 sm:p-6"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-300">
              Destructive department-wide action
            </p>

            <h2 className="mt-2 text-lg font-semibold text-[#EAEAE6]">
              Clear every mentor assignment?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#C7C7D0]">
              This unassigns all currently assigned sections and
              clears saved batch and section allocations for mentors
              in this department. It does not delete, disable, or
              change the Mentor role of any account.
            </p>

            <label
              htmlFor="clear-department-mentor-confirmation"
              className="mt-4 block text-sm font-semibold text-[#EAEAE6]"
            >
              Type{' '}
              <span className="font-mono text-rose-300">
                {CLEAR_CONFIRMATION}
              </span>{' '}
              to confirm
            </label>

            <input
              id="clear-department-mentor-confirmation"
              name="clearDepartmentMentorConfirmation"
              type="text"
              autoComplete="off"
              value={clearConfirmation}
              onChange={(event) =>
                setClearConfirmation(event.target.value)
              }
              disabled={isClearing}
              className="mt-2 min-h-11 w-full rounded-xl border border-[#454650] bg-[#14161C] px-3.5 py-2.5 font-mono text-sm text-[#EAEAE6] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 disabled:opacity-50"
            />

            <p className="mt-2 text-xs leading-5 text-[#858590]">
              Only the authenticated HOD&apos;s department is affected.
              The server independently validates this request.
            </p>

            {clearError && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm leading-5 text-rose-200"
              >
                {clearError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <ActionButton
                variant="secondary"
                type="button"
                onClick={() => {
                  setShowClearPanel(false);
                  setClearConfirmation('');
                  setClearError('');
                }}
                disabled={isClearing}
              >
                Cancel
              </ActionButton>

              <ActionButton
                variant="danger"
                type="submit"
                disabled={
                  isClearing ||
                  clearConfirmation !== CLEAR_CONFIRMATION
                }
              >
                {isClearing
                  ? 'Clearing...'
                  : 'Confirm Clear All Assignments'}
              </ActionButton>
            </div>
          </div>
        </form>
      )}

      <SectionCard
        eyebrow="MENTOR DIRECTORY"
        title="Current assignments"
        description="Search mentors by name, institutional ID, or email. Search results are provided by the backend."
      >
        <div className="space-y-5">
          <div className="max-w-xl">
            <SearchInput
              name="mentor-assignment-search"
              label="Search mentor assignments"
              value={search}
              onChange={handleSearchChange}
              onSearch={handleSearch}
              placeholder="Search name, institutional ID, or email..."
              disabled={isLoading}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-rose-300">
                  Could not load mentor assignments
                </p>

                <p className="mt-1 text-sm leading-6 text-[#C7C7D0]">
                  {error}
                </p>
              </div>

              <ActionButton
                variant="secondary"
                onClick={handleRetry}
                disabled={isLoading}
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
              {error
                ? 'Mentor records could not be retrieved.'
                : pagination.total === 0 && !isLoading
                  ? 'No mentor records found.'
                  : pagination.total > 0
                    ? `Showing ${pageRangeStart}–${pageRangeEnd} of ${pagination.total} mentors`
                    : 'Loading mentor records…'}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {submittedSearch && (
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={handleClearSearch}
                >
                  Clear search
                </ActionButton>
              )}

              <ActionButton
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                disabled={isLoading}
              >
                Refresh
              </ActionButton>
            </div>
          </div>

          <DataTable
            columns={ASSIGNMENT_COLUMNS}
            data={mentors}
            rowKey={(mentor) => mentor.id}
            loading={isLoading}
            ariaLabel="Mentor assignments"
            emptyTitle={
              error
                ? 'Mentor assignments unavailable'
                : submittedSearch
                  ? 'No matching mentors'
                  : 'No mentors found'
            }
            emptyDescription={
              error
                ? 'The mentor directory could not be loaded. Retry the request to check again.'
                : submittedSearch
                  ? 'No mentors match this name, institutional ID, or email. Try a different search.'
                  : 'There are currently no mentor records available for your department.'
            }
            emptyAction={
              error ? (
                <ActionButton
                  variant="secondary"
                  onClick={handleRetry}
                  disabled={isLoading}
                >
                  Try again
                </ActionButton>
              ) : submittedSearch ? (
                <ActionButton
                  variant="secondary"
                  onClick={handleClearSearch}
                >
                  Clear search
                </ActionButton>
              ) : null
            }
          />

          {pagination.totalPages > 1 && (
            <nav
              aria-label="Mentor assignments pagination"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4"
            >
              <p className="text-sm text-[#A5A6B0]">
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className="flex items-center gap-2">
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  disabled={
                    isLoading ||
                    !pagination.hasPreviousPage
                  }
                >
                  Previous
                </ActionButton>

                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                  disabled={
                    isLoading ||
                    !pagination.hasNextPage
                  }
                >
                  Next
                </ActionButton>
              </div>
            </nav>
          )}
        </div>
      </SectionCard>

      <div className="mt-5 rounded-xl border border-[#383943] bg-[#1D1F27] p-4">
        <p className="text-sm font-medium text-[#EAEAE6]">
          Assignment management
        </p>

        <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
          Use the mentor designation form to update assignments.
          The backend validates that selected batches and sections
          belong to the authenticated HOD&apos;s department.
        </p>

        <div className="mt-4">
          <Link
            to="/hod/faculty/grant-mentor"
            className="inline-flex min-h-10 items-center rounded-xl border border-[#CDB5F7]/30 px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10"
          >
            Open Mentor Assignment Form
          </Link>
        </div>
      </div>
    </div>
  );
}