import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import batchManagementService from '../../services/batchManagementService.js';

import ActionButton from '../../components/ActionButton.jsx';
import DataTable from '../../components/DataTable.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const PAGE_SIZE = 20;

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
    'Unable to load batches. Please try again.'
  );
}

const BATCH_COLUMNS = [
  {
    key: 'name',
    header: 'Batch',
    accessor: 'name',
    render: (value, batch) => (
      <div className="min-w-[150px]">
        <p className="font-medium text-[#EAEAE6]">
          {value || 'Unnamed batch'}
        </p>

        <p className="mt-1 text-xs text-[#858590]">
          Code: {batch.code || '—'}
        </p>
      </div>
    ),
  },
  {
    key: 'academicYear',
    header: 'Academic Year',
    accessor: 'academicYear',
    render: (value) => (
      <span className="whitespace-nowrap text-[#C7C7D0]">
        {value || '—'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (value) => {
      const styles = {
        ACTIVE:
          'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
        INACTIVE:
          'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
      };

      return (
        <span
          className={[
            'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1',
            'text-xs font-medium',
            styles[value] ||
              'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
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
    render: (_value, batch) => (
      <Link
        to="/hod/batches/details"
        state={{ batch }}
        aria-label={`View details for ${batch.name || 'batch'}`}
      >
        <ActionButton variant="secondary" size="sm">
          View Details
        </ActionButton>
      </Link>
    ),
  },
];

export default function BatchList() {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  const [batches, setBatches] = useState([]);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadBatches = useCallback(
    async (signal) => {
      setIsLoading(true);
      setError('');

      try {
        const result = await batchManagementService.listBatches(
          {
            page,
            limit: PAGE_SIZE,
            search: submittedSearch,
            status,
          },
          { signal },
        );

        if (signal.aborted) {
          return;
        }

        setBatches(result.batches);
        setPagination(result.pagination);
      } catch (requestError) {
        if (
          signal.aborted ||
          requestError?.code === 'ERR_CANCELED'
        ) {
          return;
        }

        setBatches([]);
        setPagination(INITIAL_PAGINATION);
        setError(getErrorMessage(requestError));
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [page, submittedSearch, status],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadBatches(controller.signal);

    return () => controller.abort();
  }, [loadBatches, reloadKey]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
  }

  function handleSearch(value) {
    setSubmittedSearch(String(value ?? '').trim());
    setPage(1);
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setSubmittedSearch('');
    setStatus('ALL');
    setPage(1);
  }

  function handleRetry() {
    setReloadKey((current) => current + 1);
  }

  const hasActiveFilters = (
    Boolean(submittedSearch) ||
    status !== 'ALL'
  );

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
        title="Batch Management"
        description="Organize departmental academic batches and access their sections."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Batch Management',
          },
        ]}
        actions={
          <Link to="/hod/batches/new">
            <ActionButton
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
              Create Batch
            </ActionButton>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Academic Batches
          </p>

          <p
            className="mt-3 text-2xl font-semibold text-[#EAEAE6]"
            aria-live="polite"
          >
            {isLoading && pagination.total === 0
              ? '…'
              : pagination.total}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Total batches matching the current filters.
          </p>
        </div>

        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Current Academic Year
          </p>

          <p className="mt-3 text-xl font-semibold text-[#EAEAE6]">
            {batches[0]?.academicYear || '—'}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Academic year of the most recent batch on this page.
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="ACADEMIC STRUCTURE"
        title="Department batches"
        description="Search by batch name, code, or academic year and filter by status."
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SearchInput
              name="batch-search"
              label="Search batches"
              value={search}
              onChange={handleSearchChange}
              onSearch={handleSearch}
              placeholder="Search batch, code, or academic year..."
              disabled={isLoading}
            />

            <div className="flex flex-col gap-2">
              <label
                htmlFor="batch-status-filter"
                className="text-sm font-medium text-[#D0D0D8]"
              >
                Batch status
              </label>

              <select
                id="batch-status-filter"
                name="batch-status-filter"
                value={status}
                onChange={handleStatusChange}
                disabled={isLoading}
                className={[
                  'min-h-11 w-full rounded-xl border',
                  'border-[#383943] bg-[#191A21]',
                  'px-3 py-2 text-sm text-[#EAEAE6]',
                  'outline-none transition-colors',
                  'focus:border-[#CDB5F7]',
                  'focus:ring-2 focus:ring-[#CDB5F7]/20',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                ].join(' ')}
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm leading-6 text-rose-200">
                {error}
              </p>

              <ActionButton
                type="button"
                variant="secondary"
                size="sm"
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
              {isLoading
                ? 'Loading batches…'
                : pagination.total === 0
                  ? 'No batches found'
                  : `Showing ${startRecord}–${endRecord} of ${pagination.total} batches`}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters && (
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear filters
                </ActionButton>
              )}

              <ActionButton
                type="button"
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
            columns={BATCH_COLUMNS}
            data={batches}
            rowKey={(batch) => batch.id}
            loading={isLoading}
            ariaLabel="Department academic batches"
            emptyTitle={
              error
                ? 'Batch records unavailable'
                : hasActiveFilters
                  ? 'No matching batches'
                  : 'No batches found'
            }
            emptyDescription={
              error
                ? 'The batch directory could not be loaded. Retry the request to load the latest records.'
                : hasActiveFilters
                  ? 'No batches match your search or selected status. Try changing the filters.'
                  : 'No academic batches have been created for your department yet.'
            }
            emptyAction={
              error ? (
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={handleRetry}
                >
                  Retry loading
                </ActionButton>
              ) : hasActiveFilters ? (
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={clearFilters}
                >
                  Clear filters
                </ActionButton>
              ) : (
                <Link to="/hod/batches/new">
                  <ActionButton>
                    Create your first batch
                  </ActionButton>
                </Link>
              )
            }
          />

          {pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-[#343640] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#A5A6B0]">
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className="flex items-center gap-2">
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={
                    isLoading ||
                    !pagination.hasPreviousPage
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
                  size="sm"
                  disabled={
                    isLoading ||
                    !pagination.hasNextPage
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

      <div className="mt-5 rounded-xl border border-[#383943] bg-[#1D1F27] p-4">
        <p className="text-sm font-medium text-[#EAEAE6]">
          Department-level access
        </p>

        <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
          Batch and section management remain restricted to the
          authenticated HOD&apos;s department. Faculty and mentor
          allocations follow the existing role and assignment rules.
        </p>
      </div>
    </div>
  );
}