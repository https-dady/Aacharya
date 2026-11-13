import { Link, useLocation } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function ReferenceList({ title, items }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#EAEAE6]">
        {title}
      </h3>

      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2"
            >
              <p className="text-sm font-medium text-[#EAEAE6]">
                {item.name || item.code || 'Unnamed'}
              </p>

              {item.code && item.name && (
                <p className="mt-1 text-xs text-[#858590]">
                  {item.code}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#858590]">
          No {title.toLowerCase()} assigned to this course.
        </p>
      )}
    </div>
  );
}

export default function FacultyCourseDetails() {
  const location = useLocation();
  const course = location.state?.course || null;

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="Course Details"
          description="Review the academic information for your assigned course."
          breadcrumbs={[
            { label: 'Faculty', to: '/faculty/dashboard' },
            { label: 'Courses', to: '/faculty/courses' },
            { label: 'Course Details' },
          ]}
        />

        <div className="mt-6">
          <EmptyState
            title="No course selected"
            description="Select a course from your assigned course directory to view its details."
            action={
              <Link
                to="/faculty/courses"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2.5 text-sm font-semibold text-[#14161C] transition hover:bg-[#DDCBFF]"
              >
                Back to My Courses
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const courseTitle = course.title || 'Untitled Course';

  const instructorName =
    course.instructor?.fullName
    || 'Not assigned';

  const departmentName =
    course.department?.name
    || 'Not available';

  const batches = Array.isArray(course.batches)
    ? course.batches
    : [];

  const sections = Array.isArray(course.sections)
    ? course.sections
    : [];

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title={courseTitle}
        description="Review your assigned course information, instructor details, batches and sections."
        breadcrumbs={[
          { label: 'Faculty', to: '/faculty/dashboard' },
          { label: 'Courses', to: '/faculty/courses' },
          { label: 'Course Details' },
        ]}
        actions={
          <Link
            to="/faculty/courses"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#EAEAE6] transition hover:border-[#CDB5F7] hover:text-[#CDB5F7]"
          >
            Back to Courses
          </Link>
        }
      />

      <section className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-lg font-bold text-[#CDB5F7]">
            {course.code?.slice(0, 2)?.toUpperCase() || 'CR'}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#92929F]">
              {course.code || 'Course code unavailable'}
            </p>

            <h2 className="mt-2 break-words text-2xl font-semibold text-[#EAEAE6]">
              {courseTitle}
            </h2>

            <p className="mt-1 text-sm text-[#A5A6B0]">
              {departmentName}
            </p>
          </div>

          <span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            {course.status || 'ACTIVE'}
          </span>
        </div>
      </section>

      <SectionCard
        eyebrow="COURSE INFORMATION"
        title="Academic Overview"
        description="Course information retrieved from your assigned academic records."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem
            label="Course Name"
            value={course.title}
          />

          <DetailItem
            label="Course Code"
            value={course.code}
          />

          <DetailItem
            label="Department"
            value={departmentName}
          />

          <DetailItem
            label="Semester"
            value={course.semester}
          />

          <DetailItem
            label="Category"
            value={course.category}
          />

          <DetailItem
            label="Credits"
            value={course.credits}
          />

          <DetailItem
            label="Assigned Faculty"
            value={instructorName}
          />

          <DetailItem
            label="Course Status"
            value={course.status}
          />

          <DetailItem
            label="Course ID"
            value={course.id}
          />
        </div>

        <div className="mt-5 border-t border-[#343640] pt-5">
          <h3 className="text-sm font-semibold text-[#EAEAE6]">
            Course Description
          </h3>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#A5A6B0]">
            {course.description || 'No course description has been provided.'}
          </p>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="ACADEMIC ALLOCATION"
        title="Assigned Batches & Sections"
        description="Review the student groups associated with this course."
      >
        <div className="space-y-6">
          <ReferenceList
            title="Assigned Batches"
            items={batches}
          />

          <div className="border-t border-[#343640]" />

          <ReferenceList
            title="Assigned Sections"
            items={sections}
          />
        </div>
      </SectionCard>

      <section className="rounded-2xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/5 p-5">
        <h2 className="text-sm font-semibold text-[#EAEAE6]">
          Course Access
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
          This is a read-only view of your assigned course information.
          Course allocation and institutional course configuration remain
          under the appropriate administrative permissions.
        </p>
      </section>
    </div>
  );
}