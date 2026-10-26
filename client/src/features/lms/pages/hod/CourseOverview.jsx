import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

export default function CourseOverview() {
  const [searchTerm, setSearchTerm] = useState('');

  // Actual course records will be connected during backend integration.
  const courses = [];

  const filteredCourses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return courses;
    }

    return courses.filter((course) =>
      [
        course.name,
        course.courseName,
        course.code,
        course.courseCode,
        course.facultyName,
        course.batchName,
        course.sectionName,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [searchTerm]);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Course Management"
        description="Review department courses and monitor their academic allocation."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Academic Oversight' },
          { label: 'Courses' },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/hod/assignments">
              <ActionButton variant="secondary">
                Assignments
              </ActionButton>
            </Link>

            <Link to="/hod/quizzes">
              <ActionButton variant="secondary">
                Quizzes
              </ActionButton>
            </Link>

            <Link to="/hod/results">
              <ActionButton variant="secondary">
                Results
              </ActionButton>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Department Courses
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Awaiting actual course records
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Faculty Allocations
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Awaiting course assignments
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Active Sections
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Awaiting section allocations
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="COURSE DIRECTORY"
          title="All Department Courses"
          description="Search courses by name, code, faculty, batch, or section."
        >
          <div className="mb-5 max-w-md">
            <SearchInput
              name="courseSearch"
              label="Search courses"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search course, faculty, or section..."
            />
          </div>

          {filteredCourses.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim()
                  ? 'No matching courses'
                  : 'Course records unavailable'
              }
              description={
                searchTerm.trim()
                  ? 'Try a different course name, course code, or faculty name.'
                  : 'Actual course records will appear here once the course data source is connected.'
              }
              action={
                searchTerm.trim() ? (
                  <ActionButton
                    variant="secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </ActionButton>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Course Code
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Faculty
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Batch
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Section
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Status
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredCourses.map((course, index) => (
                    <tr
                      key={course.id || course._id || index}
                      className="bg-[#191A21] hover:bg-[#202129]"
                    >
                      <td className="px-4 py-4 font-medium text-[#EAEAE6]">
                        {course.name || course.courseName || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {course.code || course.courseCode || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {course.facultyName || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {course.batchName || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {course.sectionName || '—'}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-[#454650] px-2.5 py-1 text-xs text-[#C8C8D0]">
                          {course.status || 'Unknown'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          to="/hod/courses/details"
                          state={{ course }}
                          className="font-medium text-[#C4B5FD] hover:text-[#DDD3FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9A4FF]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Course data status
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This page currently provides the course directory interface.
          Course creation, faculty allocation, and course-section
          associations will follow the existing backend contracts during
          the integration phase.
        </p>
      </div>
    </div>
  );
}