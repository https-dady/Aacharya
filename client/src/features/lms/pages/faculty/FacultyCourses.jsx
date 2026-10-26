import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

export default function FacultyCourses() {
  const [searchTerm, setSearchTerm] = useState('');

  // Actual course records will be connected when the matching
  // faculty course API contract is available.
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
        course.description,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [searchTerm]);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="My Courses"
        description="Review your assigned courses and access course-related academic activities."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'My Courses',
          },
        ]}
        actions={
          <Link to="/faculty/dashboard">
            <ActionButton variant="secondary">
              Back to Dashboard
            </ActionButton>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Assigned Courses
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            The count will appear when actual course assignments
            are available.
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Course Records
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {filteredCourses.length}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Matching records currently available in this view.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="ACADEMIC WORKSPACE"
          title="Course Directory"
          description="Find your assigned courses by course name, code, or description."
        >
          <div className="mb-5 max-w-lg">
            <SearchInput
              name="facultyCourseSearch"
              label="Search courses"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by course name or code..."
            />
          </div>

          {filteredCourses.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim()
                  ? 'No matching courses'
                  : 'Course records are not available yet'
              }
              description={
                searchTerm.trim()
                  ? 'Try a different course name or course code.'
                  : 'Assigned courses will appear here when the course data source is connected. No sample records are being displayed.'
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
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Course Name
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Course Code
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Description
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredCourses.map((course, index) => (
                    <tr
                      key={course.id || course._id || index}
                      className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                    >
                      <td className="px-4 py-4 font-medium text-[#EAEAE6]">
                        {course.name || course.courseName || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {course.code || course.courseCode || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#A5A6B0]">
                        {course.description || '—'}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-[#454650] px-2.5 py-1 text-xs text-[#C8C8D0]">
                          {course.status || 'Unknown'}
                        </span>
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
          Course management
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This page establishes the course-listing interface. Course
          details, learning materials, and course creation or editing
          interfaces will be developed as separate Faculty workflows.
          Existing backend contracts will be integrated when they
          support the corresponding operations.
        </p>
      </div>
    </div>
  );
}