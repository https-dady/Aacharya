import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import studentQuizService from '../../services/studentQuizService.js';

const QUIZ_FILTERS = [
  { value: 'all', label: 'All Quizzes' },
  { value: 'available', label: 'Available Now' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'closed', label: 'Closed' },
];

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();

  if (
    [
      'upcoming',
      'available',
      'in_progress',
      'submitted',
      'closed',
    ].includes(value)
  ) {
    return value;
  }

  return 'unknown';
}

function getEffectiveStatus(quiz) {
  const status = normalizeStatus(quiz.status);
  const now = Date.now();

  const startAt = quiz.startAt
    ? new Date(quiz.startAt).getTime()
    : null;

  const endAt = quiz.endAt
    ? new Date(quiz.endAt).getTime()
    : null;

  if (
    startAt !== null &&
    !Number.isNaN(startAt) &&
    now < startAt &&
    ['available', 'upcoming'].includes(status)
  ) {
    return 'upcoming';
  }

  if (
    endAt !== null &&
    !Number.isNaN(endAt) &&
    now > endAt &&
    ['available', 'upcoming'].includes(status)
  ) {
    return 'closed';
  }

  return status;
}

function formatDateTime(value) {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(minutes) {
  if (
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    return 'Not specified';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function StatusBadge({ status }) {
  const styles = {
    upcoming:
      'border-violet-400/20 bg-violet-400/10 text-violet-300',
    available:
      'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    in_progress:
      'border-sky-400/20 bg-sky-400/10 text-sky-300',
    submitted:
      'border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]',
    closed:
      'border-[#454650] bg-[#252630] text-[#A5A6B0]',
    unknown:
      'border-[#454650] bg-[#252630] text-[#A5A6B0]',
  };

  const labels = {
    upcoming: 'Upcoming',
    available: 'Available',
    in_progress: 'In Progress',
    submitted: 'Submitted',
    closed: 'Closed',
    unknown: 'Status unavailable',
  };

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1',
        'text-xs font-medium',
        styles[status] || styles.unknown,
      ].join(' ')}
    >
      {labels[status] || labels.unknown}
    </span>
  );
}

