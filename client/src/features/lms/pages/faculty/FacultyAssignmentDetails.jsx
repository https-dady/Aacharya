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

import assignmentManagementService from '../../services/assignmentManagementService.js';

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
  if (!value) {
    return 'Not provided';
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

function getStatusStyles(status) {
  switch (String(status ?? '').toLowerCase()) {
    case 'published':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'closed':
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    case 'draft':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#C8C8D0]';
  }
}

function getReferenceName(reference) {
  if (!reference) {
    return '';
  }

  if (typeof reference === 'string') {
    return reference;
  }

  return reference.name || reference.title || reference.code || '';
}

function getReferenceNames(references) {
  if (!Array.isArray(references) || references.length === 0) {
    return 'Not provided';
  }

  return references
    .map(getReferenceName)
    .filter(Boolean)
    .join(', ') || 'Not provided';
}

function getAssignmentId(assignment) {
  return String(
    assignment?.id ||
    assignment?._id ||
    '',
  );
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
    instructions: description
      .slice(markerIndex + marker.length)
      .trim(),
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

  const [assignment, setAssignment] = useState(
    navigationAssignment,
  );

  const [loading, setLoading] = useState(
    Boolean(requestedAssignmentId),
  );

  const [error, setError] = useState('');

  const loadAssignment = useCallback(async () => {
    if (!requestedAssignmentId) {
      setAssignment(navigationAssignment);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError('');

    try {
      const firstPage =
        await assignmentManagementService.listAssignments(
          {
            page: 1,
            limit: 100,
          },
          {
            signal: controller.signal,
          },
        );

      let matchedAssignment = firstPage.items.find(
        (item) => item.id === requestedAssignmentId,
      );

      const totalPages = firstPage.pagination.totalPages;

      if (!matchedAssignment && totalPages > 1) {
        for (
          let page = 2;
          page <= totalPages && !matchedAssignment;
          page += 1
        ) {
          const result =
            await assignmentManagementService.listAssignments(
              {
                page,
                limit: 100,
              },
              {
                signal: controller.signal,
              },
            );

          matchedAssignment = result.items.find(
            (item) => item.id === requestedAssignmentId,
          );
        }
      }

      if (!controller.signal.aborted) {
        if (!matchedAssignment) {
          setAssignment(null);
          setError(
            'The requested assignment could not be found in your accessible assignment records.',
          );
        } else {
          setAssignment(matchedAssignment);
        }
      }
    } catch (loadError) {
      if (!controller.signal.aborted) {
        setAssignment(null);

        setError(
          loadError?.response?.data?.message ||
          loadError?.message ||
          'Unable to load assignment details.',
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }

    return () => controller.abort();
  }, [requestedAssignmentId, navigationAssignment]);

  useEffect(() => {
    let cancelled = false;
    let abortRequest;

    async function run() {
      const cleanup = await loadAssignment();

      if (cancelled && typeof cleanup === 'function') {
        cleanup();
      } else {
        abortRequest = cleanup;
      }
    }

    run();

    return () => {
      cancelled = true;

      if (typeof abortRequest === 'function') {
        abortRequest();
      }
    };
  }, [loadAssignment]);

  useEffect(() => {
    const assignmentId = getAssignmentId(navigationAssignment);

    if (
      assignmentId &&
      !searchParams.get('assignmentId')
    ) {
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
    if (!assignment) {
      return null;
    }

    const parsedDescription = extractInstructions(
      assignment.description || '',
    );

    const explicitInstructions = assignment.instructions || '';

    return {
      ...assignment,

      title:
        assignment.title ||
        assignment.name ||
        'Untitled Assignment',

      description: parsedDescription.description,

      instructions:
        explicitInstructions || parsedDescription.instructions,

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

  const status = String(
    details?.status || '',
  ).toLowerCase();

  const submissionCount =
    assignment?.submissionCount !== undefined &&
    assignment?.submissionCount !== null
      ? Number(assignment.submissionCount)
      : null;

  const gradedCount =
    assignment?.gradedCount !== undefined &&
    assignment?.gradedCount !== null
      ? Number(assignment.gradedCount)
      : null;

  function handleRetry() {
    loadAssignment();
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="Assignment Details"
          description="Loading assignment information."
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
          description="Review assignment information, instructions, deadlines, and submission requirements."
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
        />

        <SectionCard>
          <EmptyState
            title="Assignment details unavailable"
            description={
              error ||
              'No assignment record is available. Open an assignment from the assignment directory.'
            }
            action={
              <div className="flex flex-wrap gap-3">
                <ActionButton
                  variant="secondary"
                  onClick={handleRetry}
                >
                  Retry
                </ActionButton>

                <Link
                  to="/faculty/assignments"
                  className="inline-flex items-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition-colors hover:bg-[#26272B]"
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

  const dueDate = formatDate(details.dueDate);

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

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#343640] bg-[#191A21] p-4">
        <span
          className={[
            'inline-flex rounded-full border px-3 py-1.5',
            'text-xs font-semibold',
            getStatusStyles(status),
          ].join(' ')}
        >
          {status
            ? status.charAt(0).toUpperCase() + status.slice(1)
            : 'Status unavailable'}
        </span>

        <span className="text-sm text-[#9697A2]">
          Due: {dueDate}
        </span>

        {details.courseCode !== 'Not provided' && (
          <span className="rounded-lg border border-[#454650] bg-[#26272B] px-3 py-1.5 text-xs font-medium text-[#D0D0D8]">
            {details.courseCode}
          </span>
        )}
      </div>

      <SectionCard
        eyebrow="ASSIGNMENT INFORMATION"
        title="Assignment Overview"
        description="Academic details supplied by the assignment record."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem
            label="Assignment Title"
            value={details.title}
          />

          <DetailItem
            label="Content Type"
            value={details.contentType}
          />

          <DetailItem
            label="Course"
            value={details.courseName}
          />

          <DetailItem
            label="Course Code"
            value={details.courseCode}
          />

          <DetailItem
            label="Department"
            value={details.departmentName}
          />

          <DetailItem
            label="Target Batches"
            value={details.batchNames}
          />

          <DetailItem
            label="Target Sections"
            value={details.sectionNames}
          />

          <DetailItem
            label="Submission Deadline"
            value={dueDate}
          />

          <DetailItem
            label="Total Marks"
            value={details.totalMarks}
          />

          <DetailItem
            label="Created By"
            value={details.createdBy?.name || details.createdBy?.fullName}
          />

          <DetailItem
            label="Created At"
            value={formatDate(details.createdAt)}
          />

          <DetailItem
            label="Last Updated"
            value={formatDate(details.updatedAt)}
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
              description="No separate student instructions were supplied with this assignment record."
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="SUPPORTING DOCUMENTS"
          title="Attachments"
          description="Reference documents and files attached to this assignment."
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
                      {attachment.size
                        ? ` · ${(attachment.size / (1024 * 1024)).toFixed(2)} MB`
                        : ''}
                    </p>
                  </div>

                  {attachment.url && (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center rounded-lg border border-[#454650] px-3 py-2 text-xs font-semibold text-[#CDB5F7] transition-colors hover:border-[#CDB5F7]/60 hover:bg-[#CDB5F7]/10"
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
              description="No supporting documents are attached to this assignment."
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
              are handled by the Faculty Assignment Submissions module.
            </p>

            <Link
              to="/faculty/assignments/submissions"
              state={{
                assignment,
              }}
              className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-[#CDB5F7]/30 bg-[#CDB5F7]/10 px-4 py-2 text-sm font-semibold text-[#DCCBFA] transition-colors hover:bg-[#CDB5F7]/20"
            >
              View Student Submissions
            </Link>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 flex justify-end">
        <Link
          to="/faculty/assignments"
          className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          <ActionButton variant="secondary">
            Back to Assignments
          </ActionButton>
        </Link>
      </div>
    </div>
  );
}