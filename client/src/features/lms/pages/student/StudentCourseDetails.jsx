import { Link, useParams } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function StudentCourseDetails() {
  const { courseId } = useParams();

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="Course Details"
        description="Review course information, learning materials, assignments, and academic activities."
        breadcrumbs={[
          {
            label: 'Dashboard',
            to: '/student/dashboard',
          },
          {
            label: 'My Courses',
            to: '/student/courses',
          },
          {
            label: 'Course Details',
          },
        ]}
        actions={
          <Link
            to="/student/courses"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:border-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            ← Back to Courses
          </Link>
        }
      />

      <SectionCard
        eyebrow="COURSE OVERVIEW"
        title="Course Information"
        description="Course details will be loaded from the authenticated student's enrolled-course records."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
              Course Reference
            </p>

            <p className="mt-2 break-all text-sm font-medium text-[#EAEAE6]">
              {courseId || 'Unavailable'}
            </p>
          </div>

          <div className="rounded-xl border border-[#343640] bg-[#191A21] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#858590]">
              Course Status
            </p>

            <p className="mt-2 text-sm font-medium text-[#A5A6B0]">
              Awaiting course data
            </p>
          </div>
        </div>

        <div className="mt-5">
          <EmptyState
            title="Course information unavailable"
            description="Course descriptions, faculty details, learning materials, and course activities will appear here once the course-details API is integrated."
            icon={
              <span aria-hidden="true" className="text-2xl">
                ▤
              </span>
            }
          />
        </div>
      </SectionCard>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          to="/student/timetable"
          className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 transition-colors hover:border-[#CDB5F7]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          <span className="text-lg text-[#CDB5F7]" aria-hidden="true">
            ◷
          </span>

          <h2 className="mt-3 text-sm font-semibold text-[#EAEAE6]">
            Class Timetable
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
            View your weekly class schedule.
          </p>
        </Link>

        <Link
          to="/student/assignments"
          className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 transition-colors hover:border-[#CDB5F7]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          <span className="text-lg text-[#CDB5F7]" aria-hidden="true">
            ▣
          </span>

          <h2 className="mt-3 text-sm font-semibold text-[#EAEAE6]">
            Assignments
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
            Review coursework and submission deadlines.
          </p>
        </Link>

        <Link
          to="/student/quizzes"
          className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 transition-colors hover:border-[#CDB5F7]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          <span className="text-lg text-[#CDB5F7]" aria-hidden="true">
            ✎
          </span>

          <h2 className="mt-3 text-sm font-semibold text-[#EAEAE6]">
            Quizzes
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
            View available assessments.
          </p>
        </Link>
      </div>
    </div>
  );
}