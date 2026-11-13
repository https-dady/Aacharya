import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import assignmentManagementService, {
  ASSIGNMENT_STATUSES,
} from '../../services/assignmentManagementService.js';

function getAssignmentId(assignment) {
  return String(assignment?.id || assignment?._id || '');
}

function getReferenceName(reference) {
  if (!reference) return '';

  if (typeof reference === 'string') return reference;

  return reference.name || reference.title || reference.code || '';
}

function getReferenceNames(references) {
  if (!Array.isArray(references) || references.length === 0) {
    return 'Not provided';
  }

  return references.map(getReferenceName).filter(Boolean).join(', ')
    || 'Not provided';
}

function DetailItem({ label, value }) {
  const displayValue =
    value === undefined || value === null || value === ''
      ? 'Not provided'
      : String(value);

  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#9697A2]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium leading-6 text-[#EAEAE6]">
        {displayValue}
      </p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Not provided';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getStatusStyles(status) {
  switch (String(status ?? '').toUpperCase()) {
    case ASSIGNMENT_STATUSES.PUBLISHED:
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case ASSIGNMENT_STATUSES.CLOSED:
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    case ASSIGNMENT_STATUSES.DRAFT:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#C8C8D0]';
  }
}

function extractInstructions(description = '') {
  const marker = 'Student Instructions:';
  const markerIndex = description.indexOf(marker);

  if (markerIndex === -1) {
    return {
      description,
      instructions: '',
    };
  }

  return {
    description: description.slice(0, markerIndex).trim(),
    instructions: description.slice(markerIndex + marker.length).trim(),
  };
}

