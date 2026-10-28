import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

import studentAssignmentService from '../../services/studentAssignmentService.js';

const ASSIGNMENT_FILTERS = [
  { value: 'all', label: 'All Assignments' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'graded', label: 'Graded' },
  { value: 'overdue', label: 'Overdue' },
];

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();

  if (['pending', 'submitted', 'graded', 'overdue'].includes(value)) {
    return value;
  }

  // The backend publishes assignments, but submission tracking is
  // not connected yet. Do not incorrectly label published as submitted.
  if (value === 'published') {
    return 'pending';
  }

  return 'unknown';
}

function getEffectiveStatus(assignment) {
  const status = normalizeStatus(assignment.status);

  if (
    status === 'pending'
    && assignment.dueDate
  ) {
    const dueDate = new Date(assignment.dueDate);

    if (
      !Number.isNaN(dueDate.getTime())
      && dueDate.getTime() < Date.now()
    ) {
      return 'overdue';
    }
  }

  return status;
}

function formatDueDate(value) {
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

function normalizeAssignment(assignment) {
  return {
    ...assignment,
    id: String(assignment.id || assignment._id || ''),
    title: assignment.title || 'Untitled assignment',
    description: assignment.description || '',
    courseName: assignment.courseName || assignment.course?.title || '',
    courseCode: assignment.courseCode || assignment.course?.code || '',
    status: normalizeStatus(assignment.status),
  };
}

function StatusBadge({ status }) {
  const styles = {
    pending:
      'border-amber-400/20 bg-amber-400/10 text-amber-300',
    submitted:
      'border-sky-400/20 bg-sky-400/10 text-sky-300',
    graded:
      'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    overdue:
      'border-rose-400/20 bg-rose-400/10 text-rose-300',
    unknown:
      'border-[#454650] bg-[#252630] text-[#A5A6B0]',
  };

  const labels = {
    pending: 'Pending',
    submitted: 'Submitted',
    graded: 'Graded',
    overdue: 'Overdue',
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

function AssignmentCard({ assignment }) {
  const status = getEffectiveStatus(assignment);

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-[#343640] bg-[#191A21] transition-colors hover:border-[#CDB5F7]/35">
      <div className="border-b border-[#343640] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1.5 text-xs font-semibold text-[#CDB5F7]">
            {assignment.courseCode || 'Course'}
          </span>

          <StatusBadge status={status} />
        </div>

        <h3 className="mt-5 break-words text-lg font-semibold text-[#EAEAE6]">
          {assignment.title}
        </h3>

        {assignment.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#A5A6B0]">
            {assignment.description}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div>
          <p className="text-xs text-[#858590]">Course</p>

          <p className="mt-1 break-words text-sm font-medium text-[#D1D1D8]">
            {assignment.courseName || 'Course information unavailable'}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-xs text-[#858590]">Due date</p>

          <p className="mt-1 text-sm text-[#D1D1D8]">
            {formatDueDate(assignment.dueDate)}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-xs text-[#858590]">Total marks</p>

          <p className="mt-1 text-sm text-[#D1D1D8]">
            {assignment.totalMarks ?? 'Not specified'}
          </p>
        </div>

        {Array.isArray(assignment.attachments)
          && assignment.attachments.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-[#858590]">
                Attachments
              </p>

              <ul className="space-y-2">
                {assignment.attachments.map((attachment, index) => (
                  <li key={`${attachment.name}-${index}`}>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-words text-sm text-[#CDB5F7] underline-offset-4 hover:underline"
                    >
                      {attachment.name || 'View attachment'}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

        <div className="mt-auto border-t border-[#343640] pt-4">
          <span
            className="inline-flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-xl border border-[#343640] px-4 py-2 text-sm font-semibold text-[#858590]"
            title="Assignment submission details are not connected yet."
          >
            Submission Details Not Available
          </span>
        </div>
      </div>
    </article>
  );
}

function AssignmentSummaryCard({ card }) {
  return (
    <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm text-[#A5A6B0]">
        {card.label}
      </p>

      <p className={`mt-3 text-3xl font-semibold ${card.color}`}>
        {card.value}
      </p>

      <p className="mt-2 text-xs text-[#858590]">
        {card.description}
      </p>
    </div>
  );
}

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await studentAssignmentService.getMyAssignments();

      setAssignments(result.map(normalizeAssignment));
    } catch (error) {
      setErrorMessage(
        error?.message
          || 'Unable to load your assignments. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const filteredAssignments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return assignments
      .filter((assignment) => {
        const matchesSearch =
          !query
          || [
            assignment.title,
            assignment.description,
            assignment.courseName,
            assignment.courseCode,
          ].some((value) =>
            String(value || '').toLowerCase().includes(query),
          );

        const matchesStatus =
          selectedStatus === 'all'
          || getEffectiveStatus(assignment) === selectedStatus;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = a.dueDate
          ? new Date(a.dueDate).getTime()
          : Infinity;

        const dateB = b.dueDate
          ? new Date(b.dueDate).getTime()
          : Infinity;

        return dateA - dateB;
      });
  }, [assignments, searchQuery, selectedStatus]);

  const summary = useMemo(() => {
    const result = {
      pending: 0,
      submitted: 0,
      graded: 0,
      overdue: 0,
    };

    assignments.forEach((assignment) => {
      const status = getEffectiveStatus(assignment);

      if (Object.hasOwn(result, status)) {
        result[status] += 1;
      }
    });

    return result;
  }, [assignments]);

  const hasActiveFilters =
    searchQuery.trim() !== ''
    || selectedStatus !== 'all';

  function resetFilters() {
    setSearchQuery('');
    setSelectedStatus('all');
  }

  const summaryCards = [
    {
      label: 'Pending',
      value: summary.pending,
      description: 'Awaiting submission',
      color: 'text-amber-300',
    },
    {
      label: 'Submitted',
      value: summary.submitted,
      description: 'Submitted for review',
      color: 'text-sky-300',
    },
    {
      label: 'Graded',
      value: summary.graded,
      description: 'Reviewed assignments',
      color: 'text-emerald-300',
    },
    {
      label: 'Overdue',
      value: summary.overdue,
      description: 'Past the due date',
      color: 'text-rose-300',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="My Assignments"
        description="Track coursework, review deadlines, and monitor assignment availability."
        breadcrumbs={[
          { label: 'Dashboard', to: '/student/dashboard' },
          { label: 'Assignments' },
        ]}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <AssignmentSummaryCard key={card.label} card={card} />
        ))}
      </div>

      <SectionCard
        eyebrow="COURSEWORK"
        title="Find Assignments"
        description="Search assignments and filter them by their current status."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_240px_auto]">
          <div className="min-w-0">
            <label
              htmlFor="assignment-search"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Search assignments
            </label>

            <input
              id="assignment-search"
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
              htmlFor="assignment-status"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Assignment status
            </label>

            <select
              id="assignment-status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className={[
                'min-h-11 w-full rounded-xl border border-[#454650]',
                'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            >
              {ASSIGNMENT_FILTERS.map((filter) => (
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

      <section className="mt-6" aria-labelledby="assignment-list-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="assignment-list-heading"
              className="text-lg font-semibold text-[#EAEAE6]"
            >
              Published Assignments
            </h2>

            <p className="mt-1 text-sm text-[#858590]">
              Assignments published for your academic batch or section.
            </p>
          </div>

          {!isLoading && !errorMessage && (
            <span className="rounded-full border border-[#343640] bg-[#1D1F27] px-3 py-1.5 text-xs text-[#A5A6B0]">
              {filteredAssignments.length} displayed
            </span>
          )}
        </div>

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-8 text-center text-sm text-[#A5A6B0]"
          >
            Loading your assignments...
          </div>
        ) : errorMessage ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6"
          >
            <h3 className="font-semibold text-rose-300">
              Unable to load assignments
            </h3>

            <p className="mt-2 break-words text-sm text-[#D1D1D8]">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void loadAssignments()}
              className={[
                'mt-4 inline-flex min-h-10 items-center justify-center',
                'rounded-xl border border-[#454650] px-4 py-2',
                'text-sm font-semibold text-[#CDB5F7]',
                'transition-colors hover:border-[#CDB5F7]',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[#CDB5F7]',
              ].join(' ')}
            >
              Try again
            </button>
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              hasActiveFilters
                ? 'No matching assignments'
                : 'No assignments available'
            }
            description={
              hasActiveFilters
                ? 'No assignments match your current search or status filter. Try adjusting the filters.'
                : 'Assignments published for your courses will appear here when they are assigned to your batch or section.'
            }
            icon={
              <span aria-hidden="true" className="text-2xl">
                ▣
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
        <div>
          <h3 className="text-sm font-semibold text-[#EAEAE6]">
            Preparing for an assessment?
          </h3>

          <p className="mt-1 text-sm text-[#A5A6B0]">
            Visit your quizzes page to view available assessments.
          </p>
        </div>

        <Link
          to="/student/quizzes"
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
          View Quizzes
          <span className="ml-2" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}