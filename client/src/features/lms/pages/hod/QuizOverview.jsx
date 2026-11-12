import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import quizManagementService from '../../services/quizManagementService.js';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CLOSED', label: 'Closed' },
];

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm text-[#A5A6B0]">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#9697A2]">
        {description}
      </p>
    </div>
  );
}

function getCourseName(quiz) {
  if (quiz.course && typeof quiz.course === 'object') {
    return quiz.course.title || quiz.course.name || '—';
  }

  return quiz.courseName || '—';
}

function getCourseCode(quiz) {
  if (quiz.course && typeof quiz.course === 'object') {
    return quiz.course.code || '';
  }

  return quiz.courseCode || '';
}

function getSemester(quiz) {
  if (quiz.course && typeof quiz.course === 'object') {
    return quiz.course.semester || quiz.semester || '—';
  }

  return quiz.semester || '—';
}

function getSchedule(quiz) {
  if (!quiz.startAt) {
    return 'Not scheduled';
  }

  const start = new Date(quiz.startAt);

  if (Number.isNaN(start.getTime())) {
    return 'Invalid schedule';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(start);
}

function getStatusLabel(status) {
  const normalized = String(status || 'DRAFT').toUpperCase();

  if (normalized === 'PUBLISHED') return 'Published';
  if (normalized === 'CLOSED') return 'Closed';

  return 'Draft';
}

function getStatusStyles(status) {
  switch (String(status || 'DRAFT').toUpperCase()) {
    case 'PUBLISHED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'CLOSED':
      return 'border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#D8CBFF]';

    default:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  }
}

function getScheduleCategory(quiz, now) {
  if (String(quiz.status).toUpperCase() === 'CLOSED') {
    return 'completed';
  }

  const endAt = quiz.endAt ? new Date(quiz.endAt) : null;

  if (endAt && !Number.isNaN(endAt.getTime()) && endAt < now) {
    return 'completed';
  }

  const startAt = quiz.startAt ? new Date(quiz.startAt) : null;

  if (
    startAt
    && !Number.isNaN(startAt.getTime())
    && startAt > now
  ) {
    return 'upcoming';
  }

  return 'other';
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to complete the quiz request. Please try again.'
  );
}

function getQuestionCount(quiz) {
  if (Number.isFinite(Number(quiz.questionCount))) {
    return Number(quiz.questionCount);
  }

  return Array.isArray(quiz.questions)
    ? quiz.questions.length
    : 0;
}

function getTotalMarks(quiz) {
  if (Number.isFinite(Number(quiz.totalMarks))) {
    return Number(quiz.totalMarks);
  }

  if (!Array.isArray(quiz.questions)) {
    return 0;
  }

  return quiz.questions.reduce(
    (total, question) => total + Number(question.marks || 0),
    0,
  );
}

