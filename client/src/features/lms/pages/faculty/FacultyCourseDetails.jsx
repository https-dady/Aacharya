import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

import facultyCourseMaterialService from '../../services/facultyCourseMaterialService.js';

function getCourseId(course, state) {
  return String(
    state?.courseId
    || course?._id
    || course?.id
    || course?.courseId
    || '',
  );
}

function getCourseTitle(course) {
  return (
    course?.title
    || course?.name
    || course?.courseName
    || 'Course details'
  );
}

function getMaterialTitle(material) {
  return material?.title || 'Untitled material';
}

function getMaterialType(material) {
  const type = String(material?.type || '').toUpperCase();

  if (type === 'DOCUMENT') return 'Document';
  if (type === 'VIDEO') return 'Video';
  if (type === 'EXTERNAL') return 'External resource';

  return 'Learning resource';
}

function getMaterialUrl(material) {
  return material?.file?.url || material?.resourceUrl || '';
}

function formatDate(value) {
  if (!value) return 'Date not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'Unable to load course materials.'
  );
}

function MaterialTypeIcon({ type }) {
  const icon = {
    Document: '▤',
    Video: '▶',
    'External resource': '↗',
  }[type] || '▧';

  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-lg font-semibold text-[#CDB5F7]"
    >
      {icon}
    </span>
  );
}

