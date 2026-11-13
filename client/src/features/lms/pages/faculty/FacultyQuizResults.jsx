import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

import facultyQuizResultsService from '../../services/facultyQuizResultsService.js';
import quizManagementService from '../../services/quizManagementService.js';

const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load quiz results.'
  );
}

function SummaryCard({ label, value, description }) {
  return (
    <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
      <p className="text-sm text-[#9697A2]">{label}</p>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#777986]">
        {description}
      </p>
    </section>
  );
}

function getPercentage(results) {
  const validResults = results.filter(
    (result) => typeof result.percentage === 'number',
  );

  if (validResults.length === 0) return null;

  const total = validResults.reduce(
    (sum, result) => sum + result.percentage,
    0,
  );

  return total / validResults.length;
}

function getScoreLabel(result) {
  if (
    typeof result.obtainedMarks !== 'number' ||
    typeof result.totalMarks !== 'number'
  ) {
    return '—';
  }

  return `${result.obtainedMarks} / ${result.totalMarks}`;
}

export default function FacultyQuizResults() {
  const [searchParams] = useSearchParams();

  const initialQuizId = searchParams.get('quizId') || 'all';

  const [results, setResults] = useState([]);
  const [quizOptions, setQuizOptions] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState(initialQuizId);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quizOptionsLoading, setQuizOptionsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [quizOptionsError, setQuizOptionsError] = useState('');

  const loadResults = useCallback(
    async ({ page = 1, refresh = false } = {}) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

      try {
        const response =
          await facultyQuizResultsService.listResults({
            page,
            limit: PAGE_SIZE,
            search: appliedSearch || undefined,
            quizId:
              selectedQuiz !== 'all'
                ? selectedQuiz
                : undefined,
          });

        setResults(response.items);
        setPagination(response.pagination);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedSearch, selectedQuiz],
  );

  const loadQuizOptions = useCallback(async () => {
    setQuizOptionsLoading(true);
    setQuizOptionsError('');

    try {
      const response = await quizManagementService.listQuizzes({
        page: 1,
        limit: 100,
      });

      setQuizOptions(
        response.items.map((quiz) => ({
          id: quiz.id,
          title: quiz.title,
        })),
      );
    } catch (error) {
      setQuizOptionsError(getErrorMessage(error));
    } finally {
      setQuizOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults({ page: 1 });
  }, [loadResults]);

  useEffect(() => {
    loadQuizOptions();
  }, [loadQuizOptions]);

  const averagePercentage = useMemo(
    () => getPercentage(results),
    [results],
  );

  const highestPercentage = useMemo(() => {
    const validResults = results
      .map((result) => result.percentage)
      .filter((value) => typeof value === 'number');

    return validResults.length > 0
      ? Math.max(...validResults)
      : null;
  }, [results]);

  const submittedCount = results.filter(
    (result) => result.status === 'SUBMITTED',
  ).length;

  function handleSearchSubmit(value) {
    setAppliedSearch(value);
  }

  function handleQuizChange(event) {
    setSelectedQuiz(event.target.value);
  }

  function clearFilters() {
    setSearchTerm('');
    setAppliedSearch('');
    setSelectedQuiz('all');
  }

  function exportCurrentPage() {
    if (results.length === 0) return;

    const headers = [
      'Student Name',
      'Institutional ID',
      'Email',
      'Quiz',
      'Course',
      'Obtained Marks',
      'Total Marks',
      'Percentage',
      'Submitted At',
    ];

    const rows = results.map((result) => [
      result.student?.fullName || '',
      result.student?.institutionalId || '',
      result.student?.email || '',
      result.quiz?.title || '',
      result.course?.title || '',
      result.obtainedMarks ?? '',
      result.totalMarks ?? '',
      result.percentage ?? '',
      result.submittedAt || '',
    ]);

    const escapeCsvValue = (value) => {
      const stringValue = String(value);

      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\r\n');

    const blob = new Blob(
      ['\uFEFF', csvContent],
      { type: 'text/csv;charset=utf-8;' },
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `faculty-quiz-results-page-${pagination.page}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  const showingFrom =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;

  const showingTo = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Quiz Results"
        description="Review submitted student assessments, inspect recorded scores, and monitor quiz performance."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Quizzes',
            to: '/faculty/quizzes',
          },
          {
            label: 'Results',
          },
        ]}
        actions={
          <Link
            to="/faculty/quizzes"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#EAEAE6] transition-colors hover:border-[#CDB5F7]/50 hover:bg-[#26272B]"
          >
            Manage Quizzes
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Submissions"
          value={pagination.total}
          description="Submitted attempts across accessible quizzes"
        />

        <SummaryCard
          label="Current Page"
          value={results.length}
          description="Result records currently loaded"
        />

        <SummaryCard
          label="Average Score"
          value={
            averagePercentage === null
              ? '—'
              : `${averagePercentage.toFixed(1)}%`
          }
          description="Average percentage on the current page"
        />

        <SummaryCard
          label="Highest Score"
          value={
            highestPercentage === null
              ? '—'
              : `${highestPercentage.toFixed(1)}%`
          }
          description="Highest percentage on the current page"
        />
      </div>

      <SectionCard
        eyebrow="ASSESSMENT REPORTING"
        title="Student Results"
        description="Search submitted attempts, filter by quiz, and review recorded scores."
        action={
          <StatusBadge status="SUBMITTED" />
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <SearchInput
                name="facultyQuizResultSearch"
                label="Search results"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                onSearch={handleSearchSubmit}
                placeholder="Search student, ID, quiz..."
              />
            </div>

            <div>
              <label
                htmlFor="faculty-result-quiz"
                className="mb-2 block text-sm font-medium text-[#D0D0D8]"
              >
                Filter by Quiz
              </label>

              <select
                id="faculty-result-quiz"
                value={selectedQuiz}
                onChange={handleQuizChange}
                disabled={quizOptionsLoading}
                className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:opacity-50"
              >
                <option value="all">All quizzes</option>

                {quizOptions.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>

              {quizOptionsError && (
                <p className="mt-2 text-xs text-[#D58B95]">
                  {quizOptionsError}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p
              className="text-sm text-[#9697A2]"
              aria-live="polite"
            >
              Showing {showingFrom}–{showingTo} of {pagination.total} submissions
            </p>

            <div className="flex flex-wrap gap-2">
              {(searchTerm ||
                appliedSearch ||
                selectedQuiz !== 'all') && (
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </ActionButton>
              )}

              <ActionButton
                variant="secondary"
                size="sm"
                loading={refreshing}
                disabled={loading || refreshing}
                onClick={() =>
                  loadResults({
                    page: pagination.page,
                    refresh: true,
                  })
                }
              >
                Refresh
              </ActionButton>

              <ActionButton
                variant="outline"
                size="sm"
                disabled={results.length === 0}
                onClick={exportCurrentPage}
              >
                Export Current Page
              </ActionButton>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-[#D58B95]/40 bg-[#D58B95]/10 p-4 text-sm leading-6 text-[#EAEAE6]"
            >
              {errorMessage}

              <div className="mt-3">
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    loadResults({
                      page: pagination.page,
                    })
                  }
                >
                  Try Again
                </ActionButton>
              </div>
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-[#343640] bg-[#191A21] p-8 text-center text-sm text-[#9697A2]">
              Loading student quiz results...
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              title={
                appliedSearch || selectedQuiz !== 'all'
                  ? 'No matching results'
                  : 'No quiz submissions yet'
              }
              description={
                appliedSearch || selectedQuiz !== 'all'
                  ? 'Try changing your search term or quiz filter.'
                  : 'Submitted student quiz attempts will appear here when available.'
              }
              action={
                appliedSearch || selectedQuiz !== 'all' ? (
                  <ActionButton
                    variant="secondary"
                    onClick={clearFilters}
                  >
                    Reset Filters
                  </ActionButton>
                ) : (
                  <Link
                    to="/faculty/quizzes"
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#CDB5F7] bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#14161C]"
                  >
                    View Quizzes
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-[#343640]">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <caption className="sr-only">
                    Submitted Faculty quiz results
                  </caption>

                  <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Student
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Quiz
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Course
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Submitted At
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Score
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Percentage
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Status
                      </th>

                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#343640]">
                    {results.map((result) => (
                      <tr
                        key={result.id}
                        className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#EAEAE6]">
                            {result.student?.fullName ||
                              'Unknown Student'}
                          </p>

                          <p className="mt-1 text-xs text-[#9697A2]">
                            {result.student?.institutionalId ||
                              result.student?.email ||
                              'Student ID unavailable'}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          <p>{result.quiz?.title || '—'}</p>
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          <p>{result.course?.title || '—'}</p>

                          {result.course?.code && (
                            <p className="mt-1 text-xs text-[#858590]">
                              {result.course.code}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                          {formatDate(result.submittedAt)}
                        </td>

                        <td className="px-4 py-4 font-medium text-[#EAEAE6]">
                          {getScoreLabel(result)}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {typeof result.percentage === 'number'
                            ? `${result.percentage.toFixed(1)}%`
                            : '—'}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={result.status} />
                        </td>

                        <td className="px-4 py-4 text-right">
                          <Link
                            to={`/faculty/quizzes/results/${encodeURIComponent(result.id)}`}
                            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#CDB5F7]/40 px-3 py-2 text-xs font-semibold text-[#CDB5F7] transition-colors hover:border-[#CDB5F7] hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                            aria-label={`View result details for ${result.student?.fullName || 'student'}`}
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
                <p className="text-xs text-[#858590]">
                  Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
                </p>

                <div className="flex gap-2">
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    disabled={
                      loading ||
                      !pagination.hasPreviousPage
                    }
                    onClick={() =>
                      loadResults({
                        page: pagination.page - 1,
                      })
                    }
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
                    onClick={() =>
                      loadResults({
                        page: pagination.page + 1,
                      })
                    }
                  >
                    Next
                  </ActionButton>
                </div>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="RESULT INFORMATION"
        title="Understanding Quiz Scores"
        description="The current results API provides automatically calculated submitted-attempt scores."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <h3 className="text-sm font-semibold text-[#EAEAE6]">
              Obtained Marks
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Marks awarded by the existing quiz submission and scoring logic.
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <h3 className="text-sm font-semibold text-[#EAEAE6]">
              Percentage
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Calculated from obtained marks divided by total marks.
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <h3 className="text-sm font-semibold text-[#EAEAE6]">
              Submission Status
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Only submitted attempts are included in this Faculty results dashboard.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}