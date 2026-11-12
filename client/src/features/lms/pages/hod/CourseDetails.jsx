import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function getReferenceId(reference) {
  if (!reference) {
    return '';
  }

  if (typeof reference === 'string') {
    return reference;
  }

  return String(reference.id ?? reference._id ?? '');
}

function getReferenceName(reference) {
  if (!reference) {
    return '';
  }

  if (typeof reference === 'string') {
    return reference;
  }

  return (
    reference.name ||
    reference.fullName ||
    reference.code ||
    ''
  );
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
          ? value
          : 'Not available'}
      </p>
    </div>
  );
}

function ReferenceList({
  title,
  references,
  emptyMessage,
}) {
  const items = Array.isArray(references)
    ? references
    : [];

  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
        {title}
      </p>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[#9697A2]">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((reference, index) => {
            const id = getReferenceId(reference);

            const name =
              getReferenceName(reference) ||
              `Assigned record ${index + 1}`;

            return (
              <span
                key={id || `${name}-${index}`}
                className="rounded-lg border border-[#454650] bg-[#26272B] px-3 py-2 text-xs font-medium text-[#D0D0D8]"
              >
                {name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseStatus({ status }) {
  const normalizedStatus = String(
    status || '',
  ).toUpperCase();

  const isActive = normalizedStatus === 'ACTIVE';

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
        isActive
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-[#454650] bg-[#292A32] text-[#D0D0D8]'
      }`}
    >
      {normalizedStatus || 'STATUS UNAVAILABLE'}
    </span>
  );
}

export default function CourseDetails() {
  const location = useLocation();

  const course = location.state?.course ?? null;

  const courseName = course?.title || 'Course Details';

  const courseCode = course?.code || '';

  const facultyName =
    course?.facultyName ||
    getReferenceName(course?.faculty);

  const courseId = course?.id || course?._id || '';

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Course Details"
        description="Review department course information and its academic associations."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Courses',
            to: '/hod/courses',
          },
          {
            label: 'Course Details',
          },
        ]}
        actions={
          <Link to="/hod/courses">
            <ActionButton variant="secondary">
              Back to Courses
            </ActionButton>
          </Link>
        }
      />

      {!course ? (
        <EmptyState
          title="Course record unavailable"
          description="This page requires a course record from the department course directory. Return to the directory and open the course again."
          action={
            <Link to="/hod/courses">
              <ActionButton variant="secondary">
                Return to Course Directory
              </ActionButton>
            </Link>
          }
        />
      ) : (
        <>
          <SectionCard
            eyebrow="COURSE OVERVIEW"
            title={courseName}
            description={
              courseCode
                ? `Course code: ${courseCode}`
                : 'Department academic course information'
            }
            action={
              <CourseStatus status={course.status} />
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField
                label="Course Title"
                value={course.title}
              />

              <DetailField
                label="Course Code"
                value={course.code}
              />

              <DetailField
                label="Category"
                value={course.category}
              />

              <DetailField
                label="Credits"
                value={course.credits}
              />

              <DetailField
                label="Semester"
                value={course.semester}
              />

              <DetailField
                label="Assigned Faculty"
                value={facultyName}
              />

              <DetailField
                label="Course ID"
                value={courseId}
              />

              <DetailField
                label="Created On"
                value={formatDate(course.createdAt)}
              />

              <DetailField
                label="Last Updated"
                value={formatDate(course.updatedAt)}
              />
            </div>

            <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
                Course Description
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#D0D0D8]">
                {course.description || 'No course description provided.'}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="ACADEMIC ASSOCIATIONS"
            title="Assigned Batches & Sections"
            description="Review the batches and sections associated with this course."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ReferenceList
                title="Assigned Batches"
                references={course.batches}
                emptyMessage="No batches are currently assigned."
              />

              <ReferenceList
                title="Assigned Sections"
                references={course.sections}
                emptyMessage="No sections are currently assigned."
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="ACADEMIC OPERATIONS"
            title="Related Academic Modules"
            description="Navigate to the available department academic modules."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                <h3 className="text-sm font-semibold text-[#EAEAE6]">
                  Assignments
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                  Review department assignment records.
                </p>

                <Link
                  to="/hod/assignments"
                  className="mt-4 inline-block text-sm font-medium text-[#CDB5F7] transition hover:text-[#DDCEFA]"
                >
                  View Assignments
                </Link>
              </div>

              <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                <h3 className="text-sm font-semibold text-[#EAEAE6]">
                  Quizzes
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                  Review department assessment activities.
                </p>

                <Link
                  to="/hod/quizzes"
                  className="mt-4 inline-block text-sm font-medium text-[#CDB5F7] transition hover:text-[#DDCEFA]"
                >
                  View Quizzes
                </Link>
              </div>

              <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                <h3 className="text-sm font-semibold text-[#EAEAE6]">
                  Results
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                  Review department assessment results.
                </p>

                <Link
                  to="/hod/results"
                  className="mt-4 inline-block text-sm font-medium text-[#CDB5F7] transition hover:text-[#DDCEFA]"
                >
                  View Results
                </Link>
              </div>
            </div>
          </SectionCard>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-200">
              Course modification
            </p>

            <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
              This page currently provides read-only course details.
              Course modification is not exposed because the existing
              backend does not provide a supported course update endpoint.
            </p>
          </div>
        </>
      )}
    </div>
  );
}