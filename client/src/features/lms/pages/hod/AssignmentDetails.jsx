import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function getId(item) {
  if (!item) return '';

  if (typeof item === 'string') return item;

  return String(item.id ?? item._id ?? '');
}

function getLabel(item, fallback = 'Not provided') {
  if (!item) return fallback;

  if (typeof item === 'string') return item;

  return (
    item.name
    ?? item.title
    ?? item.fullName
    ?? item.code
    ?? getId(item)
    ?? fallback
  );
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Not provided';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not provided';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  }).format(date);
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || 'UNKNOWN').toUpperCase();

  const styles = {
    DRAFT: 'border-[#777986]/40 bg-[#777986]/10 text-[#C8C8D0]',
    PUBLISHED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    CLOSED: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[normalizedStatus]
        || 'border-[#454650] bg-[#191A21] text-[#A5A6B0]'
      }`}
    >
      {normalizedStatus}
    </span>
  );
}

function DetailItem({ label, value, children }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#9697A2]">
        {label}
      </p>

      <div className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {children ?? (
          value === undefined || value === null || value === ''
            ? 'Not provided'
            : value
        )}
      </div>
    </div>
  );
}

function RecordList({ items, label }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <p className="text-sm text-[#9697A2]">
        No specific {label.toLowerCase()} assigned.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={getId(item) || `${label}-${index}`}
          className="rounded-lg border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#D0D0D8]"
        >
          {getLabel(item, `${label} ${index + 1}`)}
        </span>
      ))}
    </div>
  );
}

function AttachmentList({ attachments }) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#454650] px-5 py-8 text-center">
        <p className="text-sm font-medium text-[#D0D0D8]">
          No attachments available
        </p>

        <p className="mt-2 text-sm text-[#9697A2]">
          This assignment does not contain any uploaded files or external resources.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment, index) => {
        const name = attachment?.name || `Attachment ${index + 1}`;
        const url = attachment?.url;

        return (
          <div
            key={`${url || name}-${index}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-4"
          >
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-[#EAEAE6]">
                {name}
              </p>

              <p className="mt-1 text-xs text-[#9697A2]">
                {attachment?.mimeType || 'Resource'}
                {attachment?.size
                  ? ` · ${(attachment.size / (1024 * 1024)).toFixed(2)} MB`
                  : ''}
              </p>
            </div>

            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-lg border border-[#CDB5F7]/30 bg-[#CDB5F7]/10 px-3 py-2 text-xs font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/20"
              >
                Open Attachment ↗
              </a>
            ) : (
              <span className="text-xs text-[#9697A2]">
                Link unavailable
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AssignmentDetails() {
  const location = useLocation();

  const assignment = location.state?.assignment;

  if (!assignment) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <PageHeader
          eyebrow="ACADEMIC OVERSIGHT"
          title="Assignment Details"
          description="Review assignment information, deadlines, and academic context."
          breadcrumbs={[
            { label: 'HOD Dashboard', to: '/hod/dashboard' },
            { label: 'Assignments', to: '/hod/assignments' },
            { label: 'Details' },
          ]}
        />

        <SectionCard>
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#454650] bg-[#26272B] text-2xl text-[#CDB5F7]">
              !
            </div>

            <h2 className="text-lg font-semibold text-[#EAEAE6]">
              Assignment details unavailable
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-[#A5A6B0]">
              No assignment record was supplied to this page. Open the
              assignment from the assignment directory to view its details.
              Direct access and refresh cannot restore the record because
              the current backend does not expose a GET-by-ID endpoint.
            </p>

            <div className="mt-6">
              <Link to="/hod/assignments">
                <ActionButton variant="secondary">
                  Back to Assignments
                </ActionButton>
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  const title = assignment.title || 'Untitled Assignment';

  const course = assignment.course;
  const department = assignment.department;
  const creator = assignment.createdBy;

  const batches = assignment.batches ?? assignment.batchIds ?? [];
  const sections = assignment.sections ?? assignment.sectionIds ?? [];
  const attachments = assignment.attachments ?? [];

  const contentType = assignment.contentType === 'PRACTICAL'
    ? 'Practical'
    : 'Assignment';

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title={title}
        description={`Review complete ${contentType.toLowerCase()} information and its academic allocation.`}
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Assignments', to: '/hod/assignments' },
          { label: 'Details' },
        ]}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link
              to="/hod/assignments/edit"
              state={{ assignment }}
            >
              <ActionButton>
                Edit Assignment
              </ActionButton>
            </Link>

            <Link to="/hod/assignments">
              <ActionButton variant="secondary">
                Back
              </ActionButton>
            </Link>
          </div>
        )}
      />

      <SectionCard
        eyebrow="CONTENT INFORMATION"
        title="Assignment Overview"
        description="Core information supplied by the assignment management record."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Title" value={title} />

          <DetailItem label="Content Type" value={contentType} />

          <DetailItem label="Publication Status">
            <StatusBadge status={assignment.status} />
          </DetailItem>

          <DetailItem
            label="Course"
            value={getLabel(course, 'Not provided')}
          />

          <DetailItem
            label="Course Code"
            value={course?.code}
          />

          <DetailItem
            label="Department"
            value={getLabel(department, 'Not provided')}
          />

          <DetailItem
            label="Department Code"
            value={department?.code}
          />

          <DetailItem
            label="Total Marks"
            value={assignment.totalMarks}
          />

          <DetailItem
            label="Submission Deadline"
            value={formatDate(assignment.dueDate, true)}
          />

          <DetailItem
            label="Created At"
            value={formatDate(assignment.createdAt, true)}
          />

          <DetailItem
            label="Last Updated"
            value={formatDate(assignment.updatedAt, true)}
          />

          <DetailItem
            label="Published At"
            value={formatDate(assignment.publishedAt, true)}
          />

          <DetailItem
            label="Closed At"
            value={formatDate(assignment.closedAt, true)}
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="ACADEMIC ALLOCATION"
        title="Target Batches"
        description="Batches assigned to this assignment."
      >
        <RecordList items={batches} label="Batches" />
      </SectionCard>

      <SectionCard
        eyebrow="ACADEMIC ALLOCATION"
        title="Target Sections"
        description="Sections assigned to this assignment."
      >
        <RecordList items={sections} label="Sections" />
      </SectionCard>

      <SectionCard
        eyebrow="INSTRUCTIONS"
        title="Assignment Description"
        description="Instructions and requirements supplied with this assignment."
      >
        {assignment.description ? (
          <div className="whitespace-pre-wrap rounded-xl border border-[#343640] bg-[#191A21] p-4 text-sm leading-7 text-[#D0D0D8]">
            {assignment.description}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#454650] px-5 py-8 text-center">
            <p className="text-sm font-medium text-[#D0D0D8]">
              No description available
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="LEARNING RESOURCES"
        title="Attachments"
        description="Files and external resources associated with this assignment."
      >
        <AttachmentList attachments={attachments} />
      </SectionCard>

      <SectionCard
        eyebrow="RECORD OWNERSHIP"
        title="Created By"
        description="Creator information available in the assignment record."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Creator Name"
            value={getLabel(creator, 'Not provided')}
          />

          <DetailItem
            label="Creator Email"
            value={creator?.email}
          />

          <DetailItem
            label="Creator Role"
            value={creator?.role}
          />

          <DetailItem
            label="Assignment ID"
            value={getId(assignment)}
          />
        </div>
      </SectionCard>

      <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#CDB5F7]">
          Record loading behavior
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This page displays the assignment record passed through React
          Router navigation state. The current backend does not provide
          a GET-by-ID endpoint for assignments. Therefore, opening this
          page directly or refreshing it may require returning to the
          assignment directory and opening the record again.
        </p>
      </div>
    </div>
  );
}