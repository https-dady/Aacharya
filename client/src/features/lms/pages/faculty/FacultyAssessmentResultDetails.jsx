import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';

import facultyAssessmentResultDetailsService from '../../services/facultyAssessmentResultDetailsService.js';

const DEFAULT_PAGE_SIZE = 20;

const RESULT_STATUS_OPTIONS = [
  { value: 'all', label: 'All result statuses' },
  { value: 'ENTERED', label: 'Evaluated' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'EXEMPT', label: 'Exempt' },
];

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
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatStatus(status) {
  const labels = {
    ENTERED: 'Evaluated',
    PENDING: 'Pending',
    ABSENT: 'Absent',
    EXEMPT: 'Exempt',
  };

  return labels[status] || status || 'Unknown';
}

function getStatusStyles(status) {
  const styles = {
    ENTERED:
      'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',

    PENDING:
      'border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]',

    ABSENT:
      'border-red-400/20 bg-red-400/10 text-red-300',

    EXEMPT:
      'border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]',
  };

  return styles[status] || styles.PENDING;
}

function StatusBadge({ status }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1',
        'text-xs font-semibold',
        getStatusStyles(status),
      ].join(' ')}
    >
      {formatStatus(status)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  description,
  accent = 'lavender',
}) {
  const accentStyles = {
    lavender: 'border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]',
    yellow: 'border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]',
    green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    red: 'border-red-400/20 bg-red-400/10 text-red-300',
  };

  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm font-medium text-[#A5A6B0]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-3 text-xs leading-5 text-[#858590]">
        {description}
      </p>

      <div
        aria-hidden="true"
        className={`mt-4 h-1 w-12 rounded-full ${accentStyles[accent]}`}
      />
    </article>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor="student-result-status"
        className="mb-2 block text-xs font-semibold text-[#A5A6B0]"
      >
        Result status
      </label>

      <select
        id="student-result-status"
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
            className="h-32 animate-pulse rounded-2xl border border-[#343640] bg-[#1D1F27]"
          />
        ))}
      </div>

      <div className="h-80 animate-pulse rounded-2xl border border-[#343640] bg-[#1D1F27]" />

      <span className="sr-only">
        Loading student assessment results.
      </span>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      title="Unable to load student results"
      description={
        message ||
        'Something went wrong while retrieving the assessment results.'
      }
      action={
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#D8C7FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Try again
        </button>
      }
    />
  );
}

function MarksDisplay({ result }) {
  if (result.status !== 'ENTERED') {
    return (
      <span className="text-sm text-[#858590]">
        Not available
      </span>
    );
  }

  return (
    <div>
      <p className="font-semibold text-[#EAEAE6]">
        {result.marksObtained} / {result.totalMarks}
      </p>

      <p className="mt-1 text-xs text-[#858590]">
        {result.percentage ?? 0}%
      </p>
    </div>
  );
}

