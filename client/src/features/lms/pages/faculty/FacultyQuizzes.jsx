import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

import quizManagementService from '../../services/quizManagementService.js';

const QUIZ_STATUSES = [
  { value: 'all', label: 'All Quizzes' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CLOSED', label: 'Closed' },
];

function formatDate(value) {
  if (!value) return 'Not scheduled';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
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

function getCourseName(quiz) {
  if (quiz.course && typeof quiz.course === 'object') {
    return quiz.course.title || quiz.course.name || 'Course';
  }

  return 'Course';
}

function getCourseCode(quiz) {
  if (quiz.course && typeof quiz.course === 'object') {
    return quiz.course.code || '';
  }

  return '';
}

function getActionError(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'The requested quiz operation could not be completed.'
  );
}

export default function FacultyQuizzes() {
  const location = useLocation();

  const [quizzes, setQuizzes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionQuizId, setActionQuizId] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    location.state?.notice || '',
  );

  const loadQuizzes = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      const result = await quizManagementService.listQuizzes({
        page: 1,
        limit: 100,
      });

      setQuizzes(result.items || []);
    } catch (error) {
      setErrorMessage(getActionError(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const filteredQuizzes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const courseName = getCourseName(quiz);
      const courseCode = getCourseCode(quiz);

      const matchesSearch =
        !query ||
        [
          quiz.title,
          quiz.description,
          courseName,
          courseCode,
          quiz.status,
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        );

      const matchesStatus =
        selectedStatus === 'all' ||
        quiz.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [quizzes, searchTerm, selectedStatus]);

  const draftCount = quizzes.filter(
    (quiz) => quiz.status === 'DRAFT',
  ).length;

  const publishedCount = quizzes.filter(
    (quiz) => quiz.status === 'PUBLISHED',
  ).length;

  const closedCount = quizzes.filter(
    (quiz) => quiz.status === 'CLOSED',
  ).length;

  async function handleStatusChange(quiz, nextStatus) {
    const actionLabel =
      nextStatus === 'PUBLISHED' ? 'publish' : 'close';

    const confirmed = window.confirm(
      nextStatus === 'PUBLISHED'
        ? `Publish "${quiz.title}"? Students will be able to access it according to its schedule.`
        : `Close "${quiz.title}"? This will change its status to Closed.`,
    );

    if (!confirmed) return;

    setActionQuizId(quiz.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const updatedQuiz = await quizManagementService.updateQuiz(
        quiz.id,
        { status: nextStatus },
      );

      setQuizzes((current) =>
        current.map((item) =>
          item.id === quiz.id ? updatedQuiz : item,
        ),
      );

      setSuccessMessage(
        `Quiz "${quiz.title}" has been ${actionLabel}ed successfully.`,
      );
    } catch (error) {
      setErrorMessage(getActionError(error));
    } finally {
      setActionQuizId(null);
    }
  }

  async function handleDeleteQuiz(quiz) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${quiz.title}"?\n\nThis action cannot be undone. Quizzes with student attempts cannot be deleted.`,
    );

    if (!confirmed) return;

    setActionQuizId(quiz.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await quizManagementService.deleteQuiz(quiz.id);

      setQuizzes((current) =>
        current.filter((item) => item.id !== quiz.id),
      );

      setSuccessMessage(
        `Quiz "${quiz.title}" was deleted successfully.`,
      );
    } catch (error) {
      setErrorMessage(getActionError(error));
    } finally {
      setActionQuizId(null);
    }
  }

  function clearFilters() {
    setSearchTerm('');
    setSelectedStatus('all');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Quizzes"
        description="Create assessments, manage quiz schedules, publish quizzes, and close completed assessments."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Quizzes',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Quizzes"
          value={quizzes.length}
          description="Quizzes across assigned courses"
        />

        <SummaryCard
          label="Drafts"
          value={draftCount}
          description="Quizzes awaiting publication"
        />

        <SummaryCard
          label="Published"
          value={publishedCount}
          description="Published assessments"
        />

        <SummaryCard
          label="Closed"
          value={closedCount}
          description="Assessments no longer open"
        />
      </div>

      <SectionCard
        eyebrow="ASSESSMENT MANAGEMENT"
        title="Quiz Catalogue"
        description="Manage quiz records and control their publication status."
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <SearchInput
                name="facultyQuizSearch"
                label="Search quizzes"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search quiz or course..."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton
                variant="secondary"
                size="sm"
                loading={refreshing}
                disabled={loading || refreshing}
                onClick={() => loadQuizzes(true)}
              >
                Refresh
              </ActionButton>

              <Link
                to="/faculty/quizzes/new"
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#CDB5F7] bg-[#CDB5F7] px-3 py-1.5 text-xs font-semibold text-[#14161C] transition-colors hover:bg-[#DCCBFA]"
              >
                Create Quiz
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUIZ_STATUSES.map((status) => {
              const selected = selectedStatus === status.value;

              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setSelectedStatus(status.value)}
                  className={[
                    'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                    selected
                      ? 'border-[#CDB5F7] bg-[#CDB5F7]/15 text-[#DCCBFA]'
                      : 'border-[#454650] bg-[#1D1F27] text-[#A7A7B0] hover:border-[#CDB5F7]/50 hover:text-[#EAEAE6]',
                  ].join(' ')}
                >
                  {status.label}
                </button>
              );
            })}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-[#D58B95]/40 bg-[#D58B95]/10 px-4 py-3 text-sm text-[#EAEAE6]"
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="rounded-xl border border-[#CDB5F7]/40 bg-[#CDB5F7]/10 px-4 py-3 text-sm text-[#EAEAE6]"
            >
              {successMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p className="text-sm text-[#9697A2]" aria-live="polite">
              Showing {filteredQuizzes.length} of {quizzes.length} quizzes
            </p>

            {(searchTerm || selectedStatus !== 'all') && (
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={clearFilters}
              >
                Clear Filters
              </ActionButton>
            )}
          </div>

          {loading ? (
            <div className="rounded-xl border border-[#343640] bg-[#191A21] p-8 text-center text-sm text-[#9697A2]">
              Loading quizzes...
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim() || selectedStatus !== 'all'
                  ? 'No matching quizzes'
                  : 'No quizzes created yet'
              }
              description={
                searchTerm.trim() || selectedStatus !== 'all'
                  ? 'Try another search term or status filter.'
                  : 'Create your first quiz to start managing assessments.'
              }
              action={
                searchTerm.trim() || selectedStatus !== 'all' ? (
                  <ActionButton
                    variant="secondary"
                    onClick={clearFilters}
                  >
                    Reset Filters
                  </ActionButton>
                ) : (
                  <Link
                    to="/faculty/quizzes/new"
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#CDB5F7] bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#14161C]"
                  >
                    Create Your First Quiz
                  </Link>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[950px] border-collapse text-left">
                <thead className="bg-[#202129]">
                  <tr className="text-xs uppercase tracking-wider text-[#9697A2]">
                    <th className="px-4 py-4 font-semibold">Quiz</th>
                    <th className="px-4 py-4 font-semibold">Course</th>
                    <th className="px-4 py-4 font-semibold">Schedule</th>
                    <th className="px-4 py-4 font-semibold">Marks</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredQuizzes.map((quiz) => {
                    const isProcessing = actionQuizId === quiz.id;

                    return (
                      <tr
                        key={quiz.id}
                        className="align-top transition-colors hover:bg-[#202129]/70"
                      >
                        <td className="px-4 py-4">
                          <p className="max-w-xs font-semibold text-[#EAEAE6]">
                            {quiz.title}
                          </p>

                          <p className="mt-1 line-clamp-2 max-w-xs text-xs leading-5 text-[#858590]">
                            {quiz.description || 'No description provided'}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm text-[#D0D0D8]">
                            {getCourseName(quiz)}
                          </p>

                          {getCourseCode(quiz) && (
                            <p className="mt-1 text-xs text-[#858590]">
                              {getCourseCode(quiz)}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-xs text-[#D0D0D8]">
                            Starts: {formatDate(quiz.startAt)}
                          </p>

                          <p className="mt-2 text-xs text-[#9697A2]">
                            Ends: {formatDate(quiz.endAt)}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-[#EAEAE6]">
                            {quiz.totalMarks}
                          </p>

                          <p className="mt-1 text-xs text-[#858590]">
                            {quiz.questions?.length || 0} questions
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={quiz.status} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              to={`/faculty/quizzes/questions?quizId=${encodeURIComponent(quiz.id)}`}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#454650] px-3 py-1.5 text-xs font-semibold text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50 hover:text-[#EAEAE6]"
                            >
                              Questions
                            </Link>

                            <Link
                              to={`/faculty/quizzes/new?quizId=${encodeURIComponent(quiz.id)}`}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#454650] px-3 py-1.5 text-xs font-semibold text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50 hover:text-[#EAEAE6]"
                            >
                              Edit
                            </Link>

                            {quiz.status === 'DRAFT' && (
                              <ActionButton
                                size="sm"
                                variant="primary"
                                loading={isProcessing}
                                disabled={Boolean(actionQuizId)}
                                onClick={() =>
                                  handleStatusChange(quiz, 'PUBLISHED')
                                }
                              >
                                Publish
                              </ActionButton>
                            )}

                            {quiz.status === 'PUBLISHED' && (
                              <ActionButton
                                size="sm"
                                variant="danger"
                                loading={isProcessing}
                                disabled={Boolean(actionQuizId)}
                                onClick={() =>
                                  handleStatusChange(quiz, 'CLOSED')
                                }
                              >
                                Close
                              </ActionButton>
                            )}

                            {quiz.status === 'CLOSED' && (
                              <span className="inline-flex min-h-9 items-center rounded-lg border border-[#454650] px-3 text-xs text-[#858590]">
                                Closed
                              </span>
                            )}

                            <ActionButton
                              size="sm"
                              variant="danger"
                              loading={isProcessing}
                              disabled={Boolean(actionQuizId)}
                              onClick={() => handleDeleteQuiz(quiz)}
                            >
                              Delete
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}