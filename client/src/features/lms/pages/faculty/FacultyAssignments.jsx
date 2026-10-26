import { useMemo, useState } from 'react';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const ASSIGNMENT_STATUSES = [
  { value: 'all', label: 'All Assignments' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
];

const INITIAL_ASSIGNMENTS = [];

function getAssignmentStatus(assignment) {
  return String(assignment.status ?? '').toLowerCase();
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getStatusStyles(status) {
  switch (status) {
    case 'published':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'closed':
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    case 'draft':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';

    default:
      return 'border-[#454650] bg-[#26272B] text-[#C8C8D0]';
  }
}

export default function FacultyAssignments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Real assignment records will be connected after the backend
  // assignment API and its response contract are available.
  const assignments = INITIAL_ASSIGNMENTS;

  const filteredAssignments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch =
        !query ||
        [
          assignment.title,
          assignment.description,
          assignment.courseName,
          assignment.courseCode,
          assignment.sectionName,
          assignment.batchName,
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        );

      const matchesStatus =
        selectedStatus === 'all' ||
        getAssignmentStatus(assignment) === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [assignments, searchTerm, selectedStatus]);

  const totalAssignments = assignments.length;

  const publishedAssignments = assignments.filter(
    (assignment) => getAssignmentStatus(assignment) === 'published',
  ).length;

  const draftAssignments = assignments.filter(
    (assignment) => getAssignmentStatus(assignment) === 'draft',
  ).length;

  const closedAssignments = assignments.filter(
    (assignment) => getAssignmentStatus(assignment) === 'closed',
  ).length;

  function clearFilters() {
    setSearchTerm('');
    setSelectedStatus('all');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Assignments"
        description="Manage coursework, review assignment deadlines, and track student submissions."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Assignments',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Total Assignments
          </p>

          <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
            {totalAssignments}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Across your assigned courses
          </p>
        </section>

        <section className="rounded-2xl border border-emerald-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Published
          </p>

          <p className="mt-3 text-3xl font-semibold text-emerald-300">
            {publishedAssignments}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Available to students
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Drafts
          </p>

          <p className="mt-3 text-3xl font-semibold text-amber-200">
            {draftAssignments}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Not yet published
          </p>
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Closed
          </p>

          <p className="mt-3 text-3xl font-semibold text-red-300">
            {closedAssignments}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            No longer accepting submissions
          </p>
        </section>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="ASSIGNMENT DIRECTORY"
          title="Your Assignments"
          description="Find assignments by title, course, batch, or section and filter them by status."
        >
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <SearchInput
                name="facultyAssignmentSearch"
                label="Search assignments"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search title, course, or section..."
              />

              <div>
                <label
                  htmlFor="faculty-assignment-status"
                  className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                >
                  Assignment Status
                </label>

                <select
                  id="faculty-assignment-status"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value)
                  }
                  className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                >
                  {ASSIGNMENT_STATUSES.map((status) => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
              <p
                className="text-sm text-[#9697A2]"
                aria-live="polite"
              >
                Showing {filteredAssignments.length} of{' '}
                {totalAssignments} assignments
              </p>

              {(searchTerm || selectedStatus !== 'all') && (
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </ActionButton>
              )}
            </div>

            {filteredAssignments.length === 0 ? (
              <EmptyState
                title={
                  searchTerm.trim() || selectedStatus !== 'all'
                    ? 'No matching assignments'
                    : 'No assignment records available'
                }
                description={
                  searchTerm.trim() || selectedStatus !== 'all'
                    ? 'Try another search term or select a different assignment status.'
                    : 'Your assigned coursework will appear here once assignment data is available from the backend.'
                }
                action={
                  searchTerm.trim() || selectedStatus !== 'all' ? (
                    <ActionButton
                      variant="secondary"
                      onClick={clearFilters}
                    >
                      Reset Filters
                    </ActionButton>
                  ) : null
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#343640]">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <caption className="sr-only">
                    Faculty assignment directory
                  </caption>

                  <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 font-medium"
                      >
                        Assignment
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 font-medium"
                      >
                        Course
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 font-medium"
                      >
                        Section / Batch
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 font-medium"
                      >
                        Due Date
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 font-medium"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#343640]">
                    {filteredAssignments.map((assignment, index) => {
                      const status = getAssignmentStatus(assignment);

                      return (
                        <tr
                          key={assignment.id ?? assignment._id ?? index}
                          className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium text-[#EAEAE6]">
                              {assignment.title || 'Untitled assignment'}
                            </p>

                            {assignment.description && (
                              <p className="mt-1 max-w-xs truncate text-xs text-[#9697A2]">
                                {assignment.description}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 text-[#D0D0D8]">
                            <p>
                              {assignment.courseName ||
                                assignment.courseCode ||
                                '—'}
                            </p>

                            {assignment.courseName &&
                              assignment.courseCode && (
                                <p className="mt-1 text-xs text-[#9697A2]">
                                  {assignment.courseCode}
                                </p>
                              )}
                          </td>

                          <td className="px-4 py-4 text-[#D0D0D8]">
                            {assignment.sectionName ||
                              assignment.batchName ||
                              '—'}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                            {formatDate(assignment.dueDate)}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={[
                                'inline-flex rounded-full border px-2.5 py-1',
                                'text-xs font-medium',
                                getStatusStyles(status),
                              ].join(' ')}
                            >
                              {status
                                ? status.charAt(0).toUpperCase() +
                                  status.slice(1)
                                : 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <section className="mt-5 rounded-2xl border border-[#343640] bg-[#191A21] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-5 w-5"
            >
              <path
                d="M8 4h8M8 8h8M8 12h5"
                strokeLinecap="round"
              />
              <path
                d="M6 2.75h9.5L20 7.25v13A1.75 1.75 0 0 1 18.25 22h-12A1.75 1.75 0 0 1 4.5 20.25V4.5A1.75 1.75 0 0 1 6.25 2.75Z"
                strokeLinejoin="round"
              />
              <path
                d="M14.5 3v4.5H19"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#EAEAE6]">
              Assignment workflow
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Assignment creation, editing, student submissions, grading,
              and detailed submission status will be developed as separate
              Faculty workflows. They will use confirmed backend contracts
              when those endpoints are available.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}