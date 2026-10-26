import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const RESULT_FILTERS = [
  { value: 'all', label: 'All Results' },
  { value: 'pass', label: 'Passed' },
  { value: 'fail', label: 'Failed' },
  { value: 'pending', label: 'Pending Evaluation' },
];

function getResultStatus(result) {
  const status = String(result.status ?? '').toLowerCase();

  if (status === 'pending' || status === 'ungraded') {
    return 'pending';
  }

  if (status === 'pass' || status === 'passed') {
    return 'pass';
  }

  if (status === 'fail' || status === 'failed') {
    return 'fail';
  }

  const marks = Number(result.marksAwarded);
  const passingMarks = Number(result.passingMarks);

  if (
    result.marksAwarded === undefined ||
    result.marksAwarded === null ||
    result.passingMarks === undefined ||
    result.passingMarks === null ||
    !Number.isFinite(marks) ||
    !Number.isFinite(passingMarks)
  ) {
    return 'pending';
  }

  return marks >= passingMarks ? 'pass' : 'fail';
}

function getStatusStyles(status) {
  switch (status) {
    case 'pass':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'fail':
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    case 'pending':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#C8C8D0]';
  }
}

function formatDate(value) {
  if (!value) {
    return '—';
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

      <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#777986]">
        {description}
      </p>
    </section>
  );
}

