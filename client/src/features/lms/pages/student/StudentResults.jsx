import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import studentQuizResultService from '../../services/studentQuizResultService.js';

function formatMarks(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : '—';
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function ResultStatusBadge({ status }) {
  const isSubmitted = status === 'published';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1',
        'text-xs font-medium',
        isSubmitted
          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
          : 'border-[#454650] bg-[#252630] text-[#A5A6B0]',
      ].join(' ')}
    >
      {isSubmitted ? 'Submitted' : 'Unavailable'}
    </span>
  );
}

function ResultCard({ result }) {
  const hasValidMarks =
    typeof result.obtainedMarks === 'number' &&
    typeof result.totalMarks === 'number' &&
    Number.isFinite(result.obtainedMarks) &&
    Number.isFinite(result.totalMarks) &&
    result.totalMarks > 0;

  const percentage = hasValidMarks
    ? (result.obtainedMarks / result.totalMarks) * 100
    : null;

  return (
    <article className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#858590]">
            {result.courseCode || 'Course'}
          </p>

          <h3 className="mt-2 break-words text-base font-semibold text-[#EAEAE6]">
            {result.title || 'Quiz'}
          </h3>

          <p className="mt-1 break-words text-sm text-[#A5A6B0]">
            {result.courseName || 'Course unavailable'}
          </p>
        </div>

        <ResultStatusBadge status={result.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-[#858590]">Marks Obtained</p>

          <p className="mt-2 text-2xl font-semibold text-[#EAEAE6]">
            {formatMarks(result.obtainedMarks)}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#858590]">Maximum Marks</p>

          <p className="mt-2 text-2xl font-semibold text-[#EAEAE6]">
            {formatMarks(result.totalMarks)}
          </p>
        </div>
      </div>

      {percentage !== null && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs text-[#858590]">
              Score Percentage
            </span>

            <span className="text-sm font-semibold text-[#CDB5F7]">
              {percentage.toFixed(1)}%
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-[#30313A]"
            role="progressbar"
            aria-label={`${result.title || 'Quiz'} score percentage`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, percentage))}
          >
            <div
              className="h-full rounded-full bg-[#CDB5F7]"
              style={{
                width: `${Math.min(100, Math.max(0, percentage))}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-[#343640] pt-4">
        <p className="text-xs text-[#858590]">Submitted On</p>

        <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
          {formatDate(result.submittedAt)}
        </p>
      </div>
    </article>
  );
}

export default function StudentResults() {
  const [results, setResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const loadResults = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const data = await studentQuizResultService.getMyResults();

      setResults(data);
      setStatus('success');
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to load your quiz results. Please try again.',
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const courses = useMemo(() => {
    const uniqueCourses = new Map();

    results.forEach((result) => {
      const courseName = result.courseName?.trim();

      if (courseName) {
        uniqueCourses.set(courseName, courseName);
      }
    });

    return [...uniqueCourses.values()].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [results]);

  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return results.filter((result) => {
      const matchesSearch =
        !query ||
        [
          result.title,
          result.courseName,
          result.courseCode,
        ].some((value) =>
          String(value || '').toLowerCase().includes(query),
        );

      const matchesCourse =
        selectedCourse === 'all' ||
        result.courseName === selectedCourse;

      return matchesSearch && matchesCourse;
    });
  }, [results, searchQuery, selectedCourse]);

  const scoredResults = results.filter(
    (result) =>
      typeof result.obtainedMarks === 'number' &&
      typeof result.totalMarks === 'number' &&
      result.totalMarks > 0,
  );

  const totalObtained = scoredResults.reduce(
    (total, result) => total + result.obtainedMarks,
    0,
  );

  const totalMaximum = scoredResults.reduce(
    (total, result) => total + result.totalMarks,
    0,
  );

  const overallPercentage =
    totalMaximum > 0
      ? (totalObtained / totalMaximum) * 100
      : null;

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedCourse !== 'all';

  function resetFilters() {
    setSearchQuery('');
    setSelectedCourse('all');
  }

  const summaryCards = [
    {
      label: 'Submitted Quizzes',
      value: results.length,
      description: 'Quiz attempts submitted',
      color: 'text-emerald-300',
    },
    {
      label: 'Scored Quizzes',
      value: scoredResults.length,
      description: 'Attempts with recorded marks',
      color: 'text-[#CDB5F7]',
    },
    {
      label: 'Overall Percentage',
      value:
        overallPercentage === null
          ? '—'
          : `${overallPercentage.toFixed(1)}%`,
      description: 'Weighted percentage from available scores',
      color: 'text-[#E5DF98]',
    },
    {
      label: 'Total Marks',
      value:
        scoredResults.length > 0
          ? `${formatMarks(totalObtained)} / ${formatMarks(totalMaximum)}`
          : '—',
      description: 'Obtained marks against maximum marks',
      color: 'text-[#EAEAE6]',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="My Results"
        description="Review your submitted quiz attempts, marks, and score percentages."
        breadcrumbs={[
          { label: 'Dashboard', to: '/student/dashboard' },
          { label: 'Results' },
        ]}
        actions={
          <button
            type="button"
            onClick={loadResults}
            disabled={status === 'loading'}
            className={[
              'inline-flex min-h-10 items-center justify-center',
              'rounded-xl border border-[#454650] px-4 py-2',
              'text-sm font-semibold text-[#CDB5F7]',
              'transition-colors hover:border-[#CDB5F7]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            ].join(' ')}
          >
            {status === 'loading' ? 'Refreshing...' : 'Refresh Results'}
          </button>
        }
      />

      {status === 'success' && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5"
            >
              <p className="text-sm text-[#A5A6B0]">
                {card.label}
              </p>

              <p
                className={`mt-3 break-words text-2xl font-semibold ${card.color}`}
              >
                {card.value}
              </p>

              <p className="mt-2 text-xs leading-5 text-[#858590]">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      )}

      <SectionCard
        eyebrow="QUIZ PERFORMANCE"
        title="Find Results"
        description="Search submitted quizzes and filter them by course."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(200px,260px)_auto]">
          <div className="min-w-0">
            <label
              htmlFor="result-search"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Search quizzes
            </label>

            <input
              id="result-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Quiz title, course, code..."
              className={[
                'min-h-11 w-full rounded-xl border border-[#454650]',
                'bg-[#191A21] px-4 py-2.5 text-sm text-[#EAEAE6]',
                'placeholder:text-[#777884]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            />
          </div>

          <div className="min-w-0">
            <label
              htmlFor="result-course"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Course
            </label>

            <select
              id="result-course"
              value={selectedCourse}
              onChange={(event) => setSelectedCourse(event.target.value)}
              className={[
                'min-h-11 w-full rounded-xl border border-[#454650]',
                'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            >
              <option value="all">All Courses</option>

              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className={[
                'min-h-11 w-full rounded-xl border px-4 py-2.5',
                'text-sm font-semibold transition-colors',
                hasActiveFilters
                  ? 'border-[#454650] text-[#D1D1D8] hover:border-[#CDB5F7]'
                  : 'cursor-not-allowed border-[#343640] text-[#666772]',
              ].join(' ')}
            >
              Reset
            </button>
          </div>
        </div>
      </SectionCard>

      <section className="mt-6" aria-labelledby="results-list-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="results-list-heading"
              className="text-lg font-semibold text-[#EAEAE6]"
            >
              Quiz Results
            </h2>

            <p className="mt-1 text-sm text-[#858590]">
              Marks from your submitted quiz attempts.
            </p>
          </div>

          {status === 'success' && (
            <span className="rounded-full border border-[#343640] bg-[#1D1F27] px-3 py-1.5 text-xs text-[#A5A6B0]">
              {filteredResults.length} displayed
            </span>
          )}
        </div>

        {status === 'loading' && (
          <div
            className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-8 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-[#A5A6B0]">
              Loading your quiz results...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div
            className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6"
            role="alert"
          >
            <h3 className="font-semibold text-[#EAEAE6]">
              Could not load results
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={loadResults}
              className={[
                'mt-4 inline-flex min-h-10 items-center justify-center',
                'rounded-xl border border-[#454650] px-4 py-2',
                'text-sm font-semibold text-[#CDB5F7]',
                'transition-colors hover:border-[#CDB5F7]',
              ].join(' ')}
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'success' && filteredResults.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredResults.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
          </div>
        )}

        {status === 'success' && filteredResults.length === 0 && (
          <EmptyState
            title={
              hasActiveFilters
                ? 'No matching results'
                : 'No quiz results yet'
            }
            description={
              hasActiveFilters
                ? 'No submitted quiz results match your search or selected course. Try adjusting the filters.'
                : 'Your submitted quiz scores will appear here when results are available.'
            }
            icon={
              <span aria-hidden="true" className="text-2xl">
                ↗
              </span>
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className={[
                    'inline-flex min-h-10 items-center justify-center',
                    'rounded-xl border border-[#454650] px-4 py-2',
                    'text-sm font-semibold text-[#CDB5F7]',
                    'transition-colors hover:border-[#CDB5F7]',
                  ].join(' ')}
                >
                  Clear filters
                </button>
              ) : null
            }
          />
        )}
      </section>

      <div className="mt-6 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#CDB5F7]">
          Academic support
        </p>

        <h3 className="mt-2 text-base font-semibold text-[#EAEAE6]">
          Need help with your academic progress?
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A5A6B0]">
          Your mentor can help you review your progress and plan your
          academic follow-up.
        </p>

        <Link
          to="/student/attendance"
          className={[
            'mt-4 inline-flex min-h-10 items-center justify-center',
            'rounded-xl border border-[#454650] px-4 py-2',
            'text-sm font-semibold text-[#CDB5F7]',
            'transition-colors hover:border-[#CDB5F7]',
            'hover:bg-[#CDB5F7]/10',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7]',
          ].join(' ')}
        >
          Review Attendance
          <span className="ml-2" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}