function QuizCard({ quiz }) {
  const status = getEffectiveStatus(quiz);

  const canOpenQuiz = ['available', 'in_progress'].includes(status);

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-[#343640] bg-[#191A21] transition-colors hover:border-[#CDB5F7]/35">
      <div className="border-b border-[#343640] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1.5 text-xs font-semibold text-[#CDB5F7]">
            {quiz.courseCode || 'Course'}
          </span>

          <StatusBadge status={status} />
        </div>

        <h3 className="mt-5 break-words text-lg font-semibold text-[#EAEAE6]">
          {quiz.title}
        </h3>

        {quiz.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#A5A6B0]">
            {quiz.description}
          </p>
        )}

        <p className="mt-3 text-xs text-[#858590]">
          {quiz.courseName || 'Course information unavailable'}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <dl className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <dt className="text-xs text-[#858590]">Duration</dt>
            <dd className="mt-1 break-words text-sm text-[#D1D1D8]">
              {formatDuration(quiz.durationMinutes)}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-xs text-[#858590]">Total Marks</dt>
            <dd className="mt-1 text-sm text-[#D1D1D8]">
              {typeof quiz.totalMarks === 'number'
                ? quiz.totalMarks
                : '—'}
            </dd>
          </div>

          <div className="col-span-2 min-w-0">
            <dt className="text-xs text-[#858590]">Starts</dt>
            <dd className="mt-1 break-words text-sm text-[#D1D1D8]">
              {formatDateTime(quiz.startAt)}
            </dd>
          </div>

          <div className="col-span-2 min-w-0">
            <dt className="text-xs text-[#858590]">Ends</dt>
            <dd className="mt-1 break-words text-sm text-[#D1D1D8]">
              {formatDateTime(quiz.endAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto border-t border-[#343640] pt-4">
          {quiz.id && (
            <Link
              to={`/student/quizzes/${encodeURIComponent(quiz.id)}`}
              className={[
                'inline-flex min-h-10 w-full items-center justify-center',
                'rounded-xl border px-4 py-2 text-sm font-semibold',
                'transition-colors focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-[#CDB5F7]',
                canOpenQuiz
                  ? 'border-[#CDB5F7]/40 bg-[#CDB5F7]/10 text-[#CDB5F7] hover:bg-[#CDB5F7]/15'
                  : 'border-[#454650] text-[#A5A6B0] hover:border-[#666772]',
              ].join(' ')}
            >
              {canOpenQuiz ? 'Open Quiz' : 'View Details'}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-8 text-center"
    >
      <div
        className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#454650] border-t-[#CDB5F7]"
        aria-hidden="true"
      />

      <p className="mt-4 text-sm text-[#D1D1D8]">
        Loading your quizzes...
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6"
    >
      <h3 className="font-semibold text-rose-300">
        Unable to load quizzes
      </h3>

      <p className="mt-2 break-words text-sm leading-6 text-[#A5A6B0]">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className={[
          'mt-4 inline-flex min-h-10 items-center justify-center',
          'rounded-xl border border-[#CDB5F7]/40 px-4 py-2',
          'text-sm font-semibold text-[#CDB5F7]',
          'transition-colors hover:bg-[#CDB5F7]/10',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[#CDB5F7]',
        ].join(' ')}
      >
        Try again
      </button>
    </div>
  );
}

export default function StudentQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuizzes = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await studentQuizService.getMyQuizzes();
      setQuizzes(data);
    } catch (requestError) {
      setError(
        requestError?.message ||
          'Something went wrong while loading your quizzes.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const filteredQuizzes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return quizzes
      .filter((quiz) => {
        const matchesSearch =
          !query ||
          [
            quiz.title,
            quiz.description,
            quiz.courseName,
            quiz.courseCode,
          ].some((value) =>
            String(value || '').toLowerCase().includes(query),
          );

        const matchesStatus =
          selectedStatus === 'all' ||
          getEffectiveStatus(quiz) === selectedStatus;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = a.startAt
          ? new Date(a.startAt).getTime()
          : Infinity;

        const dateB = b.startAt
          ? new Date(b.startAt).getTime()
          : Infinity;

        return dateA - dateB;
      });
  }, [quizzes, searchQuery, selectedStatus]);

  const summary = useMemo(() => {
    const result = {
      available: 0,
      upcoming: 0,
      closed: 0,
    };

    quizzes.forEach((quiz) => {
      const status = getEffectiveStatus(quiz);

      if (Object.hasOwn(result, status)) {
        result[status] += 1;
      }
    });

    return result;
  }, [quizzes]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedStatus !== 'all';

  function resetFilters() {
    setSearchQuery('');
    setSelectedStatus('all');
  }

  const summaryCards = [
    {
      label: 'Available Now',
      value: summary.available,
      description: 'Quizzes currently available',
      color: 'text-emerald-300',
    },
    {
      label: 'Upcoming',
      value: summary.upcoming,
      description: 'Scheduled for later',
      color: 'text-violet-300',
    },
    {
      label: 'Closed',
      value: summary.closed,
      description: 'Quizzes no longer available',
      color: 'text-[#A5A6B0]',
    },
    {
      label: 'Total Quizzes',
      value: quizzes.length,
      description: 'Published quizzes for your account',
      color: 'text-[#CDB5F7]',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="My Quizzes"
        description="Explore assessments, review quiz availability, and keep track of your attempts."
        breadcrumbs={[
          { label: 'Dashboard', to: '/student/dashboard' },
          { label: 'Quizzes' },
        ]}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5"
          >
            <p className="text-sm text-[#A5A6B0]">
              {card.label}
            </p>

            <p className={`mt-3 text-3xl font-semibold ${card.color}`}>
              {isLoading ? '—' : card.value}
            </p>

            <p className="mt-2 text-xs text-[#858590]">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      <SectionCard
        eyebrow="ASSESSMENTS"
        title="Find Quizzes"
        description="Search assessments by name or course and filter by availability."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_240px_auto]">
          <div className="min-w-0">
            <label
              htmlFor="quiz-search"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Search quizzes
            </label>

            <input
              id="quiz-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title, course, description..."
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
              htmlFor="quiz-status"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Quiz status
            </label>

            <select
              id="quiz-status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className={[
                'min-h-11 w-full rounded-xl border border-[#454650]',
                'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            >
              {QUIZ_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
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
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[#CDB5F7]',
                hasActiveFilters
                  ? 'border-[#454650] text-[#D1D1D8] hover:border-[#CDB5F7]'
                  : 'cursor-not-allowed border-[#343640] text-[#666772]',
              ].join(' ')}
            >
              Reset filters
            </button>
          </div>
        </div>
      </SectionCard>

      <section className="mt-6" aria-labelledby="quiz-list-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="quiz-list-heading"
              className="text-lg font-semibold text-[#EAEAE6]"
            >
              All Quizzes
            </h2>

            <p className="mt-1 text-sm text-[#858590]">
              Assessments associated with your enrolled courses.
            </p>
          </div>

          <span className="rounded-full border border-[#343640] bg-[#1D1F27] px-3 py-1.5 text-xs text-[#A5A6B0]">
            {isLoading ? 'Loading...' : `${filteredQuizzes.length} displayed`}
          </span>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={loadQuizzes} />
        ) : filteredQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredQuizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              hasActiveFilters
                ? 'No matching quizzes'
                : 'No quizzes available'
            }
            description={
              hasActiveFilters
                ? 'No quizzes match your current search or status filter. Try adjusting your selections.'
                : 'Published quizzes assigned to your department, batch, and section will appear here.'
            }
            icon={
              <span aria-hidden="true" className="text-2xl">
                ✎
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
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[#CDB5F7]',
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
          Before you begin
        </p>

        <h3 className="mt-2 text-base font-semibold text-[#EAEAE6]">
          Quiz instructions
        </h3>

        <ul className="mt-4 space-y-3 text-sm leading-6 text-[#A5A6B0]">
          <li className="flex items-start gap-3">
            <span className="text-[#CDB5F7]" aria-hidden="true">•</span>
            <span>Check the quiz availability window before attempting an assessment.</span>
          </li>

          <li className="flex items-start gap-3">
            <span className="text-[#CDB5F7]" aria-hidden="true">•</span>
            <span>Review the duration and total marks shown in the quiz details.</span>
          </li>

          <li className="flex items-start gap-3">
            <span className="text-[#CDB5F7]" aria-hidden="true">•</span>
            <span>Follow the instructions published by your faculty for each assessment.</span>
          </li>

          <li className="flex items-start gap-3">
            <span className="text-[#CDB5F7]" aria-hidden="true">•</span>
            <span>Submission, timer, and attempt restrictions must be enforced by the quiz backend.</span>
          </li>
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
        <div>
          <h3 className="text-sm font-semibold text-[#EAEAE6]">
            Review your academic results
          </h3>

          <p className="mt-1 text-sm text-[#A5A6B0]">
            Check your published results when they become available.
          </p>
        </div>

        <Link
          to="/student/results"
          className={[
            'inline-flex min-h-10 items-center justify-center',
            'rounded-xl border border-[#454650] px-4 py-2',
            'text-sm font-semibold text-[#CDB5F7]',
            'transition-colors hover:border-[#CDB5F7]',
            'hover:bg-[#CDB5F7]/10',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7]',
          ].join(' ')}
        >
          View Results
          <span className="ml-2" aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}