function MaterialCard({ material, course, courseId }) {
  const title = getMaterialTitle(material);
  const type = getMaterialType(material);
  const url = getMaterialUrl(material);

  const materialId = material?.id || material?._id;

  return (
    <article className="rounded-xl border border-[#343640] bg-[#191A21] p-4 transition-colors hover:border-[#555663]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <MaterialTypeIcon type={type} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-semibold text-[#EAEAE6]">
              {title}
            </h3>

            <span className="rounded-md border border-[#454650] px-2 py-1 text-xs text-[#B8B8C2]">
              {type}
            </span>
          </div>

          {material?.description && (
            <p className="mt-2 break-words text-sm leading-6 text-[#A5A6B0]">
              {material.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#858590]">
            {material?.moduleName && (
              <span>Module: {material.moduleName}</span>
            )}

            {material?.createdAt && (
              <span>Added: {formatDate(material.createdAt)}</span>
            )}

            {material?.file?.size && (
              <span>
                {(material.file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#454650] px-3 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              Open resource ↗
            </a>
          )}

          {materialId && (
            <Link
              to="/faculty/courses/materials/details"
              state={{
                material,
                materialId,
                course,
                courseId,
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#CDB5F7]/10 px-3 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              Details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function CourseInfo({ label, value }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

export default function FacultyCourseDetails() {
  const location = useLocation();

  const course = location.state?.course || null;
  const courseId = getCourseId(course, location.state);

  const [materials, setMaterials] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMaterials = useCallback(async () => {
    if (!/^[a-f\d]{24}$/i.test(courseId)) {
      setMaterials([]);
      setPagination(null);
      setError('A valid course ID is required to load course materials.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result =
        await facultyCourseMaterialService.listMaterials(courseId);

      setMaterials(result.items || []);
      setPagination(result.pagination || null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials, refreshKey]);

  const filteredMaterials = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesType =
        typeFilter === 'ALL'
        || String(material.type).toUpperCase() === typeFilter;

      const searchableText = [
        material.title,
        material.description,
        material.moduleName,
        material.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch
        || searchableText.includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [materials, search, typeFilter]);

  const documentCount = materials.filter(
    (item) => item.type === 'DOCUMENT',
  ).length;

  const videoCount = materials.filter(
    (item) => item.type === 'VIDEO',
  ).length;

  const externalCount = materials.filter(
    (item) => item.type === 'EXTERNAL',
  ).length;

  const courseTitle = getCourseTitle(course);

  const courseCode = course?.code || course?.courseCode || 'Not available';

  const courseDescription =
    course?.description || 'No course description is available.';

  const uploadState = {
    course,
    courseId,
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Faculty workspace"
        title={courseTitle}
        description="View your assigned course information and manage its learning materials."
        breadcrumbs={[
          { label: 'Dashboard', to: '/faculty/dashboard' },
          { label: 'Courses', to: '/faculty/courses' },
          { label: 'Course details' },
        ]}
        actions={
          <Link
            to="/faculty/courses/materials/upload"
            state={uploadState}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition-colors hover:bg-[#DDCBFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14161C]"
          >
            + Upload material
          </Link>
        }
      />

      <SectionCard
        eyebrow="Course overview"
        title="Course information"
        description="Course information from your assigned course record."
      >
        <div className="space-y-5">
          <p className="break-words text-sm leading-7 text-[#B8B8C2]">
            {courseDescription}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CourseInfo label="Course code" value={courseCode} />

            <CourseInfo
              label="Semester"
              value={course?.semester}
            />

            <CourseInfo
              label="Credits"
              value={course?.credits}
            />

            <CourseInfo
              label="Category"
              value={course?.category}
            />

            <CourseInfo
              label="Status"
              value={course?.status}
            />

            <CourseInfo
              label="Department"
              value={
                typeof course?.department === 'object'
                  ? course.department?.name
                  : course?.department
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Learning resources"
        title="Course materials"
        description="Documents, video lectures and external resources assigned to this course."
        action={
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={isLoading}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#454650] px-3 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : '↻ Refresh'}
          </button>
        }
      >
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total materials', value: materials.length },
            { label: 'Documents', value: documentCount },
            { label: 'Videos', value: videoCount },
            { label: 'External resources', value: externalCount },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[#343640] bg-[#191A21] p-4"
            >
              <p className="text-xs text-[#858590]">
                {item.label}
              </p>

              <p className="mt-2 text-2xl font-semibold text-[#EAEAE6]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-[#D58B95]/30 bg-[#D58B95]/10 p-4"
          >
            <p className="text-sm leading-6 text-[#EAEAE6]">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="mt-3 text-sm font-semibold text-[#CDB5F7] underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        {!error && !isLoading && materials.length > 0 && (
          <div className="mb-5 flex flex-col gap-3 md:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, description or module..."
              aria-label="Search course materials"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#454650] bg-[#191A21] px-4 py-2.5 text-sm text-[#EAEAE6] placeholder:text-[#858590] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            />

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Filter course materials by type"
              className="min-h-11 rounded-xl border border-[#454650] bg-[#191A21] px-4 py-2.5 text-sm text-[#EAEAE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            >
              <option value="ALL">All types</option>
              <option value="DOCUMENT">Documents</option>
              <option value="VIDEO">Videos</option>
              <option value="EXTERNAL">External resources</option>
            </select>
          </div>
        )}

        {isLoading ? (
          <div
            className="flex min-h-40 items-center justify-center"
            role="status"
          >
            <div className="flex items-center gap-3 text-sm text-[#B8B8C2]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7]/30 border-t-[#CDB5F7]" />
              Loading course materials...
            </div>
          </div>
        ) : error ? (
          <EmptyState
            title="Materials could not be loaded"
            description="Refresh the materials section after checking your connection."
          />
        ) : filteredMaterials.length === 0 ? (
          <EmptyState
            title={
              materials.length === 0
                ? 'No course materials yet'
                : 'No matching materials'
            }
            description={
              materials.length === 0
                ? 'Upload documents, video lectures or external learning resources for your students.'
                : 'Try changing your search term or material type filter.'
            }
            action={
              materials.length === 0 ? (
                <Link
                  to="/faculty/courses/materials/upload"
                  state={uploadState}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#14161C] hover:bg-[#DDCBFF]"
                >
                  Upload first material
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('ALL');
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] hover:bg-[#CDB5F7]/10"
                >
                  Clear filters
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredMaterials.map((material, index) => (
              <MaterialCard
                key={material.id || material._id || index}
                material={material}
                course={course}
                courseId={courseId}
              />
            ))}
          </div>
        )}

        {pagination?.totalPages > 1 && (
          <p className="mt-5 text-xs text-[#858590]">
            Showing the materials returned by the server.
          </p>
        )}
      </SectionCard>
    </div>
  );
}