export default function FacultyQuizResults() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedQuiz, setSelectedQuiz] = useState('all');
  const [notice, setNotice] = useState('');

  // Real result records will be loaded after the backend contract
  // is confirmed. No student scores or quiz attempts are fabricated.
  const results = [];

  const quizOptions = useMemo(() => {
    const uniqueQuizzes = new Map();

    results.forEach((result) => {
      const id = String(result.quizId ?? result.quiz?._id ?? '');

      if (id) {
        uniqueQuizzes.set(id, {
          id,
          title:
            result.quizTitle ||
            result.quiz?.title ||
            'Untitled quiz',
        });
      }
    });

    return Array.from(uniqueQuizzes.values());
  }, [results]);

  const filteredResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return results.filter((result) => {
      const studentName =
        result.studentName ||
        result.student?.name ||
        '';

      const studentId =
        result.studentId ||
        result.student?.studentId ||
        '';

      const quizId = String(
        result.quizId ?? result.quiz?._id ?? '',
      );

      const matchesSearch =
        !query ||
        [
          studentName,
          studentId,
          result.studentEmail,
          result.quizTitle,
          result.quiz?.title,
          result.courseName,
          result.courseCode,
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        );

      const matchesStatus =
        selectedStatus === 'all' ||
        getResultStatus(result) === selectedStatus;

      const matchesQuiz =
        selectedQuiz === 'all' ||
        quizId === selectedQuiz;

      return matchesSearch && matchesStatus && matchesQuiz;
    });
  }, [results, searchTerm, selectedStatus, selectedQuiz]);

  const totalResults = results.length;

  const passedCount = results.filter(
    (result) => getResultStatus(result) === 'pass',
  ).length;

  const failedCount = results.filter(
    (result) => getResultStatus(result) === 'fail',
  ).length;

  const pendingCount = results.filter(
    (result) => getResultStatus(result) === 'pending',
  ).length;

  const gradedResults = results.filter((result) => {
    const status = getResultStatus(result);

    return status === 'pass' || status === 'fail';
  });

  const averagePercentage =
    gradedResults.length > 0
      ? (
          gradedResults.reduce((total, result) => {
            const marks = Number(result.marksAwarded);
            const maximumMarks = Number(result.totalMarks);

            if (
              !Number.isFinite(marks) ||
              !Number.isFinite(maximumMarks) ||
              maximumMarks <= 0
            ) {
              return total;
            }

            return total + (marks / maximumMarks) * 100;
          }, 0) / gradedResults.length
        ).toFixed(1)
      : null;

  function clearFilters() {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedQuiz('all');
    setNotice('');
  }

  function handleExport() {
    setNotice(
      'Export is unavailable because no real quiz result records have been loaded.',
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Quiz Results"
        description="Review student assessment scores, monitor pass rates, and track pending evaluations."
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
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Results"
          value={totalResults}
          description="Student assessment records"
        />

        <SummaryCard
          label="Passed"
          value={passedCount}
          description="Students meeting the passing criteria"
        />

        <SummaryCard
          label="Failed"
          value={failedCount}
          description="Students below the passing criteria"
        />

        <SummaryCard
          label="Average Score"
          value={
            averagePercentage === null
              ? '—'
              : `${averagePercentage}%`
          }
          description={`${pendingCount} evaluations pending`}
        />
      </div>

      <SectionCard
        eyebrow="ASSESSMENT REPORTING"
        title="Student Results"
        description="Search student records, select a quiz, and filter results by outcome."
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <SearchInput
                name="facultyQuizResultSearch"
                label="Search results"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setNotice('');
                }}
                placeholder="Search student, ID, quiz, or course..."
              />
            </div>

            <div>
              <label
                htmlFor="faculty-result-status"
                className="mb-2 block text-sm font-medium text-[#D0D0D8]"
              >
                Result Status
              </label>

              <select
                id="faculty-result-status"
                value={selectedStatus}
                onChange={(event) => {
                  setSelectedStatus(event.target.value);
                  setNotice('');
                }}
                className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              >
                {RESULT_FILTERS.map((filter) => (
                  <option
                    key={filter.value}
                    value={filter.value}
                  >
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="faculty-result-quiz"
              className="mb-2 block text-sm font-medium text-[#D0D0D8]"
            >
              Quiz
            </label>

            <select
              id="faculty-result-quiz"
              value={selectedQuiz}
              onChange={(event) => {
                setSelectedQuiz(event.target.value);
                setNotice('');
              }}
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 md:max-w-md"
            >
              <option value="all">All quizzes</option>

              {quizOptions.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p
              className="text-sm text-[#9697A2]"
              aria-live="polite"
            >
              Showing {filteredResults.length} of {totalResults} results
            </p>

            <div className="flex flex-wrap gap-2">
              {(searchTerm ||
                selectedStatus !== 'all' ||
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
                onClick={handleExport}
              >
                Export Results
              </ActionButton>
            </div>
          </div>

          {notice && (
            <div
              role="status"
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
            >
              {notice}
            </div>
          )}

          {filteredResults.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim() ||
                selectedStatus !== 'all' ||
                selectedQuiz !== 'all'
                  ? 'No matching results'
                  : 'Quiz results unavailable'
              }
              description={
                searchTerm.trim() ||
                selectedStatus !== 'all' ||
                selectedQuiz !== 'all'
                  ? 'Try another search term or adjust the selected filters.'
                  : 'Student scores and assessment summaries will appear here once real quiz result data is connected.'
              }
              action={
                searchTerm.trim() ||
                selectedStatus !== 'all' ||
                selectedQuiz !== 'all' ? (
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
              <table className="w-full min-w-[900px] text-left text-sm">
                <caption className="sr-only">
                  Faculty quiz results
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
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredResults.map((result, index) => {
                    const status = getResultStatus(result);

                    const marks = Number(result.marksAwarded);
                    const totalMarks = Number(result.totalMarks);

                    const percentage =
                      Number.isFinite(marks) &&
                      Number.isFinite(totalMarks) &&
                      totalMarks > 0
                        ? `${((marks / totalMarks) * 100).toFixed(1)}%`
                        : '—';

                    return (
                      <tr
                        key={result.id ?? result._id ?? index}
                        className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#EAEAE6]">
                            {result.studentName ||
                              result.student?.name ||
                              'Unknown student'}
                          </p>

                          <p className="mt-1 text-xs text-[#9697A2]">
                            {result.studentId ||
                              result.student?.studentId ||
                              result.studentEmail ||
                              'Student ID unavailable'}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {result.quizTitle ||
                            result.quiz?.title ||
                            '—'}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                          {formatDate(result.submittedAt)}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {result.marksAwarded ?? '—'}
                          {result.totalMarks != null
                            ? ` / ${result.totalMarks}`
                            : ''}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {percentage}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={[
                              'inline-flex rounded-full border px-2.5 py-1',
                              'text-xs font-medium',
                              getStatusStyles(status),
                            ].join(' ')}
                          >
                            {status === 'pass'
                              ? 'Passed'
                              : status === 'fail'
                                ? 'Failed'
                                : 'Pending'}
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
        eyebrow="RESULT MANAGEMENT"
        title="Assessment Review"
        description="The following workflows will be connected when their backend contracts are available."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <h3 className="text-sm font-semibold text-[#EAEAE6]">
              Score Review
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Review recorded marks and compare them against the quiz's
              configured total and passing marks.
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <h3 className="text-sm font-semibold text-[#EAEAE6]">
              Evaluation
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Identify pending evaluations and support authorized
              grading workflows.
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <h3 className="text-sm font-semibold text-[#EAEAE6]">
              Result Summary
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Calculate averages and pass rates from actual persisted
              student results.
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#E5DF98]">
          Backend integration pending
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          Result records, evaluation, and export are not connected to
          the backend. The page intentionally avoids fabricated student
          scores and assessment data.
        </p>
      </div>

      <div className="flex justify-end">
        <Link
          to="/faculty/quizzes"
          className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          <ActionButton variant="secondary">
            Back to Quizzes
          </ActionButton>
        </Link>
      </div>
    </div>
  );
}