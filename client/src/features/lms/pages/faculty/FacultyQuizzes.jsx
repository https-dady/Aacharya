import { useMemo, useState } from 'react';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const QUIZ_STATUSES = [
  { value: 'all', label: 'All Quizzes' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const INITIAL_QUIZZES = [];

function normalizeStatus(status) {
  return String(status ?? '').trim().toLowerCase();
}

function getStatusStyles(status) {
  switch (normalizeStatus(status)) {
    case 'published':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'completed':
      return 'border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#D8CBFF]';

    case 'draft':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    case 'cancelled':
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#C8C8D0]';
  }
}

function formatDate(value) {
  if (!value) {
    return 'Not scheduled';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

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

export default function FacultyQuizzes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Actual quiz records will be connected after confirming the
  // backend endpoint and its response contract.
  const quizzes = INITIAL_QUIZZES;

  const filteredQuizzes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const matchesSearch =
        !query ||
        [
          quiz.title,
          quiz.name,
          quiz.courseName,
          quiz.course,
          quiz.courseCode,
          quiz.sectionName,
          quiz.section,
          quiz.batchName,
          quiz.batch,
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        );

      const matchesStatus =
        selectedStatus === 'all' ||
        normalizeStatus(quiz.status) === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [quizzes, searchTerm, selectedStatus]);

  const totalQuizzes = quizzes.length;

  const draftCount = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === 'draft',
  ).length;

  const publishedCount = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === 'published',
  ).length;

  const completedCount = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === 'completed',
  ).length;

  function clearFilters() {
    setSearchTerm('');
    setSelectedStatus('all');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Quizzes"
        description="Manage course assessments, review quiz schedules, and monitor the status of your quizzes."
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
          description="Quizzes available to students"
        />

        <SummaryCard
          label="Completed"
          value={completedCount}
          description="Assessments marked completed"
        />
      </div>

      <SectionCard
        eyebrow="ASSESSMENT MANAGEMENT"
        title="Quiz Catalogue"
        description="Search and filter quiz records by title, course, section, or status."
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

          {filteredQuizzes.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim() || selectedStatus !== 'all'
                  ? 'No matching quizzes'
                  : 'No quiz records available'
              }
              description={
                searchTerm.trim() || selectedStatus !== 'all'
                  ? 'Try a different search term or select another status.'
                  : 'Your quiz records will appear here once the actual assessment data is connected.'
              }
              action={
                searchTerm.trim() || selectedStatus !== 'all' ? (
                  <ActionButton
                    variant="secondary"
                    onClick={clearFilters}
                  >
                    Reset Filters
                  </ActionButton>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <caption className="sr-only">
                  Faculty quiz catalogue
                </caption>

                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Quiz
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Course
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Section / Batch
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Schedule
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredQuizzes.map((quiz, index) => {
                    const status = normalizeStatus(quiz.status);

                    return (
                      <tr
                        key={quiz.id ?? quiz._id ?? index}
                        className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#EAEAE6]">
                            {quiz.title ||
                              quiz.name ||
                              'Untitled quiz'}
                          </p>

                          <p className="mt-1 text-xs text-[#9697A2]">
                            {quiz.courseCode ||
                              'Course code unavailable'}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {quiz.courseName || quiz.course || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {quiz.sectionName ||
                            quiz.section ||
                            quiz.batchName ||
                            quiz.batch ||
                            '—'}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                          {formatDate(
                            quiz.scheduledAt || quiz.startDate,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={[
                              'inline-flex rounded-full border px-2.5 py-1',
                              'text-xs font-medium',
                              getStatusStyles(status),
                            ].join(' ')}
                          >
                            {status
                              ? status.charAt(0).toUpperCase() +
                                status.slice(1)
                              : 'Unspecified'}
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
        description="The next stages of the Faculty quiz workflow will build on this overview."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm font-semibold text-[#EAEAE6]">
              Quiz Creation
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Configure quiz details, course allocation, duration,
              scheduling, and marks.
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm font-semibold text-[#EAEAE6]">
              Question Configuration
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Prepare questions, answer options, scoring rules,
              and assessment settings.
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-sm font-semibold text-[#EAEAE6]">
              Quiz Results
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Review student attempts, scores, and assessment summaries.
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#E5DF98]">
          Backend integration pending
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          Quiz records and summary counts are not connected to the
          backend yet. This page does not create, publish, edit,
          or delete quizzes.
        </p>
      </div>
    </div>
  );
}