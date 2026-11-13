import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import facultyAcademicResultsService from '../../services/facultyAcademicResultsService.js';

const PAGE_SIZE = 20;

const ASSESSMENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All assessment types' },
  { value: 'INTERNAL', label: 'Internal assessment' },
  { value: 'MID_TERM_1', label: 'Mid-term 1' },
  { value: 'MID_TERM_2', label: 'Mid-term 2' },
  { value: 'CLASS_TEST', label: 'Class test' },
  { value: 'PRACTICAL', label: 'Practical' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'OTHER', label: 'Other' },
];

const ASSESSMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CLOSED', label: 'Closed' },
];

function formatLabel(value) {
  if (!value) {
    return '—';
  }

  return String(value)
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getStatusStyles(status) {
  switch (status) {
    case 'PUBLISHED':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';

    case 'CLOSED':
      return 'border-slate-400/20 bg-slate-400/10 text-slate-300';

    case 'DRAFT':
    default:
      return 'border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]';
  }
}

function SummaryCard({
  label,
  value,
  description,
  accent = 'lavender',
  icon,
}) {
  const accentStyles = {
    lavender: 'border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]',
    yellow: 'border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]',
    green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    neutral: 'border-[#454650] bg-[#26272B] text-[#A7A7B0]',
  };

  return (
    <article className="min-w-0 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#A5A6B0]">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
            {value}
          </p>
        </div>

        <div
          aria-hidden="true"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${accentStyles[accent]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#858590]">
        {description}
      </p>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  name,
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-semibold text-[#A5A6B0]"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          'min-h-11 w-full rounded-xl border border-[#454650]',
          'bg-[#1D1F27] px-3 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus-visible:border-[#CDB5F7] focus-visible:ring-2',
          'focus-visible:ring-[#CDB5F7]/30',
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

function SummaryIcon({ type }) {
  const paths = {
    assessments: (
      <>
        <path
          d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v14A1.25 1.25 0 0 1 17 21.25H7A1.25 1.25 0 0 1 5.75 20V6A1.25 1.25 0 0 1 7 4.75Z"
          strokeLinejoin="round"
        />
        <path
          d="M9 9h6M9 12.5h6M9 16h3"
          strokeLinecap="round"
        />
      </>
    ),

    published: (
      <>
        <path
          d="m5 12.5 4.2 4.2L19 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="9" />
      </>
    ),

    drafts: (
      <>
        <path
          d="M12 8v4l2.5 1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="9" />
      </>
    ),

    students: (
      <>
        <circle cx="9" cy="8" r="3.25" />
        <path
          d="M3.75 19a5.25 5.25 0 0 1 10.5 0M16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.25 4.3"
          strokeLinecap="round"
        />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      {paths[type]}
    </svg>
  );
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-2xl border border-[#343640] bg-[#1D1F27]"
          />
        ))}
      </div>

      <div className="h-72 animate-pulse rounded-2xl border border-[#343640] bg-[#1D1F27]" />

      <span className="sr-only">
        Loading academic assessment records.
      </span>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      title="Unable to load academic results"
      description={
        message ||
        'Something went wrong while retrieving your assessment records.'
      }
      icon={
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="h-7 w-7"
        >
          <path
            d="M12 8v4m0 4h.01"
            strokeLinecap="round"
          />
          <path
            d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            strokeLinejoin="round"
          />
        </svg>
      }
      action={
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#D8C7FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1F27]"
        >
          Try again
        </button>
      }
    />
  );
}

function AssessmentTable({
  assessments,
}) {
  if (assessments.length === 0) {
    return (
      <EmptyState
        title="No assessments found"
        description="There are no assessment records matching the selected filters. Try changing your search or filters."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#343640] text-xs uppercase tracking-wider text-[#858590]">
            <th scope="col" className="px-4 py-3 font-semibold">
              Assessment
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Course
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Type
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Marks
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Student results
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Date
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#343640]">
          {assessments.map((assessment) => (
            <tr
              key={assessment.id}
              className="transition-colors hover:bg-[#26272B]/70"
            >
              <td className="px-4 py-4">
                <p className="font-medium text-[#EAEAE6]">
                  {assessment.title || 'Untitled assessment'}
                </p>

                <p className="mt-1 max-w-xs truncate text-xs text-[#858590]">
                  {assessment.description || 'No description'}
                </p>
              </td>

              <td className="px-4 py-4">
                <p className="text-sm font-medium text-[#B8B8C2]">
                  {assessment.course?.title ||
                    assessment.course?.name ||
                    '—'}
                </p>

                {assessment.course?.code && (
                  <p className="mt-1 text-xs text-[#858590]">
                    {assessment.course.code}
                  </p>
                )}
              </td>

              <td className="px-4 py-4 text-sm text-[#B8B8C2]">
                {assessment.typeLabel ||
                  formatLabel(assessment.type)}
              </td>

              <td className="px-4 py-4 text-sm text-[#B8B8C2]">
                <span className="font-semibold text-[#EAEAE6]">
                  {assessment.totalMarks}
                </span>

                <span className="mt-1 block text-xs text-[#858590]">
                  Pass: {assessment.passingMarks}
                </span>
              </td>

              <td className="px-4 py-4">
                <p className="text-sm font-semibold text-[#EAEAE6]">
                  {assessment.resultSummary?.total ?? 0}
                </p>

                <p className="mt-1 text-xs text-[#858590]">
                  {assessment.resultSummary?.entered ?? 0} evaluated
                </p>
              </td>

              <td className="px-4 py-4 text-sm text-[#B8B8C2]">
                {formatDate(assessment.assessmentDate)}
              </td>

              <td className="px-4 py-4">
                <span
                  className={[
                    'inline-flex rounded-full border px-2.5 py-1',
                    'text-xs font-semibold',
                    getStatusStyles(assessment.status),
                  ].join(' ')}
                >
                  {formatLabel(assessment.status)}
                </span>
              </td>
            </tr>
          ))}
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
    <div className="flex flex-col gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
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
            loading ||
            !pagination.hasPreviousPage
          }
          onClick={() => onPageChange(pagination.page - 1)}
          className="min-h-10 rounded-lg border border-[#454650] px-3 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          disabled={
            loading ||
            !pagination.hasNextPage
          }
          onClick={() => onPageChange(pagination.page + 1)}
          className="min-h-10 rounded-lg border border-[#454650] px-3 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function FacultyResults() {
  const [search, setSearch] = useState('');
  const [assessmentType, setAssessmentType] = useState('all');
  const [publicationStatus, setPublicationStatus] = useState('all');

  const [page, setPage] = useState(1);

  const [assessments, setAssessments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search.trim() || undefined,
      type:
        assessmentType === 'all'
          ? undefined
          : assessmentType,
      status:
        publicationStatus === 'all'
          ? undefined
          : publicationStatus,
    }),
    [
      page,
      search,
      assessmentType,
      publicationStatus,
    ],
  );

  const loadAssessments = useCallback(
    async (signal) => {
      setLoading(true);
      setError('');

      try {
        const response =
          await facultyAcademicResultsService.listAssessments(
            filters,
            { signal },
          );

        if (signal?.aborted) {
          return;
        }

        setAssessments(response.assessments);
        setSummary(response.summary);
        setPagination(response.pagination);
      } catch (requestError) {
        if (signal?.aborted) {
          return;
        }

        setError(
          requestError?.message ||
            'Unable to retrieve academic assessment records.',
        );

        setAssessments([]);
        setSummary(null);
        setPagination({
          page,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [filters, page],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadAssessments(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadAssessments]);

  function clearFilters() {
    setSearch('');
    setAssessmentType('all');
    setPublicationStatus('all');
    setPage(1);
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleTypeChange(value) {
    setAssessmentType(value);
    setPage(1);
  }

  function handleStatusChange(value) {
    setPublicationStatus(value);
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    assessmentType !== 'all' ||
    publicationStatus !== 'all';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title="Assessment Results"
        description="Review assessment records, monitor evaluation progress and access academic result information for your assigned courses."
        breadcrumbs={[
          {
            label: 'Faculty',
            to: '/faculty/dashboard',
          },
          {
            label: 'Results',
          },
        ]}
        actions={
          <Link
            to="/faculty/quizzes/results"
            className={[
              'inline-flex min-h-11 items-center justify-center gap-2',
              'rounded-xl border border-[#454650] bg-[#26272B]',
              'px-4 py-2.5 text-sm font-semibold text-[#EAEAE6]',
              'transition-colors hover:border-[#CDB5F7]/50',
              'hover:bg-[#303139]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
            ].join(' ')}
          >
            Quiz results

            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
            >
              <path
                d="M4 10h12m-5-5 5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        }
      />

      {loading && !summary ? (
        <LoadingState />
      ) : error && !summary ? (
        <ErrorState
          message={error}
          onRetry={() => {
            const controller = new AbortController();
            loadAssessments(controller.signal);
          }}
        />
      ) : (
        <>
          <section
            aria-label="Academic assessment summary"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <SummaryCard
              label="Total assessments"
              value={summary?.totalAssessments ?? 0}
              description="Assessment records assigned to you"
              accent="lavender"
              icon={<SummaryIcon type="assessments" />}
            />

            <SummaryCard
              label="Published"
              value={summary?.publishedAssessments ?? 0}
              description="Assessments published"
              accent="green"
              icon={<SummaryIcon type="published" />}
            />

            <SummaryCard
              label="Draft assessments"
              value={summary?.draftAssessments ?? 0}
              description="Assessments awaiting publication"
              accent="yellow"
              icon={<SummaryIcon type="drafts" />}
            />

            <SummaryCard
              label="Student result entries"
              value={summary?.totalStudentResults ?? 0}
              description="Student result records across assessments"
              accent="neutral"
              icon={<SummaryIcon type="students" />}
            />
          </section>

          <SectionCard
            title="Assessment records"
            description="Search and filter academic assessments assigned to your Faculty account."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,1.5fr)_minmax(190px,1fr)_minmax(170px,1fr)]">
              <div className="min-w-0">
                <label
                  htmlFor="faculty-results-search"
                  className="mb-2 block text-xs font-semibold text-[#A5A6B0]"
                >
                  Search assessments
                </label>

                <SearchInput
                  name="faculty-results-search"
                  label="Search assessments"
                  value={search}
                  onChange={(event) =>
                    handleSearchChange(event.target.value)
                  }
                  placeholder="Search by assessment or course..."
                />
              </div>

              <FilterSelect
                name="faculty-assessment-type"
                label="Assessment type"
                value={assessmentType}
                onChange={handleTypeChange}
                options={ASSESSMENT_TYPE_OPTIONS}
              />

              <FilterSelect
                name="faculty-publication-status"
                label="Publication status"
                value={publicationStatus}
                onChange={handleStatusChange}
                options={ASSESSMENT_STATUS_OPTIONS}
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#343640] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p
                className="text-sm text-[#858590]"
                aria-live="polite"
              >
                Showing{' '}
                <span className="font-semibold text-[#EAEAE6]">
                  {assessments.length}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[#EAEAE6]">
                  {pagination.total}
                </span>{' '}
                assessment records
              </p>

              <div className="flex items-center gap-3">
                {loading && (
                  <span className="text-xs text-[#858590]">
                    Updating...
                  </span>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={[
                      'rounded-lg px-3 py-2 text-sm font-semibold',
                      'text-[#CDB5F7] transition-colors',
                      'hover:bg-[#CDB5F7]/10',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-[#CDB5F7]',
                    ].join(' ')}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <SectionCard
            title="Results listing"
            description="Assessment records, evaluation coverage and publication status."
          >
            {loading && assessments.length === 0 ? (
              <LoadingState />
            ) : (
              <>
                <AssessmentTable assessments={assessments} />

                <Pagination
                  pagination={pagination}
                  onPageChange={setPage}
                  loading={loading}
                />
              </>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}