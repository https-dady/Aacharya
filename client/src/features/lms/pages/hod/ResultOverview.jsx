import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import assessmentManagementService, {
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
} from '../../services/assessmentManagementService.js';

const TYPE_OPTIONS = [
  { value: '', label: 'All assessment types' },
  { value: ASSESSMENT_TYPES.INTERNAL, label: 'Internal' },
  { value: ASSESSMENT_TYPES.MID_TERM_1, label: 'Mid Term 1' },
  { value: ASSESSMENT_TYPES.MID_TERM_2, label: 'Mid Term 2' },
  { value: ASSESSMENT_TYPES.CLASS_TEST, label: 'Class Test' },
  { value: ASSESSMENT_TYPES.PRACTICAL, label: 'Practical' },
  { value: ASSESSMENT_TYPES.ASSIGNMENT, label: 'Assignment' },
  { value: ASSESSMENT_TYPES.OTHER, label: 'Other / Custom Test' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: ASSESSMENT_STATUSES.DRAFT, label: 'Draft' },
  { value: ASSESSMENT_STATUSES.PUBLISHED, label: 'Published' },
  { value: ASSESSMENT_STATUSES.CLOSED, label: 'Closed' },
];

function formatDate(value) {
  if (!value) return 'Not scheduled';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatStatus(status) {
  const labels = {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    CLOSED: 'Closed',
  };

  return labels[status] || status || 'Unknown';
}

function getStatusStyles(status) {
  const styles = {
    DRAFT: 'border-[#E5DF98]/30 bg-[#E5DF98]/10 text-[#E5DF98]',
    PUBLISHED: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    CLOSED: 'border-[#858590]/30 bg-[#858590]/10 text-[#B8B8C2]',
  };

  return styles[status] || styles.DRAFT;
}

function getTypeLabel(type) {
  const option = TYPE_OPTIONS.find(
    (item) => item.value === type,
  );

  return option?.label || type?.replaceAll('_', ' ') || 'Assessment';
}

function getAssessmentTargets(assessment) {
  const batches = assessment.batches || [];
  const sections = assessment.sections || [];

  const batchNames = batches
    .map((batch) => batch.name || batch.code)
    .filter(Boolean);

  const sectionNames = sections
    .map((section) => section.name || section.code)
    .filter(Boolean);

  const targets = [
    ...batchNames,
    ...sectionNames,
  ];

  return targets.length
    ? [...new Set(targets)].join(', ')
    : 'No target information';
}

function SummaryCard({ label, value, description, variant = 'default' }) {
  const variants = {
    default: 'border-[#343640] bg-[#1D1F27]',
    lavender: 'border-[#CDB5F7]/25 bg-[#CDB5F7]/5',
    butter: 'border-[#E5DF98]/25 bg-[#E5DF98]/5',
    green: 'border-emerald-400/20 bg-emerald-400/5',
  };

  return (
    <div
      className={[
        'rounded-2xl border p-5',
        variants[variant] || variants.default,
      ].join(' ')}
    >
      <p className="text-sm font-medium text-[#A7A7B0]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#858590]">
        {description}
      </p>
    </div>
  );
}

export default function ResultOverview() {
  const [assessments, setAssessments] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [department, setDepartment] = useState(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadAssessments = useCallback(
    async (signal) => {
      try {
        setError('');
        setLoading(true);

        const response =
          await assessmentManagementService.listAssessments(
            {
              page,
              limit: 20,
              search,
              type: typeFilter,
              status: statusFilter,
            },
            { signal },
          );

        setAssessments(response.assessments);
        setPagination(response.pagination);
        setDepartment(response.department);
      } catch (requestError) {
        if (
          requestError?.code === 'ERR_CANCELED' ||
          requestError?.name === 'AbortError'
        ) {
          return;
        }

        setError(
          requestError?.message ||
            'Unable to load assessment records. Please try again.',
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [page, search, typeFilter, statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadAssessments(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadAssessments]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleTypeChange(event) {
    setTypeFilter(event.target.value);
    setPage(1);
  }

  function handleStatusChange(event) {
    setStatusFilter(event.target.value);
    setPage(1);
  }

  function handleClearFilters() {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setPage(1);
  }

  function handleRefresh() {
    setRefreshing(true);

    const controller = new AbortController();

    loadAssessments(controller.signal).finally(() => {
      controller.abort();
    });
  }

  const draftCount = assessments.filter(
    (assessment) =>
      assessment.status === ASSESSMENT_STATUSES.DRAFT,
  ).length;

  const publishedCount = assessments.filter(
    (assessment) =>
      assessment.status === ASSESSMENT_STATUSES.PUBLISHED,
  ).length;

  const closedCount = assessments.filter(
    (assessment) =>
      assessment.status === ASSESSMENT_STATUSES.CLOSED,
  ).length;

  const hasFilters = Boolean(
    search || typeFilter || statusFilter,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Oversight"
        title="Results Overview"
        description="Manage department assessments, monitor result entry, and review academic performance."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Results' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionButton
              variant="secondary"
              onClick={handleRefresh}
              loading={refreshing}
              disabled={loading}
            >
              Refresh
            </ActionButton>

            <Link to="/hod/dashboard">
              <ActionButton variant="secondary">
                Back to Dashboard
              </ActionButton>
            </Link>
          </div>
        }
      />

      {department && (
        <div className="rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#A7A7B0]">
            Department
          </p>

          <p className="mt-1 font-semibold text-[#EAEAE6]">
            {department.name}
            {department.code ? ` (${department.code})` : ''}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Assessments"
          value={pagination.total}
          description="Total records matching the current filters."
          variant="lavender"
        />

        <SummaryCard
          label="Draft"
          value={draftCount}
          description="Draft assessments on this page."
          variant="butter"
        />

        <SummaryCard
          label="Published"
          value={publishedCount}
          description="Published assessments on this page."
          variant="green"
        />

        <SummaryCard
          label="Closed"
          value={closedCount}
          description="Closed assessments on this page."
        />
      </div>

      <SectionCard
        title="Assessment Management"
        description="View and filter Internal, Mid Term, Class Test, Practical, Assignment, and custom assessment records."
        action={
          <span className="rounded-full border border-[#343640] bg-[#26272B] px-3 py-1 text-xs font-medium text-[#A7A7B0]">
            {pagination.total} total records
          </span>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_190px]">
          <SearchInput
            name="assessment-search"
            label="Search assessments"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search assessment title or description"
            disabled={loading && !assessments.length}
          />

          <div>
            <label
              htmlFor="assessment-type-filter"
              className="mb-2 block text-xs font-semibold text-[#A7A7B0]"
            >
              Assessment Type
            </label>

            <select
              id="assessment-type-filter"
              value={typeFilter}
              onChange={handleTypeChange}
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              {TYPE_OPTIONS.map((option) => (
                <option
                  key={option.value || 'all-types'}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="assessment-status-filter"
              className="mb-2 block text-xs font-semibold text-[#A7A7B0]"
            >
              Assessment Status
            </label>

            <select
              id="assessment-status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3 text-sm text-[#EAEAE6] outline-none transition focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value || 'all-statuses'}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-4 flex justify-end">
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
            >
              Clear all filters
            </ActionButton>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-400/25 bg-red-400/5 p-4"
          >
            <p className="text-sm font-semibold text-red-300">
              Unable to load assessments
            </p>

            <p className="mt-1 text-sm leading-6 text-[#C5A8AE]">
              {error}
            </p>

            <div className="mt-3">
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
              >
                Try again
              </ActionButton>
            </div>
          </div>
        )}

        {loading && assessments.length === 0 ? (
          <div
            className="flex min-h-52 flex-col items-center justify-center gap-3"
            role="status"
            aria-live="polite"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#CDB5F7] border-r-transparent motion-reduce:animate-none" />

            <p className="text-sm text-[#A7A7B0]">
              Loading department assessments...
            </p>
          </div>
        ) : assessments.length > 0 ? (
          <>
            <div className="mt-6 overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#26272B] text-xs uppercase tracking-wide text-[#A7A7B0]">
                  <tr>
                    <th scope="col" className="px-4 py-4">
                      Assessment
                    </th>

                    <th scope="col" className="px-4 py-4">
                      Type
                    </th>

                    <th scope="col" className="px-4 py-4">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-4">
                      Batch / Section
                    </th>

                    <th scope="col" className="px-4 py-4">
                      Date
                    </th>

                    <th scope="col" className="px-4 py-4">
                      Results
                    </th>

                    <th scope="col" className="px-4 py-4">
                      Status
                    </th>

                    <th scope="col" className="px-4 py-4">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {assessments.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="text-[#EAEAE6] transition-colors hover:bg-[#26272B]/70"
                    >
                      <td className="max-w-64 px-4 py-4">
                        <p className="break-words font-semibold">
                          {assessment.title}
                        </p>

                        {assessment.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#858590]">
                            {assessment.description}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 px-2.5 py-1 text-xs font-medium text-[#CDB5F7]">
                          {getTypeLabel(assessment.type)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium">
                          {assessment.course?.name || '—'}
                        </p>

                        {assessment.course?.code && (
                          <p className="mt-1 text-xs text-[#858590]">
                            {assessment.course.code}
                          </p>
                        )}
                      </td>

                      <td className="max-w-48 px-4 py-4 text-xs leading-5 text-[#A7A7B0]">
                        {getAssessmentTargets(assessment)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-[#A7A7B0]">
                        {formatDate(assessment.assessmentDate)}
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-semibold text-[#EAEAE6]">
                          {assessment.resultCount}
                        </span>

                        <span className="ml-1 text-xs text-[#858590]">
                          students
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={[
                            'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1',
                            'text-xs font-semibold',
                            getStatusStyles(assessment.status),
                          ].join(' ')}
                        >
                          {formatStatus(assessment.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          to="/hod/results/details"
                          state={{ result: assessment }}
                          className="inline-flex rounded-lg font-semibold text-[#CDB5F7] transition-colors hover:text-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                        >
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#A7A7B0]">
                Page {pagination.page} of{' '}
                {Math.max(pagination.totalPages, 1)}
                {' · '}
                {pagination.total} assessments
              </p>

              <div className="flex items-center gap-2">
                <ActionButton
                  variant="secondary"
                  size="sm"
                  disabled={
                    loading ||
                    !pagination.hasPreviousPage
                  }
                  onClick={() => {
                    setPage((current) => Math.max(1, current - 1));
                  }}
                >
                  Previous
                </ActionButton>

                <ActionButton
                  variant="secondary"
                  size="sm"
                  disabled={
                    loading ||
                    !pagination.hasNextPage
                  }
                  onClick={() => {
                    setPage((current) => current + 1);
                  }}
                >
                  Next
                </ActionButton>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              title={
                error
                  ? 'Assessment records unavailable'
                  : hasFilters
                    ? 'No matching assessments'
                    : 'No assessments created yet'
              }
              description={
                error
                  ? 'The assessment list could not be retrieved. Retry the request to continue.'
                  : hasFilters
                    ? 'No assessment matches the selected search and filters. Try changing your filters.'
                    : 'Department assessment records will appear here after assessments are created.'
              }
              action={
                hasFilters ? (
                  <ActionButton
                    variant="secondary"
                    onClick={handleClearFilters}
                  >
                    Clear filters
                  </ActionButton>
                ) : null
              }
            />
          </div>
        )}
      </SectionCard>

      <div className="rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/5 p-4">
        <p className="text-sm font-semibold text-[#CDB5F7]">
          Assessment types supported
        </p>

        <p className="mt-1 text-sm leading-6 text-[#A7A7B0]">
          Internal, Mid Term 1, Mid Term 2, Class Test, Practical,
          Assignment, and Other / Custom Test.
        </p>
      </div>
    </div>
  );
}