function Pagination({ pagination, onPageChange, loading }) {
  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  const currentPage = pagination.page;
  const totalPages = pagination.pages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#343640] pt-5">
      <p className="text-sm text-[#9697A2]">
        Page <span className="font-semibold text-[#EAEAE6]">{currentPage}</span>
        {' '}of{' '}
        <span className="font-semibold text-[#EAEAE6]">{totalPages}</span>
        {' '}· {pagination.total} quizzes
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || !pagination.hasPreviousPage}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg border border-[#454650] px-4 py-2 text-sm text-[#D0D0D8] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          disabled={loading || !pagination.hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg border border-[#454650] px-4 py-2 text-sm text-[#D0D0D8] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function QuizOverview() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');

  const [page, setPage] = useState(1);

  const [quizzes, setQuizzes] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  const requestVersion = useRef(0);

  const loadQuizzes = useCallback(async () => {
    const currentRequest = ++requestVersion.current;

    setLoading(true);
    setError('');

    try {
      const result = await quizManagementService.listQuizzes({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        semester: semesterFilter.trim() || undefined,
      });

      if (currentRequest !== requestVersion.current) {
        return;
      }

      setQuizzes(result.items);
      setPagination(result.pagination);
    } catch (requestError) {
      if (currentRequest !== requestVersion.current) {
        return;
      }

      setQuizzes([]);
      setPagination(null);
      setError(getErrorMessage(requestError));
    } finally {
      if (currentRequest === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [page, search, statusFilter, semesterFilter]);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) {
        loadQuizzes();
      }
    });

    return () => {
      active = false;
      requestVersion.current += 1;
    };
  }, [loadQuizzes, refreshKey]);

  const summary = useMemo(() => {
    const now = new Date();

    return {
      total: pagination?.total ?? quizzes.length,

      upcoming: quizzes.filter(
        (quiz) => getScheduleCategory(quiz, now) === 'upcoming',
      ).length,

      published: quizzes.filter(
        (quiz) => String(quiz.status).toUpperCase() === 'PUBLISHED',
      ).length,

      completed: quizzes.filter(
        (quiz) => getScheduleCategory(quiz, now) === 'completed',
      ).length,
    };
  }, [quizzes, pagination]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleStatusChange(event) {
    setStatusFilter(event.target.value);
    setPage(1);
  }

  function handleSemesterChange(event) {
    setSemesterFilter(event.target.value);
    setPage(1);
  }

  function handleRefresh() {
    setRefreshKey((current) => current + 1);
  }

  async function handleDelete(quiz) {
    const quizId = quiz.id;

    if (!quizId) {
      setError('Quiz ID is unavailable. This record cannot be deleted.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${quiz.title || 'this quiz'}"? This action cannot be undone. Quizzes with student attempts cannot be deleted.`,
    );

    if (!confirmed) return;

    setError('');
    setNotice('');
    setDeletingId(quizId);

    try {
      await quizManagementService.deleteQuiz(quizId);

      setNotice('Quiz deleted successfully.');

      if (quizzes.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        handleRefresh();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Quiz Overview"
        description="Review quizzes across courses, monitor scheduling, and oversee academic assessments."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Quizzes' },
        ]}
        actions={(
          <Link to="/hod/courses">
            <ActionButton variant="secondary">
              View Courses
            </ActionButton>
          </Link>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Quizzes"
          value={loading ? '—' : summary.total}
          description="Total records matching current filters"
        />

        <SummaryCard
          label="Upcoming"
          value={loading ? '—' : summary.upcoming}
          description="Upcoming quizzes on this page"
        />

        <SummaryCard
          label="Published"
          value={loading ? '—' : summary.published}
          description="Published quizzes on this page"
        />

        <SummaryCard
          label="Completed"
          value={loading ? '—' : summary.completed}
          description="Completed quizzes on this page"
        />
      </div>

      <SectionCard
        eyebrow="ASSESSMENT MANAGEMENT"
        title="Quiz Catalogue"
        description="Search, filter and manage quizzes available to your department."
      >
        <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(240px,1fr)_180px_160px_auto] lg:items-end">
          <div>
            <SearchInput
              name="quizSearch"
              label="Search by quiz title"
              value={search}
              onChange={handleSearchChange}
              placeholder="Enter quiz title..."
            />
          </div>

          <div>
            <label
              htmlFor="quiz-status-filter"
              className="mb-2 block text-sm font-medium text-[#D0D0D8]"
            >
              Status
            </label>

            <select
              id="quiz-status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="quiz-semester-filter"
              className="mb-2 block text-sm font-medium text-[#D0D0D8]"
            >
              Semester
            </label>

            <input
              id="quiz-semester-filter"
              value={semesterFilter}
              onChange={handleSemesterChange}
              placeholder="e.g. 3"
              maxLength={30}
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none placeholder:text-[#777986] focus:border-[#CDB5F7]"
            />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] bg-[#26272B] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-5"
          >
            <p className="text-sm font-medium text-rose-300">
              Quiz operation could not be completed
            </p>

            <p className="mt-2 text-sm leading-6 text-rose-200/80">
              {error}
            </p>

            <button
              type="button"
              onClick={handleRefresh}
              className="mt-4 rounded-lg border border-rose-400/30 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10"
            >
              Reload Quizzes
            </button>
          </div>
        )}

        {loading ? (
          <div
            role="status"
            className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-12 text-center"
          >
            <p className="text-sm text-[#C7C7D0]">
              Loading quiz records...
            </p>
          </div>
        ) : quizzes.length === 0 ? (
          <EmptyState
            title={
              search || statusFilter || semesterFilter
                ? 'No matching quizzes'
                : 'No quiz records available'
            }
            description={
              search || statusFilter || semesterFilter
                ? 'Try changing or clearing the current filters.'
                : 'No quizzes are currently available for your department.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b border-[#343640] text-xs uppercase tracking-wider text-[#9697A2]">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Quiz
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Semester
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Schedule
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Assessment
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>

                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {quizzes.map((quiz) => (
                    <tr
                      key={quiz.id}
                      className="border-b border-[#343640] transition-colors last:border-0 hover:bg-[#252630]/50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#EAEAE6]">
                          {quiz.title || 'Untitled quiz'}
                        </p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {getCourseCode(quiz) || 'Course code unavailable'}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                        {getCourseName(quiz)}
                      </td>

                      <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                        {getSemester(quiz)}
                      </td>

                      <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                        <p>{getSchedule(quiz)}</p>

                        <p className="mt-1 text-xs text-[#858590]">
                          {quiz.durationMinutes || 0} minutes
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-[#C7C7D0]">
                        <p>{getTotalMarks(quiz)} marks</p>

                        <p className="mt-1 text-xs text-[#858590]">
                          {getQuestionCount(quiz)} questions
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyles(quiz.status)}`}
                        >
                          {getStatusLabel(quiz.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to="/hod/quizzes/details"
                            state={{ quiz }}
                            className="text-sm font-medium text-[#CDB5F7] transition hover:text-[#E0D0FF]"
                          >
                            View
                          </Link>

                          <Link
                            to="/hod/quizzes/edit"
                            state={{ quiz }}
                            className="text-sm font-medium text-[#D0D0D8] transition hover:text-white"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(quiz)}
                            disabled={Boolean(deletingId)}
                            className="text-sm font-medium text-rose-300 transition hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {deletingId === quiz.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              loading={loading}
            />
          </>
        )}
      </SectionCard>
    </div>
  );
}