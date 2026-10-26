import { Link, useLocation } from 'react-router-dom';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function getMaterialTitle(material) {
  return (
    material?.title ||
    material?.name ||
    material?.fileName ||
    'Learning material'
  );
}

function getMaterialType(material) {
  const rawType =
    material?.type ||
    material?.mimeType ||
    material?.format ||
    '';

  const value = String(rawType).toLowerCase();

  if (value.includes('pdf')) return 'PDF document';
  if (value.includes('video') || value.includes('youtube')) return 'Video';
  if (value.includes('link') || value.includes('url')) return 'External link';
  if (value.includes('note') || value.includes('text')) return 'Notes';
  if (value.includes('presentation') || value.includes('powerpoint')) {
    return 'Presentation';
  }
  if (value.includes('word') || value.includes('document')) {
    return 'Document';
  }

  return rawType || 'Learning resource';
}

function getMaterialUrl(material) {
  return (
    material?.url ||
    material?.fileUrl ||
    material?.resourceUrl ||
    material?.link ||
    ''
  );
}

function getModuleName(module) {
  if (!module) return 'Not specified';

  if (typeof module === 'string') {
    return module;
  }

  return module.title || module.name || 'Not specified';
}

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium text-[#858590]">{label}</p>

      <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function ResourceIcon({ type }) {
  if (type.includes('Video')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <rect x="3.75" y="5.75" width="16.5" height="12.5" rx="2" />
        <path d="m10 9 5 3-5 3V9Z" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type.includes('link')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path
          d="M10 13.5a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5"
          strokeLinecap="round"
        />
        <path
          d="M14 10.5a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 14 19.16l1.5-1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path
        d="M7 3.75h7l4.25 4.5v12A1.75 1.75 0 0 1 16.5 22h-10A1.75 1.75 0 0 1 4.75 20.25V5.5A1.75 1.75 0 0 1 6.5 3.75Z"
        strokeLinejoin="round"
      />
      <path
        d="M14 4v4.5h4M8 13h8M8 16.5h5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function FacultyCourseMaterialDetails() {
  const location = useLocation();

  const material = location.state?.material || null;
  const courseId = location.state?.courseId || material?.courseId || null;

  if (!material) {
    return (
      <div className="mx-auto w-full max-w-[1600px]">
        <PageHeader
          eyebrow="Teaching workspace"
          title="Material details"
          description="View learning resource information and access its associated content."
          breadcrumbs={[
            { label: 'Faculty', to: '/faculty/dashboard' },
            { label: 'Courses', to: '/faculty/courses' },
            { label: 'Material details' },
          ]}
        />

        <EmptyState
          title="No material selected"
          description="Open a learning resource from the course details page to view its information. The material record was not supplied to this page, so no resource details have been fabricated."
          action={
            <Link
              to="/faculty/courses"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#DDCBFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14161C]"
            >
              Back to my courses
            </Link>
          }
        />
      </div>
    );
  }

  const title = getMaterialTitle(material);
  const type = getMaterialType(material);
  const url = getMaterialUrl(material);

  const description =
    material.description ||
    material.summary ||
    material.notes ||
    '';

  const moduleName = getModuleName(material.module);

  const uploadedAt = formatDate(
    material.uploadedAt || material.createdAt,
  );

  const updatedAt = formatDate(material.updatedAt);

  const fileName =
    material.fileName ||
    material.originalName ||
    material.name ||
    'Not available';

  const fileSize = material.fileSize
    ? `${(Number(material.fileSize) / 1024 / 1024).toFixed(2)} MB`
    : material.size || 'Not available';

  const visibility =
    material.visibility ||
    material.status ||
    material.publicationStatus ||
    'Not specified';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title={title}
        description="Review the learning resource details and open its associated content when a valid resource link is available."
        breadcrumbs={[
          { label: 'Faculty', to: '/faculty/dashboard' },
          { label: 'Courses', to: '/faculty/courses' },
          { label: 'Material details' },
        ]}
        actions={
          <Link
            to="/faculty/courses/details"
            state={
              courseId
                ? { course: { _id: courseId } }
                : undefined
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] bg-[#26272B] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Back to course
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <SectionCard
          eyebrow="Resource overview"
          title="Material information"
          description="Details provided by the selected course material record."
          variant="default"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]">
              <ResourceIcon type={type} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="break-words text-lg font-semibold text-[#EAEAE6]">
                {title}
              </h2>

              <span className="mt-2 inline-flex rounded-lg border border-[#454650] bg-[#191A21] px-2.5 py-1 text-xs font-medium text-[#B8B8C2]">
                {type}
              </span>

              {description && (
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#A5A6B0]">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-[#343640] pt-5">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#DDCBFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1F27]"
              >
                Open learning resource
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M11 3.75h5.25V9M16 4l-7.5 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 11.25v4A1.75 1.75 0 0 1 12.25 17h-7.5A1.75 1.75 0 0 1 3 15.25v-7.5A1.75 1.75 0 0 1 4.75 6h4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </a>
            ) : (
              <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
                <p className="text-sm font-semibold text-[#EAEAE6]">
                  Resource link unavailable
                </p>
                <p className="mt-1 text-sm leading-6 text-[#858590]">
                  The selected material does not contain a resource URL.
                  No download link has been generated.
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Resource status"
          title="Access information"
          description="Availability and publication information from the selected record."
          variant="elevated"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-[#858590]">
                Resource type
              </p>
              <p className="mt-1 text-sm font-semibold text-[#EAEAE6]">
                {type}
              </p>
            </div>

            <div className="border-t border-[#3B3C43] pt-4">
              <p className="text-xs font-medium text-[#858590]">
                Visibility / status
              </p>
              <p className="mt-1 break-words text-sm font-semibold capitalize text-[#EAEAE6]">
                {visibility}
              </p>
            </div>

            <div className="border-t border-[#3B3C43] pt-4">
              <p className="text-xs font-medium text-[#858590]">
                Module / chapter
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-[#EAEAE6]">
                {moduleName}
              </p>
            </div>

            <div className="border-t border-[#3B3C43] pt-4">
              <p className="text-xs font-medium text-[#858590]">
                Resource link
              </p>
              <p className="mt-1 break-words text-sm text-[#B8B8C2]">
                {url ? 'Available' : 'Not provided'}
              </p>
            </div>
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="File and record details"
        description="Metadata available on the selected material."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="File name" value={fileName} />
          <DetailItem label="File size" value={fileSize} />
          <DetailItem label="Resource type" value={type} />
          <DetailItem label="Uploaded on" value={uploadedAt} />
          <DetailItem label="Last updated" value={updatedAt} />
          <DetailItem
            label="Material identifier"
            value={material._id || material.id || 'Not available'}
          />
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/5 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#EAEAE6]">
          Data and access integrity
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
          This page displays only the metadata and resource link supplied
          by the selected material record. File permissions, private
          downloads and server-side resource access must be enforced by
          the backend when material APIs are integrated.
        </p>
      </div>
    </div>
  );
}