import { Link, useLocation } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#343640] bg-[#191A21] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-[#EAEAE6]">
        {value || 'Not available'}
      </p>
    </div>
  );
}

export default function CourseDetails() {
  const location = useLocation();
  const course = location.state?.course ?? null;

  const courseName =
    course?.name || course?.courseName || 'Course Details';

  const courseCode =
    course?.code || course?.courseCode;

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Course Details"
        description="Review course information and its academic associations."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Courses', to: '/hod/courses' },
          { label: 'Course Details' },
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
          description="No course record was provided to this page. Open a course from the directory when actual course records are available."
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
                : 'Academic course information'
            }
            action={
              <span className="inline-flex rounded-full border border-[#454650] bg-[#292A32] px-3 py-1.5 text-xs font-medium text-[#D0D0D8]">
                {course.status || 'Status unavailable'}
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField
                label="Course Name"
                value={courseName}
              />

              <DetailField
                label="Course Code"
                value={courseCode}
              />

              <DetailField
                label="Faculty"
                value={course.facultyName}
              />

              <DetailField
                label="Batch"
                value={course.batchName}
              />

              <DetailField
                label="Section"
                value={course.sectionName}
              />

              <DetailField
                label="Credits"
                value={
                  course.credits !== undefined &&
                  course.credits !== null
                    ? String(course.credits)
                    : null
                }
              />

              <DetailField
                label="Semester"
                value={course.semester}
              />

              <DetailField
                label="Course ID"
                value={course.id || course._id}
              />
            </div>

            {course.description && (
              <div className="mt-4 rounded-xl border border-[#343640] bg-[#191A21] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#D0D0D8]">
                  {course.description}
                </p>
              </div>
            )}
          </SectionCard>

          <div className="mt-5">
            <SectionCard
              eyebrow="ACADEMIC OPERATIONS"
              title="Course Resources"
              description="Review the academic activities associated with this course."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                  <h3 className="text-sm font-semibold text-[#EAEAE6]">
                    Assignments
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                    Assignment records will be available when the
                    corresponding academic data is connected.
                  </p>

                  <Link
                    to="/hod/assignments"
                    className="mt-4 inline-block text-sm font-medium text-[#C4B5FD] hover:text-[#DDD3FF]"
                  >
                    View Assignments
                  </Link>
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                  <h3 className="text-sm font-semibold text-[#EAEAE6]">
                    Quizzes
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                    Quiz records will be available through the
                    academic assessment module.
                  </p>

                  <Link
                    to="/hod/quizzes"
                    className="mt-4 inline-block text-sm font-medium text-[#C4B5FD] hover:text-[#DDD3FF]"
                  >
                    View Quizzes
                  </Link>
                </div>

                <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
                  <h3 className="text-sm font-semibold text-[#EAEAE6]">
                    Results
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                    Course assessment results will be available
                    when the relevant records are connected.
                  </p>

                  <Link
                    to="/hod/results"
                    className="mt-4 inline-block text-sm font-medium text-[#C4B5FD] hover:text-[#DDD3FF]"
                  >
                    View Results
                  </Link>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="mt-5 flex justify-end">
            <Link
              to="/hod/courses/edit"
              state={{ course }}
            >
              <ActionButton>
                Edit Course Details
              </ActionButton>
            </Link>
          </div>
        </>
      )}

      <p className="mt-5 text-xs leading-5 text-[#777986]">
        This page displays information supplied through navigation.
        Course retrieval, editing, and persistence will be connected
        during backend integration.
      </p>
    </div>
  );
}