function EvaluationDetails({ result }) {
  return (
    <div className="space-y-4 rounded-xl border border-[#343640] bg-[#14161C]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#EAEAE6]">
          Evaluation details
        </h3>

        <StatusBadge status={result.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-[#858590]">
            Evaluated by
          </p>

          <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
            {result.evaluatedBy?.fullName || 'Not evaluated'}
          </p>

          {result.evaluatedBy?.institutionalId && (
            <p className="mt-1 text-xs text-[#858590]">
              {result.evaluatedBy.institutionalId}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-[#858590]">
            Evaluation date
          </p>

          <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
            {formatDate(result.evaluatedAt)}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#858590]">
            Publication date
          </p>

          <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
            {formatDate(result.publishedAt)}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#858590]">
            Performance
          </p>

          <p className="mt-1 text-sm font-semibold">
            {result.passed === true && (
              <span className="text-emerald-300">
                Passed
              </span>
            )}

            {result.passed === false && (
              <span className="text-red-300">
                Below passing marks
              </span>
            )}

            {result.passed === null && (
              <span className="text-[#858590]">
                Not applicable
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="border-t border-[#343640] pt-4">
        <p className="text-xs font-semibold text-[#858590]">
          Evaluation remarks
        </p>

        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#C4C4CD]">
          {result.remarks || 'No evaluation remarks provided.'}
        </p>
      </div>
    </div>
  );
}

function StudentResultsTable({
  results,
  expandedResultId,
  onToggleDetails,
}) {
  if (results.length === 0) {
    return (
      <EmptyState
        title="No student results found"
        description="No student result records match the selected search and status filters."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#343640] text-xs uppercase tracking-wider text-[#858590]">
            <th scope="col" className="px-4 py-3 font-semibold">
              Student
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Institutional ID
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Marks
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Performance
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Evaluated on
            </th>

            <th scope="col" className="px-4 py-3 font-semibold">
              Details
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#343640]">
          {results.map((result) => {
            const isExpanded =
              expandedResultId === result.id;

            return (
              <tr
                key={result.id}
                className="group"
              >
                <td colSpan={7} className="p-0">
                  <div className="grid min-w-[900px] grid-cols-[1.4fr_1fr_0.8fr_0.9fr_0.9fr_1.2fr_0.7fr] items-center transition-colors hover:bg-[#26272B]/70">
                    <div className="px-4 py-4">
                      <p className="font-medium text-[#EAEAE6]">
                        {result.student?.fullName || 'Unknown student'}
                      </p>
                    </div>

                    <div className="px-4 py-4 text-sm text-[#B8B8C2]">
                      {result.student?.institutionalId || '—'}
                    </div>

                    <div className="px-4 py-4">
                      <MarksDisplay result={result} />
                    </div>

                    <div className="px-4 py-4 text-sm">
                      {result.passed === true && (
                        <span className="font-semibold text-emerald-300">
                          Passed
                        </span>
                      )}

                      {result.passed === false && (
                        <span className="font-semibold text-red-300">
                          Not passed
                        </span>
                      )}

                      {result.passed === null && (
                        <span className="text-[#858590]">
                          —
                        </span>
                      )}
                    </div>

                    <div className="px-4 py-4">
                      <StatusBadge status={result.status} />
                    </div>

                    <div className="px-4 py-4 text-sm text-[#B8B8C2]">
                      {formatDate(result.evaluatedAt)}
                    </div>

                    <div className="px-4 py-4">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          onToggleDetails(
                            isExpanded ? null : result.id,
                          )
                        }
                        className={[
                          'rounded-lg px-3 py-2 text-xs font-semibold',
                          'text-[#CDB5F7] transition-colors',
                          'hover:bg-[#CDB5F7]/10',
                          'focus-visible:outline-none focus-visible:ring-2',
                          'focus-visible:ring-[#CDB5F7]',
                        ].join(' ')}
                      >
                        {isExpanded ? 'Hide' : 'View'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[#343640] bg-[#1D1F27] p-4 sm:p-5">
                      <EvaluationDetails result={result} />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function FacultyAssessmentResultDetails() {
  const { assessmentId } = useParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [assessment, setAssessment] = useState(null);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    entered: 0,
    absent: 0,
    exempt: 0,
  });

  const [results, setResults] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [expandedResultId, setExpandedResultId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filters = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : status,
    }),
    [page, pageSize, search, status],
  );

  const loadResults = useCallback(
    async (signal) => {
      setLoading(true);
      setError('');

      try {
        const response =
          await facultyAssessmentResultDetailsService.listAssessmentResults(
            assessmentId,
            filters,
            { signal },
          );

        if (signal?.aborted) {
          return;
        }

        setAssessment(response.assessment);
        setSummary(response.summary);
        setResults(response.results);
        setPagination(response.pagination);
        setExpandedResultId(null);
      } catch (requestError) {
        if (signal?.aborted) {
          return;
        }

        setError(
          requestError?.message ||
            'Unable to retrieve student assessment results.',
        );

        setAssessment(null);
        setResults([]);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [assessmentId, filters],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadResults(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadResults]);

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value) {
    setStatus(value);
    setPage(1);
  }

  function handlePageSizeChange(value) {
    setPageSize(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(search.trim()) || status !== 'all';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Academic results"
        title={assessment?.title || 'Student Results'}
        description="Review student marks, evaluation status, performance and evaluator remarks for this assessment."
        breadcrumbs={[
          {
            label: 'Faculty',
            to: '/faculty/dashboard',
          },
          {
            label: 'Assessment Results',
            to: '/faculty/results',
          },
          {
            label: 'Student Details',
          },
        ]}
        actions={
          <Link
            to="/faculty/results"
            className={[
              'inline-flex min-h-10 items-center justify-center',
              'rounded-xl border border-[#454650] bg-[#26272B]',
              'px-4 py-2 text-sm font-semibold text-[#EAEAE6]',
              'transition-colors hover:bg-[#303139]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
            ].join(' ')}
          >
            Back to assessments
          </Link>
        }
      />

      {loading && !assessment ? (
        <LoadingState />
      ) : error && !assessment ? (
        <ErrorState
          message={error}
          onRetry={() => {
            const controller = new AbortController();
            loadResults(controller.signal);
          }}
        />
      ) : (
        <>
          {assessment && (
            <SectionCard
              eyebrow="Assessment overview"
              title={assessment.title}
              description={assessment.description || 'No assessment description provided.'}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[#343640] bg-[#14161C]/50 p-4">
                  <p className="text-xs text-[#858590]">
                    Course
                  </p>

                  <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
                    {assessment.course?.title || '—'}
                  </p>

                  {assessment.course?.code && (
                    <p className="mt-1 text-xs text-[#858590]">
                      {assessment.course.code}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#14161C]/50 p-4">
                  <p className="text-xs text-[#858590]">
                    Assessment type
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#EAEAE6]">
                    {assessment.type?.replaceAll('_', ' ') || '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#14161C]/50 p-4">
                  <p className="text-xs text-[#858590]">
                    Total marks
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#EAEAE6]">
                    {assessment.totalMarks}
                  </p>
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#14161C]/50 p-4">
                  <p className="text-xs text-[#858590]">
                    Passing marks
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#EAEAE6]">
                    {assessment.passingMarks}
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          <section
            aria-label="Student result summary"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <SummaryCard
              label="Total students"
              value={summary.total}
              description="Student result records for this assessment"
              accent="lavender"
            />

            <SummaryCard
              label="Evaluated"
              value={summary.entered}
              description="Students with marks entered"
              accent="green"
            />

            <SummaryCard
              label="Pending"
              value={summary.pending}
              description="Awaiting evaluation"
              accent="yellow"
            />

            <SummaryCard
              label="Absent / Exempt"
              value={summary.absent + summary.exempt}
              description={`${summary.absent} absent · ${summary.exempt} exempt`}
              accent="red"
            />
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <SectionCard
            title="Student-wise results"
            description="Search students and inspect marks and evaluation information."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,1.5fr)_minmax(190px,1fr)]">
              <div className="min-w-0">
                <label
                  htmlFor="student-result-search"
                  className="mb-2 block text-xs font-semibold text-[#A5A6B0]"
                >
                  Search students
                </label>

                <SearchInput
                  name="student-result-search"
                  label="Search students"
                  value={search}
                  onChange={(event) =>
                    handleSearchChange(event.target.value)
                  }
                  placeholder="Search by student name or institutional ID..."
                />
              </div>

              <FilterSelect
                value={status}
                onChange={handleStatusChange}
                options={RESULT_STATUS_OPTIONS}
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#343640] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#858590]" aria-live="polite">
                Showing{' '}
                <span className="font-semibold text-[#EAEAE6]">
                  {results.length}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[#EAEAE6]">
                  {pagination.total}
                </span>{' '}
                student records
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
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Student records"
            description="Marks, performance and evaluation details for individual students."
          >
            {loading && results.length === 0 ? (
              <LoadingState />
            ) : (
              <>
                <StudentResultsTable
                  results={results}
                  expandedResultId={expandedResultId}
                  onToggleDetails={setExpandedResultId}
                />

                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  pageSize={pagination.limit}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[10, 20, 50, 100]}
                  disabled={loading}
                />
              </>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}