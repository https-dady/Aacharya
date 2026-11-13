import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import quizManagementService from '../../services/quizManagementService.js';

const QUIZ_STATUSES = [
  { value: 'ALL', label: 'All Quizzes' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CLOSED', label: 'Closed' },
];

function normalizeStatus(status) {
  return String(status ?? '').trim().toUpperCase();
}

function getStatusStyles(status) {
  switch (normalizeStatus(status)) {
    case 'PUBLISHED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'CLOSED':
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    case 'DRAFT':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#C8C8D0]';
  }
}

function formatDate(value) {
  if (!value) return 'Not scheduled';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getReferenceName(reference) {
  if (!reference) return '';

  if (typeof reference === 'string') return reference;

  return (
    reference.title ||
    reference.name ||
    reference.code ||
    ''
  );
}

function getTargetNames(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'All allocated students';
  }

  const names = items
    .map(getReferenceName)
    .filter(Boolean);

  return names.length > 0
    ? names.join(', ')
    : 'All allocated students';
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

export default function FacultyQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const allQuizzes = [];
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const result = await quizManagementService.listQuizzes({
          page,
          limit: 100,
        });

        allQuizzes.push(...result.items);

        hasNextPage = Boolean(
          result.pagination?.hasNextPage,
        );

        page += 1;
      }

      setQuizzes(allQuizzes);
    } catch (loadError) {
      setQuizzes([]);

      setError(
        loadError?.response?.data?.error?.message ||
        loadError?.response?.data?.message ||
        loadError?.message ||
        'Unable to load quizzes. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const filteredQuizzes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const courseName = getReferenceName(quiz.course);

      const batchNames = getTargetNames(quiz.batches);
      const sectionNames = getTargetNames(quiz.sections);

      const searchableValues = [
        quiz.title,
        quiz.description,
        courseName,
        quiz.course?.code,
        quiz.course?.title,
        quiz.semester,
        batchNames,
        sectionNames,
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        );

      const matchesStatus =
        selectedStatus === 'ALL' ||
        normalizeStatus(quiz.status) === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [quizzes, searchTerm, selectedStatus]);

  const totalQuizzes = quizzes.length;

  const draftCount = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === 'DRAFT',
  ).length;

  const publishedCount = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === 'PUBLISHED',
  ).length;

  const closedCount = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === 'CLOSED',
  ).length;

  function clearFilters() {
    setSearchTerm('');
    setSelectedStatus('ALL');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Quizzes"
        description="Create and manage course assessments, review quiz schedules, and monitor their publication status."
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#EAEAE6]">
            Quiz Management
          </p>

          <p className="mt-1 text-xs text-[#9697A2]">
            Manage quizzes for your assigned courses.
          </p>
        </div>

        <Link
          to="/faculty/quizzes/new"
          className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          <ActionButton>
            Create Quiz
          </ActionButton>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Quizzes"
          value={totalQuizzes}
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
          description="Quizzes published for students"
        />

        <SummaryCard
          label="Closed"
          value={closedCount}
          description="Quizzes no longer accepting attempts"
        />
      </div>

      <SectionCard
        eyebrow="ASSESSMENT MANAGEMENT"
        title="Quiz Catalogue"
        description="Search and filter quiz records by title, course, batch, section, or status."
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <SearchInput
              name="facultyQuizSearch"
              label="Search quizzes"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search title, course, batch, or section..."
            />

            <div>
              <label
                htmlFor="faculty-quiz-status"
                className="mb-2 block text-sm font-medium text-[#D0D0D8]"
              >
                Quiz Status
              </label>

              <select
                id="faculty-quiz-status"
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(event.target.value)
                }
                className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              >
                {QUIZ_STATUSES.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p
              className="text-sm text-[#9697A2]"
              aria-live="polite"
            >
              Showing {filteredQuizzes.length} of {totalQuizzes} quizzes
            </p>

            <div className="flex flex-wrap gap-2">
              {(searchTerm || selectedStatus !== 'ALL') && (
                <ActionButton
                  variant="secondary"
                  onClick={clearFilters}
                >
                  Clear Filters
                </ActionButton>
              )}

              <ActionButton
                variant="secondary"
                onClick={loadQuizzes}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </ActionButton>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <p className="text-sm text-[#9697A2]">
                Loading quizzes...
              </p>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-5"
            >
              <p className="text-sm font-medium text-red-300">
                Unable to load quizzes
              </p>

              <p className="mt-2 text-sm leading-6 text-red-200/80">
                {error}
              </p>

              <div className="mt-4">
                <ActionButton
                  variant="secondary"
                  onClick={loadQuizzes}
                >
                  Retry
                </ActionButton>
              </div>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim() || selectedStatus !== 'ALL'
                  ? 'No matching quizzes'
                  : 'No quiz records available'
              }
              description={
                searchTerm.trim() || selectedStatus !== 'ALL'
                  ? 'Try a different search term or select another status.'
                  : 'Create your first quiz for an assigned course.'
              }
              action={
                searchTerm.trim() || selectedStatus !== 'ALL' ? (
                  <ActionButton
                    variant="secondary"
                    onClick={clearFilters}
                  >
                    Reset Filters
                  </ActionButton>
                ) : (
                  <Link
                    to="/faculty/quizzes/new"
                    className="inline-flex rounded-xl"
                  >
                    <ActionButton>
                      Create Quiz
                    </ActionButton>
                  </Link>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <caption className="sr-only">
                  Faculty quiz catalogue
                </caption>

                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Quiz
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Batch
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Sections
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Schedule
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Duration
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredQuizzes.map((quiz) => {
                    const status = normalizeStatus(quiz.status);

                    return (
                      <tr
                        key={quiz.id}
                        className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#EAEAE6]">
                            {quiz.title || 'Untitled Quiz'}
                          </p>

                          <p className="mt-1 text-xs text-[#9697A2]">
                            {quiz.questionCount ??
                              quiz.questions?.length ??
                              0}{' '}
                            questions · {quiz.totalMarks ?? 0} marks
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-[#D0D0D8]">
                            {quiz.course?.title || '—'}
                          </p>

                          <p className="mt-1 text-xs text-[#9697A2]">
                            {quiz.course?.code || 'No course code'}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {getTargetNames(quiz.batches)}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {getTargetNames(quiz.sections)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                          <p>{formatDate(quiz.startAt)}</p>

                          <p className="mt-1 text-xs text-[#9697A2]">
                            Until {formatDate(quiz.endAt)}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                          {quiz.durationMinutes} min
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={[
                              'inline-flex rounded-full border px-2.5 py-1',
                              'text-xs font-medium',
                              getStatusStyles(status),
                            ].join(' ')}
                          >
                            {status || 'Unspecified'}
                          </span>
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

      <SectionCard
        eyebrow="ASSESSMENT WORKFLOW"
        title="Quiz Management"
        description="Manage quiz configuration and questions through the Faculty assessment workflow."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm font-semibold text-[#EAEAE6]">
              Quiz Creation
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Configure quiz details, course allocation, duration,
              scheduling, and marks.
            </p>

            <Link
              to="/faculty/quizzes/new"
              className="mt-4 inline-flex text-sm font-semibold text-[#CDB5F7] hover:text-[#EAEAE6]"
            >
              Create a quiz →
            </Link>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm font-semibold text-[#EAEAE6]">
              Question Configuration
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Prepare multiple-choice questions, answer options,
              correct answers, and scoring rules.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}