import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import facultySubmissionService from '../../services/facultySubmissionService.js';

const SUBMISSION_FILTERS = [
  { value: 'all', label: 'All Submissions' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'LATE', label: 'Late' },
  { value: 'GRADED', label: 'Graded' },
];

const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message
    ?? error?.response?.data?.error?.message
    ?? error?.message
    ?? fallback
  );
}

function getStatusLabel(status) {
  switch (status) {
    case 'SUBMITTED':
      return 'Submitted';

    case 'LATE':
      return 'Late';

    case 'GRADED':
      return 'Graded';

    default:
      return 'Unknown';
  }
}

function getStatusStyles(status) {
  switch (status) {
    case 'SUBMITTED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'LATE':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    case 'GRADED':
      return 'border-[#CDB5F7]/30 bg-[#CDB5F7]/10 text-[#D8CBFF]';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#C8C8D0]';
  }
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

function SubmissionEvaluation({
  assignmentId,
  submission,
  onClose,
  onEvaluated,
}) {
  const [marksObtained, setMarksObtained] = useState(
    submission.marksObtained ?? '',
  );

  const [feedback, setFeedback] = useState(
    submission.feedback ?? '',
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalMarks = Number(
    submission.assignment?.totalMarks ?? 0,
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const marks = Number(marksObtained);

    if (
      marksObtained === ''
      || !Number.isFinite(marks)
      || marks < 0
      || marks > totalMarks
    ) {
      setError(
        `Enter marks between 0 and ${totalMarks}.`,
      );
      return;
    }

    setSaving(true);

    try {
      const updatedSubmission =
        await facultySubmissionService.evaluateSubmission(
          assignmentId,
          submission.id,
          {
            marksObtained: marks,
            feedback,
          },
        );

      onEvaluated(updatedSubmission);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'The submission could not be evaluated.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-evaluation-title"
        className="my-auto w-full max-w-2xl rounded-2xl border border-[#454650] bg-[#191A21] p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#CDB5F7]">
              Submission Review
            </p>

            <h2
              id="submission-evaluation-title"
              className="mt-2 text-xl font-semibold text-[#EAEAE6]"
            >
              Evaluate Submission
            </h2>

            <p className="mt-1 text-sm text-[#9697A2]">
              {submission.student.fullName || 'Student'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close evaluation"
            className="rounded-lg border border-[#454650] px-3 py-2 text-sm text-[#D0D0D8] transition-colors hover:bg-[#26272B] disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-[#343640] bg-[#202129] p-4">
            <p className="text-xs uppercase tracking-wider text-[#9697A2]">
              Student
            </p>

            <p className="mt-2 font-medium text-[#EAEAE6]">
              {submission.student.fullName || 'Unknown student'}
            </p>

            <p className="mt-1 text-sm text-[#9697A2]">
              {submission.student.institutionalId
                || submission.student.email
                || 'Student identification unavailable'}
            </p>

            <p className="mt-3 text-xs text-[#9697A2]">
              Submitted: {formatDate(submission.submittedAt)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#D0D0D8]">
              Student Response
            </p>

            <div className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#343640] bg-[#202129] p-4 text-sm leading-6 text-[#D0D0D8]">
              {submission.responseText || 'No written response provided.'}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#D0D0D8]">
              Attachments
            </p>

            {submission.attachments.length > 0 ? (
              <div className="space-y-2">
                {submission.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#343640] bg-[#202129] p-3 text-sm text-[#D8CBFF] transition-colors hover:border-[#CDB5F7]/50"
                  >
                    <span className="min-w-0 truncate">
                      {attachment.name}
                    </span>

                    <span className="shrink-0 text-xs">
                      Open file ↗
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-[#343640] bg-[#202129] p-3 text-sm text-[#9697A2]">
                No attachments provided.
              </p>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 border-t border-[#343640] pt-5"
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="submission-marks"
                className="text-sm font-medium text-[#D0D0D8]"
              >
                Marks Obtained
              </label>

              <span className="text-xs text-[#9697A2]">
                Maximum: {totalMarks}
              </span>
            </div>

            <input
              id="submission-marks"
              type="number"
              min="0"
              max={totalMarks}
              step="any"
              required
              value={marksObtained}
              onChange={(event) => setMarksObtained(event.target.value)}
              disabled={saving}
              className="mt-2 min-h-11 w-full rounded-xl border border-[#454650] bg-[#202129] px-4 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="submission-feedback"
              className="text-sm font-medium text-[#D0D0D8]"
            >
              Faculty Feedback
            </label>

            <textarea
              id="submission-feedback"
              rows={4}
              maxLength={10000}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              disabled={saving}
              placeholder="Write constructive feedback for the student..."
              className="mt-2 w-full resize-y rounded-xl border border-[#454650] bg-[#202129] p-4 text-sm leading-6 text-[#EAEAE6] outline-none transition-colors placeholder:text-[#777986] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 disabled:opacity-60"
            />

            <p className="mt-1 text-right text-xs text-[#777986]">
              {feedback.length}/10000
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </ActionButton>

            <ActionButton
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Evaluation'}
            </ActionButton>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function FacultyAssignmentSubmissions() {
  const location = useLocation();

  const assignment = location.state?.assignment;

  const assignmentId = String(
    assignment?.id ?? assignment?._id ?? '',
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [submissions, setSubmissions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSubmissions = useCallback(async (page = 1) => {
    if (!assignmentId) {
      setLoading(false);
      setError(
        'Assignment information is missing. Open this page from a selected assignment.',
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const filters = {
        page,
        limit: PAGE_SIZE,
      };

      if (selectedStatus !== 'all') {
        filters.status = selectedStatus;
      }

      const result =
        await facultySubmissionService.listSubmissions(
          assignmentId,
          filters,
        );

      setSubmissions(result.items);
      setPagination(result.pagination);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Assignment submissions could not be loaded.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [assignmentId, selectedStatus]);

  useEffect(() => {
    loadSubmissions(1);
  }, [loadSubmissions]);

  const filteredSubmissions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return submissions;
    }

    return submissions.filter((submission) => (
      [
        submission.student.fullName,
        submission.student.institutionalId,
        submission.student.email,
        submission.responseText,
        ...submission.attachments.map((attachment) => attachment.name),
      ].some((value) => (
        String(value ?? '').toLowerCase().includes(query)
      ))
    ));
  }, [submissions, searchTerm]);

  const statistics = useMemo(() => ({
    total: pagination.total,

    submitted: submissions.filter(
      (submission) => submission.status === 'SUBMITTED',
    ).length,

    late: submissions.filter(
      (submission) => submission.status === 'LATE',
    ).length,

    graded: submissions.filter(
      (submission) => submission.status === 'GRADED',
    ).length,
  }), [submissions, pagination.total]);

  const assignmentTitle =
    assignment?.title
    || assignment?.name
    || 'Assignment Submissions';

  const courseName =
    assignment?.courseName
    || assignment?.course?.title
    || (typeof assignment?.course === 'string'
      ? assignment.course
      : '');

  function handleEvaluationComplete(updatedSubmission) {
    setSubmissions((current) => current.map((item) => (
      item.id === updatedSubmission.id
        ? updatedSubmission
        : item
    )));

    setSelectedSubmission(null);
    setNotice('Submission evaluation saved successfully.');
  }

  function clearFilters() {
    setSearchTerm('');
    setSelectedStatus('all');
  }

  const hasActiveFilters =
    Boolean(searchTerm.trim())
    || selectedStatus !== 'all';

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title={assignmentTitle}
        description="Review student submissions, monitor submission status, and evaluate student work."
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

          <div className="flex flex-wrap items-center gap-2">
            {assignmentId && (
              <span className="inline-flex items-center rounded-lg border border-[#454650] bg-[#26272B] px-3 py-2 text-xs text-[#B8B8C2]">
                ID: {assignmentId}
              </span>
            )}

            <ActionButton
              variant="secondary"
              onClick={() => loadSubmissions(pagination.page)}
              disabled={loading || !assignmentId}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </ActionButton>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          <span>{error}</span>

          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => loadSubmissions(1)}
          >
            Retry
          </ActionButton>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Submissions"
          value={statistics.total}
          description="Records received for this assignment"
        />

        <SummaryCard
          label="Submitted"
          value={statistics.submitted}
          description="On-time submissions on this page"
        />

        <SummaryCard
          label="Late"
          value={statistics.late}
          description="Late submissions on this page"
        />

        <SummaryCard
          label="Graded"
          value={statistics.graded}
          description="Evaluated submissions on this page"
        />
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="SUBMISSION MANAGEMENT"
          title="Student Submissions"
          description="Search student records, filter submissions, inspect responses, and record marks."
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <SearchInput
                name="facultySubmissionSearch"
                label="Search submissions"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search student, ID, email, or response..."
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
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                >
                  <option value="all">All Submissions</option>

                  {SUBMISSION_FILTERS
                    .filter((filter) => filter.value !== 'all')
                    .map((filter) => (
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
              <p className="text-sm text-[#9697A2]" aria-live="polite">
                Showing {filteredSubmissions.length} of{' '}
                {pagination.total} submissions
              </p>

              {hasActiveFilters && (
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
              <div className="rounded-xl border border-[#343640] bg-[#191A21] p-10 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#454650] border-t-[#CDB5F7]" />

                <p className="mt-4 text-sm text-[#9697A2]">
                  Loading student submissions...
                </p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <EmptyState
                title={
                  hasActiveFilters
                    ? 'No matching submissions'
                    : 'No submissions received'
                }
                description={
                  hasActiveFilters
                    ? 'Try another search term or choose a different status.'
                    : 'Student submissions will appear here when students submit their work.'
                }
                action={
                  hasActiveFilters ? (
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
              <>
                <div className="overflow-x-auto rounded-xl border border-[#343640]">
                  <table className="w-full min-w-[950px] text-left text-sm">
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
                          Attachments
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
                      {filteredSubmissions.map((submission) => (
                        <tr
                          key={submission.id}
                          className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium text-[#EAEAE6]">
                              {submission.student.fullName || 'Unknown student'}
                            </p>

                            <p className="mt-1 text-xs text-[#9697A2]">
                              {submission.student.institutionalId
                                || submission.student.email
                                || 'Student ID unavailable'}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                            {formatDate(submission.submittedAt)}
                          </td>

                          <td className="px-4 py-4 text-[#D0D0D8]">
                            {submission.attachments.length}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={[
                                'inline-flex rounded-full border px-2.5 py-1',
                                'text-xs font-medium',
                                getStatusStyles(submission.status),
                              ].join(' ')}
                            >
                              {getStatusLabel(submission.status)}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-[#D0D0D8]">
                            {submission.marksObtained ?? '—'}
                            {' / '}
                            {submission.assignment.totalMarks || '—'}
                          </td>

                          <td className="px-4 py-4">
                            <ActionButton
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              {submission.status === 'GRADED'
                                ? 'Review'
                                : 'Evaluate'}
                            </ActionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
                  <p className="text-sm text-[#9697A2]">
                    Page {pagination.page} of{' '}
                    {Math.max(pagination.totalPages, 1)}
                  </p>

                  <div className="flex gap-2">
                    <ActionButton
                      variant="secondary"
                      size="sm"
                      disabled={
                        loading || pagination.page <= 1
                      }
                      onClick={() => loadSubmissions(pagination.page - 1)}
                    >
                      Previous
                    </ActionButton>

                    <ActionButton
                      variant="secondary"
                      size="sm"
                      disabled={
                        loading
                        || pagination.page >= pagination.totalPages
                      }
                      onClick={() => loadSubmissions(pagination.page + 1)}
                    >
                      Next
                    </ActionButton>
                  </div>
                </div>
              </>
            )}
          </div>
        </SectionCard>
      </div>

      {selectedSubmission && (
        <SubmissionEvaluation
          key={selectedSubmission.id}
          assignmentId={assignmentId}
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onEvaluated={handleEvaluationComplete}
        />
      )}
    </div>
  );
}