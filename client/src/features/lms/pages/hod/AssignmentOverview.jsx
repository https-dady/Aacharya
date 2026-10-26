import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

export default function AssignmentOverview() {
  const [searchTerm, setSearchTerm] = useState('');

  // Actual assignment records will be connected during backend integration.
  const assignments = [];

  const filteredAssignments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return assignments;
    }

    return assignments.filter((assignment) =>
      [
        assignment.title,
        assignment.courseName,
        assignment.courseCode,
        assignment.facultyName,
        assignment.sectionName,
        assignment.batchName,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [searchTerm]);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Assignment Management"
        description="Review course assignments, deadlines, faculty allocations, and submission progress."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Academic Oversight' },
          { label: 'Assignments' },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/hod/courses">
              <ActionButton variant="secondary">
                View Courses
              </ActionButton>
            </Link>

            <Link to="/hod/quizzes">
              <ActionButton variant="secondary">
                View Quizzes
              </ActionButton>
            </Link>

            <Link to="/hod/results">
              <ActionButton variant="secondary">
                View Results
              </ActionButton>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Total Assignments
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Awaiting actual assignment records
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Pending Reviews
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Awaiting submission and review data
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Upcoming Deadlines
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Awaiting assignment due dates
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="ASSIGNMENT DIRECTORY"
          title="All Assignments"
          description="Search assignments by title, course, faculty, batch, or section."
        >
          <div className="mb-5 max-w-md">
            <SearchInput
              name="assignmentSearch"
              label="Search assignments"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search assignment, course, or faculty..."
            />
          </div>

          {filteredAssignments.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim()
                  ? 'No matching assignments'
                  : 'Assignment records unavailable'
              }
              description={
                searchTerm.trim()
                  ? 'Try a different assignment title, course, faculty, or section.'
                  : 'Assignment records will appear here once the actual assignment data source is connected.'
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
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      Assignment
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Faculty
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Section
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Due Date
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
                  {filteredAssignments.map((assignment, index) => (
                    <tr
                      key={assignment.id || assignment._id || index}
                      className="bg-[#191A21] hover:bg-[#202129]"
                    >
                      <td className="px-4 py-4 font-medium text-[#EAEAE6]">
                        {assignment.title || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {assignment.courseName ||
                          assignment.courseCode ||
                          '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {assignment.facultyName || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {assignment.sectionName || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {assignment.dueDate || '—'}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-[#454650] px-2.5 py-1 text-xs text-[#C8C8D0]">
                          {assignment.status || 'Unknown'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          to="/hod/assignments/details"
                          state={{ assignment }}
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
          Assignment data status
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This page currently provides the assignment directory interface.
          Assignment creation, student submission tracking, grading
          oversight, and deadline reporting will be connected according
          to the existing backend contracts.
        </p>
      </div>
    </div>
  );
}