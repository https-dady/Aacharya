import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

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

export default function FacultyAssignmentDetails() {
  const location = useLocation();
  const assignment = location.state?.assignment;

  if (!assignment) {
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
            description="No assignment record was provided to this page. Open an assignment from the assignment directory when actual records are available."
            action={
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
        </SectionCard>

        <p className="mt-5 rounded-xl border border-[#454650] bg-[#191A21] p-4 text-sm leading-6 text-[#9697A2]">
          Assignment details currently depend on React Router navigation
          state. A persistent backend lookup has not been connected, so
          opening or refreshing this page without assignment data will
          display this message.
        </p>
      </div>
    );
  }

  const title =
    assignment.title ||
    assignment.name ||
    'Untitled Assignment';

  const course =
    assignment.courseName ||
    assignment.course ||
    'Not provided';

  const section =
    assignment.sectionName ||
    assignment.section ||
    'Not provided';

  const batch =
    assignment.batchName ||
    assignment.batch ||
    'Not provided';

  const status = String(assignment.status ?? '').toLowerCase();

  const description =
    assignment.description ||
    assignment.instructions ||
    '';

  const instructions =
    assignment.instructions &&
    assignment.instructions !== description
      ? assignment.instructions
      : '';

  const totalMarks = assignment.totalMarks;

  const dueDate = formatDate(assignment.dueDate);

  const submissionCount =
    Number.isFinite(Number(assignment.submissionCount)) &&
    assignment.submissionCount !== undefined &&
    assignment.submissionCount !== null
      ? Number(assignment.submissionCount)
      : null;

  const gradedCount =
    Number.isFinite(Number(assignment.gradedCount)) &&
    assignment.gradedCount !== undefined &&
    assignment.gradedCount !== null
      ? Number(assignment.gradedCount)
      : null;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title={title}
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

        {assignment.courseCode && (
          <span className="rounded-lg border border-[#454650] bg-[#26272B] px-3 py-1.5 text-xs font-medium text-[#D0D0D8]">
            {assignment.courseCode}
          </span>
        )}
      </div>

      <SectionCard
        eyebrow="ASSIGNMENT INFORMATION"
        title="Assignment Overview"
        description="Academic details supplied by the selected assignment record."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem
            label="Assignment Title"
            value={title}
          />

          <DetailItem
            label="Course"
            value={course}
          />

          <DetailItem
            label="Course Code"
            value={assignment.courseCode}
          />

          <DetailItem
            label="Section"
            value={section}
          />

          <DetailItem
            label="Batch"
            value={batch}
          />

          <DetailItem
            label="Submission Deadline"
            value={dueDate}
          />

          <DetailItem
            label="Total Marks"
            value={totalMarks}
          />

          <DetailItem
            label="Allowed File Types"
            value={
              Array.isArray(assignment.allowedFileTypes)
                ? assignment.allowedFileTypes.join(', ')
                : assignment.allowedFileTypes
            }
          />

          <DetailItem
            label="Maximum File Size"
            value={
              assignment.maxFileSizeMb !== undefined &&
              assignment.maxFileSizeMb !== null
                ? `${assignment.maxFileSizeMb} MB`
                : undefined
            }
          />
        </div>
      </SectionCard>

      <div className="mt-6">
        <SectionCard
          eyebrow="ASSIGNMENT BRIEF"
          title="Description"
          description="The assignment overview and expected learning outcomes."
        >
          {description ? (
            <div className="whitespace-pre-wrap break-words rounded-xl border border-[#343640] bg-[#191A21] p-4 text-sm leading-7 text-[#D0D0D8]">
              {description}
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
          {instructions ? (
            <div className="whitespace-pre-wrap break-words rounded-xl border border-[#343640] bg-[#191A21] p-4 text-sm leading-7 text-[#D0D0D8]">
              {instructions}
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
              Individual student submissions, downloadable attachments,
              grading, and feedback require a confirmed backend contract.
              These operations are not connected on this page yet.
            </p>
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