export default function FacultyAssignmentDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const navigationAssignment = location.state?.assignment || null;

  const requestedAssignmentId =
    searchParams.get('assignmentId') ||
    getAssignmentId(navigationAssignment);

  const [assignment, setAssignment] = useState(navigationAssignment);
  const [loading, setLoading] = useState(Boolean(requestedAssignmentId));
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadAssignment = useCallback(async () => {
    if (!requestedAssignmentId) {
      setAssignment(navigationAssignment);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      let matchedAssignment =
        getAssignmentId(navigationAssignment) === requestedAssignmentId
          ? navigationAssignment
          : null;

      if (!matchedAssignment) {
        const firstPage =
          await assignmentManagementService.listAssignments({
            page: 1,
            limit: 100,
          });

        matchedAssignment = firstPage.items.find(
          (item) => getAssignmentId(item) === requestedAssignmentId,
        );

        const totalPages = firstPage.pagination.totalPages;

        for (
          let page = 2;
          page <= totalPages && !matchedAssignment;
          page += 1
        ) {
          const result =
            await assignmentManagementService.listAssignments({
              page,
              limit: 100,
            });

          matchedAssignment = result.items.find(
            (item) => getAssignmentId(item) === requestedAssignmentId,
          );
        }
      }

      if (!matchedAssignment) {
        setAssignment(null);
        setError(
          'The requested assignment could not be found in your accessible assignment records.',
        );
      } else {
        setAssignment(matchedAssignment);
      }
    } catch (loadError) {
      setAssignment(null);

      setError(
        loadError?.response?.data?.message ||
        loadError?.message ||
        'Unable to load assignment details.',
      );
    } finally {
      setLoading(false);
    }
  }, [requestedAssignmentId, navigationAssignment]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  useEffect(() => {
    const assignmentId = getAssignmentId(navigationAssignment);

    if (assignmentId && !searchParams.get('assignmentId')) {
      const nextParams = new URLSearchParams(searchParams);

      nextParams.set('assignmentId', assignmentId);

      navigate(
        {
          pathname: location.pathname,
          search: nextParams.toString(),
        },
        {
          replace: true,
          state: location.state,
        },
      );
    }
  }, [
    navigationAssignment,
    searchParams,
    navigate,
    location.pathname,
    location.state,
  ]);

  const details = useMemo(() => {
    if (!assignment) return null;

    const parsed = extractInstructions(assignment.description || '');

    return {
      ...assignment,

      title:
        assignment.title ||
        assignment.name ||
        'Untitled Assignment',

      description: parsed.description,

      instructions:
        assignment.instructions || parsed.instructions,

      courseName:
        getReferenceName(assignment.course) ||
        assignment.courseName ||
        'Not provided',

      courseCode:
        assignment.course?.code ||
        assignment.courseCode ||
        'Not provided',

      departmentName:
        getReferenceName(assignment.department) ||
        'Not provided',

      batchNames: getReferenceNames(assignment.batches),
      sectionNames: getReferenceNames(assignment.sections),
    };
  }, [assignment]);

  const assignmentId = getAssignmentId(assignment);

  const status = String(details?.status || '').toUpperCase();

  const isDraft = status === ASSIGNMENT_STATUSES.DRAFT;
  const isPublished = status === ASSIGNMENT_STATUSES.PUBLISHED;
  const isClosed = status === ASSIGNMENT_STATUSES.CLOSED;

  const dueDate = formatDate(details?.dueDate);

  const submissionCount =
    details?.submissionCount !== undefined &&
    details?.submissionCount !== null
      ? Number(details.submissionCount)
      : null;

  const gradedCount =
    details?.gradedCount !== undefined &&
    details?.gradedCount !== null
      ? Number(details.gradedCount)
      : null;

  const editUrl = assignmentId
    ? `/faculty/assignments/new?assignmentId=${encodeURIComponent(assignmentId)}`
    : null;

  const handleStatusChange = async (nextStatus) => {
    if (!assignmentId || actionLoading) return;

    if (
      nextStatus !== ASSIGNMENT_STATUSES.PUBLISHED &&
      nextStatus !== ASSIGNMENT_STATUSES.CLOSED
    ) {
      return;
    }

    if (nextStatus === ASSIGNMENT_STATUSES.PUBLISHED && !isDraft) {
      return;
    }

    if (nextStatus === ASSIGNMENT_STATUSES.CLOSED && !isPublished) {
      return;
    }

    if (nextStatus === ASSIGNMENT_STATUSES.CLOSED) {
      const confirmed = window.confirm(
        'Are you sure you want to close this assignment? Students will no longer be able to submit it as an open assignment.',
      );

      if (!confirmed) return;
    }

    setActionLoading(true);
    setError('');
    setActionMessage('');

    try {
      const result = await assignmentManagementService.updateAssignment(
        assignmentId,
        {
          status: nextStatus,
        },
      );

      if (result?.assignment) {
        setAssignment(result.assignment);
      } else {
        await loadAssignment();
      }

      setActionMessage(
        nextStatus === ASSIGNMENT_STATUSES.PUBLISHED
          ? 'Assignment published successfully.'
          : 'Assignment closed successfully.',
      );
    } catch (actionError) {
      setError(
        actionError?.response?.data?.message ||
        actionError?.message ||
        'Unable to update assignment status.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="Assignment Details"
          description="Loading assignment information."
        />

        <SectionCard>
          <div className="flex min-h-48 items-center justify-center">
            <p className="text-sm text-[#A5A6B0]">
              Loading assignment details...
            </p>
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="Assignment Details"
          description="Review assignment information and submission requirements."
        />

        <SectionCard>
          <EmptyState
            title="Assignment details unavailable"
            description={
              error ||
              'Open an assignment from the assignment directory.'
            }
            action={
              <div className="flex flex-wrap gap-3">
                <ActionButton
                  variant="secondary"
                  onClick={loadAssignment}
                >
                  Retry
                </ActionButton>

                <Link
                  to="/faculty/assignments"
                  className="inline-flex items-center rounded-xl border border-[#454650] px-4 py-2 text-sm text-[#EAEAE6]"
                >
                  Back to Assignments
                </Link>
              </div>
            }
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title={details.title}
        description="Review assignment information, academic allocation, and submission overview."
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
            label: 'Details',
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {editUrl && (
              <Link
                to={editUrl}
                state={{ assignment }}
                className="inline-flex rounded-xl"
              >
                <ActionButton>
                  Edit Assignment
                </ActionButton>
              </Link>
            )}

            <Link
              to="/faculty/assignments"
              className="inline-flex rounded-xl"
            >
              <ActionButton variant="secondary">
                Back
              </ActionButton>
            </Link>
          </div>
        }
      />

      <div className="mb-6 rounded-2xl border border-[#343640] bg-[#191A21] p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={[
                'inline-flex rounded-full border px-3 py-1.5',
                'text-xs font-semibold',
                getStatusStyles(status),
              ].join(' ')}
            >
              {status || 'STATUS UNAVAILABLE'}
            </span>

            <span className="text-sm text-[#9697A2]">
              Due: {dueDate}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDraft && (
              <ActionButton
                onClick={() =>
                  handleStatusChange(ASSIGNMENT_STATUSES.PUBLISHED)
                }
                disabled={actionLoading}
              >
                {actionLoading ? 'Updating...' : 'Publish Assignment'}
              </ActionButton>
            )}

            {isPublished && (
              <ActionButton
                variant="secondary"
                onClick={() =>
                  handleStatusChange(ASSIGNMENT_STATUSES.CLOSED)
                }
                disabled={actionLoading}
              >
                {actionLoading ? 'Updating...' : 'Close Assignment'}
              </ActionButton>
            )}

            {isClosed && (
              <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300">
                Assignment Closed
              </span>
            )}
          </div>
        </div>

        {isDraft && (
          <p className="mt-3 text-xs leading-5 text-[#9697A2]">
            This assignment is currently a draft. Publish it when it is
            ready for students.
          </p>
        )}

        {isPublished && (
          <p className="mt-3 text-xs leading-5 text-[#9697A2]">
            This assignment is published. You can close it when submissions
            should no longer remain open.
          </p>
        )}

        {isClosed && (
          <p className="mt-3 text-xs leading-5 text-[#9697A2]">
            This assignment is closed. No further lifecycle action is
            available here.
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {actionMessage && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          {actionMessage}
        </div>
      )}

      <SectionCard
        eyebrow="ASSIGNMENT INFORMATION"
        title="Assignment Overview"
        description="Academic details supplied by the assignment record."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Assignment Title" value={details.title} />
          <DetailItem label="Content Type" value={details.contentType} />
          <DetailItem label="Course" value={details.courseName} />
          <DetailItem label="Course Code" value={details.courseCode} />
          <DetailItem label="Department" value={details.departmentName} />
          <DetailItem label="Target Batches" value={details.batchNames} />
          <DetailItem label="Target Sections" value={details.sectionNames} />
          <DetailItem label="Submission Deadline" value={dueDate} />
          <DetailItem label="Total Marks" value={details.totalMarks} />
          <DetailItem
            label="Created At"
            value={formatDate(details.createdAt)}
          />
          <DetailItem
            label="Published At"
            value={formatDate(details.publishedAt)}
          />
          <DetailItem
            label="Closed At"
            value={formatDate(details.closedAt)}
          />
        </div>
      </SectionCard>

      <div className="mt-6">
        <SectionCard
          eyebrow="ASSIGNMENT BRIEF"
          title="Description"
          description="The assignment overview and expected learning outcomes."
        >
          {details.description ? (
            <div className="whitespace-pre-wrap break-words rounded-xl border border-[#343640] bg-[#191A21] p-4 text-sm leading-7 text-[#D0D0D8]">
              {details.description}
            </div>
          ) : (
            <EmptyState
              title="No description available"
              description="The assignment record does not contain a description."
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="STUDENT GUIDANCE"
          title="Instructions"
          description="Submission guidance supplied with the assignment."
        >
          {details.instructions ? (
            <div className="whitespace-pre-wrap break-words rounded-xl border border-[#343640] bg-[#191A21] p-4 text-sm leading-7 text-[#D0D0D8]">
              {details.instructions}
            </div>
          ) : (
            <EmptyState
              title="No additional instructions"
              description="No separate student instructions were supplied."
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="SUPPORTING DOCUMENTS"
          title="Attachments"
          description="Reference documents attached to this assignment."
        >
          {details.attachments?.length > 0 ? (
            <div className="space-y-3">
              {details.attachments.map((attachment, index) => (
                <div
                  key={`${attachment.publicId || attachment.url}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-4"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-[#EAEAE6]">
                      {attachment.name || `Attachment ${index + 1}`}
                    </p>

                    <p className="mt-1 text-xs text-[#9697A2]">
                      {attachment.mimeType || 'Document'}
                    </p>
                  </div>

                  {attachment.url && (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center rounded-lg border border-[#454650] px-3 py-2 text-xs font-semibold text-[#CDB5F7] hover:bg-[#CDB5F7]/10"
                    >
                      Open Attachment
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No attachments"
              description="No supporting documents are attached."
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="SUBMISSION OVERVIEW"
          title="Student Submissions"
          description="Review the available submission summary for this assignment."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem
              label="Total Submissions"
              value={submissionCount ?? 'Not available'}
            />

            <DetailItem
              label="Graded Submissions"
              value={gradedCount ?? 'Not available'}
            />
          </div>

          <div className="mt-5 rounded-xl border border-[#454650] bg-[#191A21] p-4">
            <p className="text-sm font-medium text-[#EAEAE6]">
              Submission management
            </p>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Individual student submissions, evaluation, and feedback
              are managed separately.
            </p>

            <Link
              to="/faculty/assignments/submissions"
              state={{ assignment }}
              className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-[#CDB5F7]/30 bg-[#CDB5F7]/10 px-4 py-2 text-sm font-semibold text-[#DCCBFA] hover:bg-[#CDB5F7]/20"
            >
              View Student Submissions
            </Link>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {editUrl && (
          <Link
            to={editUrl}
            state={{ assignment }}
            className="inline-flex rounded-xl"
          >
            <ActionButton>
              Edit Assignment
            </ActionButton>
          </Link>
        )}

        <Link
          to="/faculty/assignments"
          className="inline-flex rounded-xl"
        >
          <ActionButton variant="secondary">
            Back to Assignments
          </ActionButton>
        </Link>
      </div>
    </div>
  );
}