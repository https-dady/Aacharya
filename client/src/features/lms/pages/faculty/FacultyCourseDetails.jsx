import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function getCourseTitle(course) {
  return course?.title || course?.name || course?.courseName || 'Course details';
}

function getMaterialTitle(material) {
  return material?.title || material?.name || material?.fileName || 'Untitled material';
}

function getMaterialType(material) {
  const rawType = material?.type || material?.mimeType || material?.format || '';
  const value = String(rawType).toLowerCase();

  if (value.includes('pdf') || value.includes('application/pdf')) {
    return 'PDF document';
  }

  if (value.includes('video') || value.includes('youtube')) {
    return 'Video';
  }

  if (value.includes('link') || value.includes('url')) {
    return 'External link';
  }

  if (value.includes('text') || value.includes('note')) {
    return 'Notes';
  }

  if (value.includes('presentation') || value.includes('powerpoint')) {
    return 'Presentation';
  }

  if (value.includes('word') || value.includes('document')) {
    return 'Document';
  }

  return rawType || 'Learning resource';
}

function getMaterialIcon(type) {
  if (type.includes('PDF') || type.includes('Document')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden="true">
        <path d="M7 3.75h7l4.25 4.5v12A1.75 1.75 0 0 1 16.5 22h-10A1.75 1.75 0 0 1 4.75 20.25V5.5A1.75 1.75 0 0 1 6.5 3.75Z" />
        <path d="M14 4v4.5h4M8 13h8M8 16.5h5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type.includes('Video')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden="true">
        <rect x="3.75" y="5.75" width="16.5" height="12.5" rx="2" />
        <path d="m10 9 5 3-5 3V9Z" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type.includes('link')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden="true">
        <path d="M10 13.5a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" strokeLinecap="round" />
        <path d="M14 10.5a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 14 19.16l1.5-1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden="true">
      <path d="M4.75 5.75A1.75 1.75 0 0 1 6.5 4h11A1.75 1.75 0 0 1 19.25 5.75v12.5A1.75 1.75 0 0 1 17.5 20h-11a1.75 1.75 0 0 1-1.75-1.75V5.75Z" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(value) {
  if (!value) return 'Date not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getMaterialUrl(material) {
  return material?.url || material?.fileUrl || material?.resourceUrl || material?.link || '';
}

function MaterialRow({ material, index }) {
  const title = getMaterialTitle(material);
  const type = getMaterialType(material);
  const url = getMaterialUrl(material);
  const materialId = material?._id || material?.id || index;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-[#343640] bg-[#191A21] p-4 transition-colors hover:border-[#454650] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-[#CDB5F7]">
          {getMaterialIcon(type)}
        </div>

        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold text-[#EAEAE6]">
            {title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#858590]">
            <span className="rounded-md border border-[#454650] px-2 py-1">
              {type}
            </span>

            {material?.module && (
              <span>
                Module: {typeof material.module === 'string'
                  ? material.module
                  : material.module?.title || material.module?.name || 'Assigned module'}
              </span>
            )}

            {(material?.createdAt || material?.uploadedAt) && (
              <span>
                Added {formatDate(material.createdAt || material.uploadedAt)}
              </span>
            )}
          </div>

          {material?.description && (
            <p className="mt-2 break-words text-sm leading-5 text-[#A5A6B0]">
              {material.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#454650] px-3 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
            aria-label={`Open ${title}`}
          >
            Open resource
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M11 3.75h5.25V9M16 4l-7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 11.25v4A1.75 1.75 0 0 1 12.25 17h-7.5A1.75 1.75 0 0 1 3 15.25v-7.5A1.75 1.75 0 0 1 4.75 6h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </a>
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-lg border border-[#343640] px-3 py-2 text-xs text-[#858590]">
            Resource link unavailable
          </span>
        )}

        <Link
          to="/faculty/courses/materials/details"
          state={{
            material,
            materialId,
            courseId: material?.courseId,
          }}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#CDB5F7]/10 px-3 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Details
        </Link>
      </div>
    </article>
  );
}

export default function FacultyCourseDetails() {
  const location = useLocation();
  const course = location.state?.course || null;

  const [materialSearch, setMaterialSearch] = useState('');
  const [materialType, setMaterialType] = useState('all');

  const courseTitle = getCourseTitle(course);

  const materials = Array.isArray(course?.materials)
    ? course.materials
    : Array.isArray(course?.learningMaterials)
      ? course.learningMaterials
      : Array.isArray(course?.resources)
        ? course.resources
        : [];

  const filteredMaterials = useMemo(() => {
    const query = materialSearch.trim().toLowerCase();

    return materials.filter((material) => {
      const title = getMaterialTitle(material);
      const type = getMaterialType(material);
      const description = material?.description || '';
      const moduleName =
        typeof material?.module === 'string'
          ? material.module
          : material?.module?.title || material?.module?.name || '';

      const matchesSearch =
        !query ||
        [title, type, description, moduleName]
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesType =
        materialType === 'all' ||
        type.toLowerCase().includes(materialType);

      return matchesSearch && matchesType;
    });
  }, [materials, materialSearch, materialType]);

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-[1600px]">
        <PageHeader
          eyebrow="Teaching workspace"
          title="Course details"
          description="View course information and its learning materials."
          breadcrumbs={[
            { label: 'Faculty', to: '/faculty/dashboard' },
            { label: 'Courses', to: '/faculty/courses' },
            { label: 'Course details' },
          ]}
        />

        <EmptyState
          title="No course selected"
          description="Open a course from your Faculty Courses page to view its details and available learning materials. This page does not create sample course records."
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

  const courseCode = course.code || course.courseCode || course.subjectCode;
  const department = course.department?.name || course.departmentName || course.department;
  const semester = course.semester?.name || course.semesterName || course.semester;
  const section = course.section?.name || course.sectionName || course.section;
  const status = course.status || course.publicationStatus;
  const instructor = course.faculty?.name || course.facultyName || course.instructor?.name;
  const description = course.description || course.overview || course.about;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title={courseTitle}
        description="Course overview, assigned academic information and learning resources."
        breadcrumbs={[
          { label: 'Faculty', to: '/faculty/dashboard' },
          { label: 'Courses', to: '/faculty/courses' },
          { label: 'Course details' },
        ]}
        actions={
          <Link
            to="/faculty/courses"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] bg-[#26272B] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#303139] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Back to courses
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#858590]">
            Course code
          </p>
          <p className="mt-3 break-words text-lg font-semibold text-[#EAEAE6]">
            {courseCode || 'Not provided'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#858590]">
            Department
          </p>
          <p className="mt-3 break-words text-lg font-semibold text-[#EAEAE6]">
            {department || 'Not provided'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#858590]">
            Semester
          </p>
          <p className="mt-3 break-words text-lg font-semibold text-[#EAEAE6]">
            {semester || 'Not provided'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#858590]">
            Learning materials
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
            {materials.length}
          </p>
        </div>
      </section>

      <SectionCard
        title="Course overview"
        description="Academic information available for this course."
      >
        {description ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#B8B8C2]">
            {description}
          </p>
        ) : (
          <p className="text-sm leading-6 text-[#858590]">
            A course description has not been provided in the available course data.
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#343640] pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-[#858590]">Faculty / Instructor</p>
            <p className="mt-1 break-words text-sm font-medium text-[#EAEAE6]">
              {instructor || 'Not provided'}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#858590]">Class / Section</p>
            <p className="mt-1 break-words text-sm font-medium text-[#EAEAE6]">
              {section || 'Not provided'}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#858590]">Course status</p>
            <p className="mt-1 break-words text-sm font-medium capitalize text-[#EAEAE6]">
              {status || 'Not provided'}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Course materials"
        description="Search and review the learning resources associated with this course."
        action={
          <span className="rounded-lg border border-[#454650] bg-[#191A21] px-3 py-1.5 text-xs font-semibold text-[#B8B8C2]">
            {materials.length} {materials.length === 1 ? 'resource' : 'resources'}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div>
            <label
              htmlFor="faculty-material-search"
              className="mb-2 block text-xs font-semibold text-[#A5A6B0]"
            >
              Search materials
            </label>

            <input
              id="faculty-material-search"
              type="search"
              value={materialSearch}
              onChange={(event) => setMaterialSearch(event.target.value)}
              placeholder="Search by title, type or module..."
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-4 py-2.5 text-sm text-[#EAEAE6] outline-none transition-colors placeholder:text-[#777783] focus-visible:border-[#CDB5F7] focus-visible:ring-2 focus-visible:ring-[#CDB5F7]/30"
            />
          </div>

          <div>
            <label
              htmlFor="faculty-material-type"
              className="mb-2 block text-xs font-semibold text-[#A5A6B0]"
            >
              Resource type
            </label>

            <select
              id="faculty-material-type"
              value={materialType}
              onChange={(event) => setMaterialType(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6] outline-none focus-visible:border-[#CDB5F7] focus-visible:ring-2 focus-visible:ring-[#CDB5F7]/30"
            >
              <option value="all">All types</option>
              <option value="pdf">PDF documents</option>
              <option value="video">Videos</option>
              <option value="notes">Notes</option>
              <option value="link">External links</option>
              <option value="presentation">Presentations</option>
            </select>
          </div>
        </div>

        <div className="mt-5" aria-live="polite">
          <p className="mb-4 text-xs text-[#858590]">
            Showing {filteredMaterials.length} of {materials.length} resources
          </p>

          {filteredMaterials.length > 0 ? (
            <div className="space-y-3">
              {filteredMaterials.map((material, index) => (
                <MaterialRow
                  key={material?._id || material?.id || index}
                  material={material}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={materials.length === 0 ? 'No course materials available' : 'No matching materials'}
              description={
                materials.length === 0
                  ? 'Learning resources will appear here when the selected course provides material records. Upload functionality will be handled by its dedicated workflow.'
                  : 'Try another search term or resource type to find the material you are looking for.'
              }
              action={
                materials.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMaterialSearch('');
                      setMaterialType('all');
                    }}
                    className="rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                  >
                    Clear material filters
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/5 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#EAEAE6]">
          Material access and integration
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
          This page displays only materials supplied through the selected
          course data. It does not create example resources or fabricate
          download links. Actual listing and upload integration must follow
          the verified backend API contract.
        </p>
      </div>
    </div>
  );
}