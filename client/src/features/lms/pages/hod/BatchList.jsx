import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import DataTable from '../../components/DataTable.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const PAGE_SIZE = 20;

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to load batches. Please try again.'
  );
}

function getResponseData(response) {
  const body = response?.data;

  return body?.data ?? body;
}

function getPagination(data, requestedPage) {
  const pagination = data?.pagination ?? {};

  return {
    page: Number(pagination.page ?? requestedPage),
    limit: Number(pagination.limit ?? PAGE_SIZE),
    total: Number(pagination.total ?? 0),
    totalPages: Number(pagination.totalPages ?? 0),
    hasNextPage: Boolean(pagination.hasNextPage),
    hasPreviousPage: Boolean(pagination.hasPreviousPage),
  };
}

const BATCH_COLUMNS = [
  {
    key: 'name',
    header: 'Batch',
    accessor: 'name',
    render: (value, batch) => (
      <div>
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
  },
  {
    key: 'sectionCount',
    header: 'Sections',
    accessor: 'sectionCount',
    render: (value) => (
      typeof value === 'number' ? value : '—'
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
            'inline-flex rounded-full border px-2.5 py-1',
            'text-xs font-medium',
            styles[value]
              || 'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
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
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  const [batches, setBatches] = useState([]);
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

  const loadBatches = useCallback(async (signal) => {
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

    try {
      const response = await api.get(
        '/v1/provisioning/batches',
        {
          params,
          signal,
        },
      );

      const data = getResponseData(response);

      if (!Array.isArray(data?.batches)) {
        throw new Error(
          'Unexpected response received from the batches API.',
        );
      }

      const loadedBatches = data.batches.map((batch) => ({
        ...batch,
        sectionCount: null,
      }));

      setBatches(loadedBatches);
      setPagination(getPagination(data, page));

      /*
       * Section counts are not included in the batch-list response.
       * Fetch the actual count from the existing sections endpoint.
       * A section-count request failure must not break the batch list.
       */
      const sectionCounts = await Promise.all(
        loadedBatches.map(async (batch) => {
          const batchId = batch.id || batch._id;

          if (!batchId) {
            return null;
          }

          try {
            const sectionResponse = await api.get(
              `/v1/provisioning/batches/${encodeURIComponent(batchId)}/sections`,
              {
                params: {
                  page: 1,
                  limit: 1,
                },
                signal,
              },
            );

            const sectionData = getResponseData(
              sectionResponse,
            );

            const total = sectionData?.pagination?.total;

            if (
              total === undefined
              || total === null
              || !Number.isFinite(Number(total))
            ) {
              return null;
            }

            return {
              batchId,
              count: Number(total),
            };
          } catch (sectionError) {
            if (
              signal?.aborted
              || sectionError?.code === 'ERR_CANCELED'
            ) {
              return null;
            }

            return null;
          }
        }),
      );

      if (signal?.aborted) {
        return;
      }

      const countMap = new Map(
        sectionCounts
          .filter(Boolean)
          .map(({ batchId, count }) => [batchId, count]),
      );

      setBatches((currentBatches) =>
        currentBatches.map((batch) => {
          const batchId = batch.id || batch._id;

          if (!countMap.has(batchId)) {
            return batch;
          }

          return {
            ...batch,
            sectionCount: countMap.get(batchId),
          };
        }),
      );
    } catch (requestError) {
      if (
        signal?.aborted
        || requestError?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setBatches([]);
      setPagination({
        page,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      setError(getErrorMessage(requestError));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [page, search, status]);

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => loadBatches(controller.signal),
      search.trim() ? 300 : 0,
    );

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadBatches, search]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setStatus('ALL');
    setPage(1);
  }

  const hasActiveFilters = (
    Boolean(search.trim())
    || status !== 'ALL'
  );

  const knownSectionCounts = batches
    .map((batch) => batch.sectionCount)
    .filter((count) => typeof count === 'number');

  const allSectionCountsAvailable = (
    batches.length > 0
    && knownSectionCounts.length === batches.length
  );

  const sectionCountOnPage = knownSectionCounts.reduce(
    (total, count) => total + count,
    0,
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

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {isLoading && pagination.total === 0
              ? '…'
              : pagination.total}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Total batches in your department.
          </p>
        </div>

        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Academic Sections
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {allSectionCountsAvailable
              ? sectionCountOnPage
              : '—'}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            {allSectionCountsAvailable
              ? 'Sections across the batches on this page.'
              : 'Section totals appear when the section data is available.'}
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
              placeholder="Search batch, code, or academic year..."
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
                className={[
                  'min-h-11 w-full rounded-xl border',
                  'border-[#383943] bg-[#191A21]',
                  'px-3 py-2 text-sm text-[#EAEAE6]',
                  'outline-none transition-colors',
                  'focus:border-[#CDB5F7]',
                  'focus:ring-2 focus:ring-[#CDB5F7]/20',
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
                onClick={() => loadBatches()}
              >
                Retry
              </ActionButton>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p className="text-sm text-[#A5A6B0]">
              {isLoading
                ? 'Loading batches…'
                : pagination.total === 0
                  ? 'No batches found'
                  : `Showing ${startRecord}–${endRecord} of ${pagination.total} batches`}
            </p>

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
          </div>

          <DataTable
            columns={BATCH_COLUMNS}
            data={batches}
            rowKey={(batch) => (
              batch.id
              || batch._id
              || `${batch.code}-${batch.academicYear}`
            )}
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
                  onClick={() => loadBatches()}
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
                    isLoading
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
                  size="sm"
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

      <div className="mt-5 rounded-xl border border-[#383943] bg-[#1D1F27] p-4">
        <p className="text-sm font-medium text-[#EAEAE6]">
          Department-level access
        </p>

        <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
          Batch and section management remain restricted to the
          authenticated HOD's department. Faculty and mentor
          allocations follow the existing role and assignment rules.
        </p>
      </div>
    </div>
  );
}