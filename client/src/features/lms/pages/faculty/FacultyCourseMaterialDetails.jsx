import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

import facultyCourseMaterialService from '../../services/facultyCourseMaterialService.js';

function getMaterialTitle(material) {
  return material?.title || 'Learning material';
}

function getMaterialType(material) {
  const value = String(material?.type || '').toUpperCase();

  if (value === 'DOCUMENT') return 'Document';
  if (value === 'VIDEO') return 'Video';
  if (value === 'EXTERNAL') return 'External resource';

  return 'Learning resource';
}

function getMaterialUrl(material) {
  return material?.file?.url || material?.resourceUrl || '';
}

function getModuleName(material) {
  return material?.moduleName || 'Not specified';
}

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatFileSize(bytes) {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size < 0) {
    return 'Not available';
  }

  if (size < 1024) return `${size} B`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'Unable to load material details.'
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function ResourceIcon({ type }) {
  const icon = {
    Document: '▤',
    Video: '▶',
    'External resource': '↗',
  }[type] || '▧';

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-2xl text-[#CDB5F7]">
      {icon}
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="flex min-h-48 items-center justify-center"
      role="status"
    >
      <div className="flex items-center gap-3 text-sm text-[#B8B8C2]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7]/30 border-t-[#CDB5F7]" />
        Loading material details...
      </div>
    </div>
  );
}

export default function FacultyCourseMaterialDetails() {
  const location = useLocation();

  const stateMaterial = location.state?.material || null;

  const course = location.state?.course || null;

  const courseId = String(
    location.state?.courseId
    || course?._id
    || course?.id
    || stateMaterial?.courseId
    || '',
  );

  const materialId = String(
    location.state?.materialId
    || stateMaterial?.id
    || stateMaterial?._id
    || '',
  );

  const [material, setMaterial] = useState(stateMaterial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadMaterial() {
      if (!materialId || !/^[a-f\d]{24}$/i.test(materialId)) {
        setMaterial(stateMaterial);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const result =
          await facultyCourseMaterialService.getMaterial(
            courseId,
            materialId,
          );

        if (isActive && result) {
          setMaterial(result);
        }
      } catch (fetchError) {
        if (isActive) {
          setError(getErrorMessage(fetchError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadMaterial();

    return () => {
      isActive = false;
    };
  }, [courseId, materialId, retryKey, stateMaterial]);

  const title = getMaterialTitle(material);
  const type = getMaterialType(material);
  const url = getMaterialUrl(material);

  const description = material?.description || '';

  const moduleName = getModuleName(material);

  const uploadedAt = formatDate(material?.createdAt);

  const updatedAt = formatDate(material?.updatedAt);

  const fileName =
    material?.file?.originalName || 'Not applicable';

  const fileSize = material?.file?.size != null
    ? formatFileSize(material.file.size)
    : 'Not applicable';

  const status = material?.status || 'Not specified';

  const backToCourse = courseId
    ? {
        pathname: '/faculty/courses/details',
        state: {
          course: course || { _id: courseId },
          courseId,
        },
      }
    : {
        pathname: '/faculty/courses',
      };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Faculty workspace"
        title={isLoading ? 'Loading material...' : title}
        description="Review learning resource information and access its associated content."
        breadcrumbs={[
          { label: 'Faculty', to: '/faculty/dashboard' },
          { label: 'Courses', to: '/faculty/courses' },
          { label: 'Material details' },
        ]}
        actions={
          <Link
            to={backToCourse.pathname}
            state={backToCourse.state}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] bg-[#26272B] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            ← Back to course
          </Link>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-[#D58B95]/30 bg-[#D58B95]/10 p-5"
        >
          <h2 className="text-sm font-semibold text-[#EAEAE6]">
            Material details could not be loaded
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#D8BFC3]">
            {error}
          </p>

          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#14161C] hover:bg-[#DDCBFF]"
          >
            Try again
          </button>
        </div>
      ) : !material ? (
        <EmptyState
          title="No material selected"
          description="Open a learning resource from the course details page. No material information is available in the current page state."
          action={
            <Link
              to="/faculty/courses"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#DDCBFF]"
            >
              Back to my courses
            </Link>
          }
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
            <SectionCard
              eyebrow="Resource overview"
              title="Material information"
              description="Details supplied by the course material record."
            >
              <div className="flex items-start gap-4">
                <ResourceIcon type={type} />

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
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#DDCBFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1F27]"
                  >
                    Open learning resource ↗
                  </a>
                ) : (
                  <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
                    <p className="text-sm font-semibold text-[#EAEAE6]">
                      Resource link unavailable
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#858590]">
                      This material record does not contain a resource URL.
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Resource status"
              title="Access information"
              description="Publication and resource information."
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
                    Publication status
                  </p>

                  <p className="mt-1 break-words text-sm font-semibold capitalize text-[#EAEAE6]">
                    {status.toLowerCase()}
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
                value={material.id || material._id}
              />

              <DetailItem
                label="Course identifier"
                value={material.courseId || courseId}
              />

              <DetailItem
                label="Module / chapter"
                value={moduleName}
              />
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/5 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-[#EAEAE6]">
              Data and access integrity
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
              This page displays metadata returned by the course material
              service. Course ownership and access permissions are enforced
              by the backend material endpoints.
            </p>
          </div>
        </>
      )}
    </div>
  );
}