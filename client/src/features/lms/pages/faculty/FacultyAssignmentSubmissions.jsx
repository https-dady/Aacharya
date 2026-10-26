import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const SUBMISSION_FILTERS = [
  { value: 'all', label: 'All Submissions' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'late', label: 'Late' },
  { value: 'pending', label: 'Pending' },
  { value: 'graded', label: 'Graded' },
];

function getSubmissionStatus(submission) {
  return String(submission.status ?? '').toLowerCase();
}

function getStatusStyles(status) {
  switch (status) {
    case 'submitted':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'late':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    case 'pending':
      return 'border-[#454650] bg-[#26272B] text-[#C8C8D0]';

    case 'graded':
      return 'border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#D8CBFF]';

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

export default function FacultyAssignmentSubmissions() {
  const location = useLocation();
  const assignment = location.state?.assignment;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notice, setNotice] = useState('');

  // Intentionally empty until a real submissions API is available.
  const submissions = [];

  const filteredSubmissions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesSearch =
        !query ||
        [
          submission.studentName,
          submission.studentId,
          submission.studentEmail,
          submission.fileName,
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        );

      const matchesStatus =
        selectedStatus === 'all' ||
        getSubmissionStatus(submission) === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchTerm, selectedStatus]);

  const totalSubmissions = submissions.length;

  const submittedCount = submissions.filter(
    (submission) => getSubmissionStatus(submission) === 'submitted',
  ).length;

  const pendingCount = submissions.filter(
    (submission) => getSubmissionStatus(submission) === 'pending',
  ).length;

  const gradedCount = submissions.filter(
    (submission) => getSubmissionStatus(submission) === 'graded',
  ).length;

  const assignmentTitle =
    assignment?.title ||
    assignment?.name ||
    'Assignment Submissions';

  const courseName =
    assignment?.courseName ||
    assignment?.course ||
    '';

  const assignmentId =
    assignment?.id ||
    assignment?._id ||
    '';

  function clearFilters() {
    setSearchTerm('');
    setSelectedStatus('all');
    setNotice('');
  }

  function handleExport() {
    setNotice(
      'Export is unavailable because no submission records have been loaded. Export will be enabled after backend integration.',
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title={assignmentTitle}
        description="Review student submissions, monitor submission status, and track grading progress."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Assignments',
            to: '/faculty/assignments',
          },
          {
            label: 'Submissions',
          },
        ]}
        actions={
          <Link
            to="/faculty/assignments"
            className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            <ActionButton variant="secondary">
              Back to Assignments
            </ActionButton>
          </Link>
        }
      />

      <div className="mb-6 rounded-2xl border border-[#343640] bg-[#191A21] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#CDB5F7]">
              Selected Assignment
            </p>

            <h2 className="mt-2 break-words text-lg font-semibold text-[#EAEAE6]">
              {assignmentTitle}
            </h2>

            {courseName && (
              <p className="mt-1 text-sm text-[#9697A2]">
                {courseName}
                {assignment?.courseCode
                  ? ` · ${assignment.courseCode}`
                  : ''}
              </p>
            )}

            {assignment?.dueDate && (
              <p className="mt-2 text-sm text-[#9697A2]">
                Deadline: {formatDate(assignment.dueDate)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {assignmentId && (
              <span className="inline-flex items-center rounded-lg border border-[#454650] bg-[#26272B] px-3 py-2 text-xs text-[#B8B8C2]">
                Assignment ID: {assignmentId}
              </span>
            )}

            <ActionButton
              variant="secondary"
              onClick={handleExport}
            >
              Export Records
            </ActionButton>
          </div>
        </div>

        {!assignment && (
          <div className="mt-5 border-t border-[#343640] pt-4">
            <p className="text-sm leading-6 text-[#9697A2]">
              No assignment record was passed to this page. Open this
              screen from a specific assignment once the assignment
              directory is connected to real records.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Submissions"
          value={totalSubmissions}
          description="Records available for this assignment"
        />

        <SummaryCard
          label="Submitted"
          value={submittedCount}
          description="Submissions received"
        />

        <SummaryCard
          label="Pending"
          value={pendingCount}
          description="Expected submissions not received"
        />

        <SummaryCard
          label="Graded"
          value={gradedCount}
          description="Submissions with completed grading"
        />
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="SUBMISSION MANAGEMENT"
          title="Student Submissions"
          description="Search student records and filter by submission status."
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <SearchInput
                name="facultySubmissionSearch"
                label="Search submissions"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setNotice('');
                }}
                placeholder="Search student, ID, email, or filename..."
              />

              <div>
                <label
                  htmlFor="faculty-submission-status"
                  className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                >
                  Submission Status
                </label>

                <select
                  id="faculty-submission-status"
                  value={selectedStatus}
                  onChange={(event) => {
                    setSelectedStatus(event.target.value);
                    setNotice('');
                  }}
                  className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                >
                  {SUBMISSION_FILTERS.map((filter) => (
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
              <p
                className="text-sm text-[#9697A2]"
                aria-live="polite"
              >
                Showing {filteredSubmissions.length} of{' '}
                {totalSubmissions} records
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

            {notice && (
              <div
                role="status"
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
              >
                {notice}
              </div>
            )}

            {filteredSubmissions.length === 0 ? (
              <EmptyState
                title={
                  searchTerm.trim() || selectedStatus !== 'all'
                    ? 'No matching submissions'
                    : 'Submission records unavailable'
                }
                description={
                  searchTerm.trim() || selectedStatus !== 'all'
                    ? 'Try another search term or choose a different status.'
                    : 'Student submissions will appear here after the assignment and submission APIs are integrated. No sample student records are displayed.'
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
                <table className="w-full min-w-[900px] text-left text-sm">
                  <caption className="sr-only">
                    Student submissions for {assignmentTitle}
                  </caption>

                  <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Student
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Submitted At
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Attachment
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Status
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Marks
                      </th>

                      <th scope="col" className="px-4 py-3 font-medium">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#343640]">
                    {filteredSubmissions.map((submission, index) => {
                      const status = getSubmissionStatus(submission);

                      return (
                        <tr
                          key={submission.id ?? submission._id ?? index}
                          className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium text-[#EAEAE6]">
                              {submission.studentName || 'Unknown student'}
                            </p>

                            <p className="mt-1 text-xs text-[#9697A2]">
                              {submission.studentId ||
                                submission.studentEmail ||
                                'Student ID unavailable'}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                            {formatDate(submission.submittedAt)}
                          </td>

                          <td className="px-4 py-4 text-[#D0D0D8]">
                            {submission.fileName || 'No attachment'}
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
                                : 'Unknown'}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-[#D0D0D8]">
                            {submission.marksAwarded ?? '—'}
                            {submission.totalMarks != null
                              ? ` / ${submission.totalMarks}`
                              : ''}
                          </td>

                          <td className="px-4 py-4">
                            <ActionButton
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setNotice(
                                  'Opening individual submissions requires a confirmed submission detail and grading API.',
                                );
                              }}
                            >
                              View Submission
                            </ActionButton>
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

      <div className="mt-6">
        <SectionCard
          eyebrow="GRADING WORKFLOW"
          title="Review and Feedback"
          description="Individual submission review and grading will be connected to the backend workflow."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
              <p className="text-sm font-semibold text-[#EAEAE6]">
                Review attachments
              </p>

              <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                Access student-uploaded files through authenticated,
                authorized download links.
              </p>
            </div>

            <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
              <p className="text-sm font-semibold text-[#EAEAE6]">
                Award marks
              </p>

              <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                Record marks only within the assignment's configured
                maximum score.
              </p>
            </div>

            <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
              <p className="text-sm font-semibold text-[#EAEAE6]">
                Provide feedback
              </p>

              <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                Give students clear feedback and persist grading changes
                through the authorized backend.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}