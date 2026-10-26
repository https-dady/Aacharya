import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const STUDENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function SummaryCard({ label, value, description, icon }) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 transition-colors hover:border-[#CDB5F7]/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#A5A6B0]">{label}</p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#858590]">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-[#CDB5F7]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function StudentIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <circle cx="9" cy="8" r="3.25" />
      <path
        d="M3.5 19v-1.25A4.75 4.75 0 0 1 8.25 13h1.5a4.75 4.75 0 0 1 4.75 4.75V19"
        strokeLinecap="round"
      />
      <path
        d="M16 5.2a3.25 3.25 0 0 1 0 6.1M17 13.5a4.75 4.75 0 0 1 3.5 4.58V19"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-4 w-4"
    >
      <circle cx="8.75" cy="8.75" r="5.75" />
      <path d="m13 13 4 4" strokeLinecap="round" />
    </svg>
  );
}

function FilterField({ label, value, onChange, options, id }) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold text-[#B8B8C2]"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={onChange}
        className={[
          'min-h-11 w-full rounded-xl border border-[#3B3C43]',
          'bg-[#14161C] px-3 py-2.5 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20',
        ].join(' ')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StudentTable({ students, onClearFilters, hasActiveFilters }) {
  if (students.length === 0) {
    return (
      <EmptyState
        title="Student records are not available yet"
        description="The assigned-students data source has not been connected to this page. Once the real backend integration is available, students assigned to your batches and sections will appear here. No sample student records are displayed."
        className="border-0 bg-transparent py-12"
        action={
          hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className={[
                'inline-flex min-h-10 items-center justify-center',
                'rounded-xl border border-[#454650] bg-[#26272B]',
                'px-4 py-2 text-sm font-semibold text-[#EAEAE6]',
                'transition-colors hover:bg-[#303139]',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[#CDB5F7]',
              ].join(' ')}
            >
              Clear filters
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-[#343640] bg-[#17181F] text-xs uppercase tracking-wide text-[#858590]">
          <tr>
            <th scope="col" className="px-5 py-4 font-semibold">
              Student
            </th>
            <th scope="col" className="px-5 py-4 font-semibold">
              Student ID
            </th>
            <th scope="col" className="px-5 py-4 font-semibold">
              Batch
            </th>
            <th scope="col" className="px-5 py-4 font-semibold">
              Section
            </th>
            <th scope="col" className="px-5 py-4 font-semibold">
              Status
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#343640]">
          {students.map((student) => (
            <tr
              key={student.id}
              className="transition-colors hover:bg-[#26272B]/60"
            >
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-sm font-semibold text-[#CDB5F7]">
                    {student.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  <div className="min-w-0">
                    <p className="break-words font-medium text-[#EAEAE6]">
                      {student.name || 'Unnamed student'}
                    </p>

                    <p className="mt-1 break-all text-xs text-[#858590]">
                      {student.email || 'Email not available'}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 text-[#B8B8C2]">
                {student.studentId || '—'}
              </td>

              <td className="px-5 py-4 text-[#B8B8C2]">
                {student.batch || '—'}
              </td>

              <td className="px-5 py-4 text-[#B8B8C2]">
                {student.section || '—'}
              </td>

              <td className="px-5 py-4">
                <span
                  className={[
                    'inline-flex rounded-full px-2.5 py-1',
                    'text-xs font-semibold capitalize',
                    student.status === 'active'
                      ? 'bg-emerald-400/10 text-emerald-300'
                      : 'bg-[#E5DF98]/10 text-[#E5DF98]',
                  ].join(' ')}
                >
                  {student.status || 'Unknown'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MentorStudents() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  /*
   * The latest inspected project baseline does not establish a confirmed
   * mentor assigned-students API contract.
   *
   * Keep the collection empty until the real API integration is implemented.
   * Do not replace this with fabricated student records.
   */
  const assignedStudents = [];

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return assignedStudents.filter((student) => {
      const searchableValues = [
        student.name,
        student.email,
        student.studentId,
        student.batch,
        student.section,
      ];

      const matchesSearch =
        !normalizedSearch ||
        searchableValues.some((value) =>
          String(value ?? '').toLowerCase().includes(normalizedSearch),
        );

      const matchesStatus =
        status === 'all' || student.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [assignedStudents, search, status]);

  const hasActiveFilters = Boolean(search.trim() || status !== 'all');

  function clearFilters() {
    setSearch('');
    setStatus('all');
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Mentor workspace"
        title="Assigned Students"
        description="View and manage students within your assigned batches and sections. Student access must remain restricted to your assigned groups."
        breadcrumbs={[
          { label: 'Mentor', to: '/mentor/dashboard' },
          { label: 'Assigned Students' },
        ]}
        actions={
          <Link
            to="/mentor/students/import"
            className={[
              'inline-flex min-h-11 items-center justify-center gap-2',
              'rounded-xl border border-[#CDB5F7]/30',
              'bg-[#CDB5F7] px-4 py-2.5',
              'text-sm font-semibold text-[#191621]',
              'transition-colors hover:bg-[#DCCBFA]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2',
              'focus-visible:ring-offset-[#14161C]',
            ].join(' ')}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4 w-4"
            >
              <path
                d="M10 4v12M4 10h12"
                strokeLinecap="round"
              />
            </svg>
            Import students
          </Link>
        }
      />

      <section
        aria-label="Assigned student summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <SummaryCard
          label="Assigned students"
          value="—"
          description="Awaiting the assigned-students data source"
          icon={<StudentIcon />}
        />

        <SummaryCard
          label="Active students"
          value="—"
          description="Will be calculated from actual student records"
          icon={
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                d="m8 12 2.5 2.5L16 9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />

        <SummaryCard
          label="Inactive students"
          value="—"
          description="Will be calculated from actual student records"
          icon={
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                d="M9 9l6 6m0-6-6 6"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </section>

      <SectionCard
        eyebrow="Student directory"
        title="Find a student"
        description="Search by student name, email, student ID, batch or section. Filters apply to the records available to this mentor."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div className="min-w-0">
            <label
              htmlFor="mentor-student-search"
              className="mb-2 block text-xs font-semibold text-[#B8B8C2]"
            >
              Search students
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#858590]">
                <SearchIcon />
              </span>

              <input
                id="mentor-student-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email, ID, batch or section"
                autoComplete="off"
                className={[
                  'min-h-11 w-full rounded-xl border border-[#3B3C43]',
                  'bg-[#14161C] py-2.5 pl-10 pr-3 text-sm',
                  'text-[#EAEAE6] placeholder:text-[#686974]',
                  'outline-none transition-colors',
                  'focus:border-[#CDB5F7] focus:ring-2',
                  'focus:ring-[#CDB5F7]/20',
                ].join(' ')}
              />
            </div>
          </div>

          <FilterField
            id="mentor-student-status"
            label="Student status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={STUDENT_STATUS_OPTIONS}
          />

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className={[
              'min-h-11 rounded-xl border border-[#3B3C43]',
              'px-4 py-2.5 text-sm font-semibold',
              'transition-colors focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-[#CDB5F7]',
              hasActiveFilters
                ? 'bg-[#26272B] text-[#EAEAE6] hover:bg-[#303139]'
                : 'cursor-not-allowed bg-[#1D1F27] text-[#686974]',
            ].join(' ')}
          >
            Clear filters
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
          <p className="text-sm text-[#858590]" aria-live="polite">
            {assignedStudents.length > 0
              ? `${filteredStudents.length} of ${assignedStudents.length} students`
              : 'Student records pending backend integration'}
          </p>

          {hasActiveFilters && (
            <p className="text-xs text-[#B8B8C2]">
              Filters are active
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Student records"
        description="Only students belonging to your assigned batches and sections should be available in this directory."
      >
        <StudentTable
          students={filteredStudents}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </SectionCard>

      <div className="rounded-2xl border border-[#E5DF98]/15 bg-[#E5DF98]/[0.04] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5DF98]/10 text-[#E5DF98]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                d="M12 11v5m0-8h.01"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#E5DF98]">
              Mentor access boundary
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#B8B8C2]">
              Student creation, editing, imports and academic records must be
              limited to batches and sections assigned to the authenticated
              mentor. Frontend visibility alone is not authorization; the
              backend must enforce these restrictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}