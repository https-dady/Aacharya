import { useMemo, useState } from 'react';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const ATTENDANCE_THRESHOLD = 75;

const INITIAL_FILTERS = {
  date: '',
  course: '',
  section: '',
};

export default function FacultyAttendance() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  // No sample students or fabricated attendance records.
  // Connect the real faculty attendance API when its contract exists.
  const attendanceRecords = [];

  const filteredRecords = useMemo(() => {
    if (!appliedFilters) {
      return [];
    }

    const query = appliedFilters.course.trim().toLowerCase();
    const sectionQuery = appliedFilters.section.trim().toLowerCase();

    return attendanceRecords.filter((record) => {
      const matchesDate =
        !appliedFilters.date ||
        String(record.date ?? '') === appliedFilters.date;

      const matchesCourse =
        !query ||
        String(record.courseName ?? '')
          .toLowerCase()
          .includes(query) ||
        String(record.courseCode ?? '')
          .toLowerCase()
          .includes(query);

      const matchesSection =
        !sectionQuery ||
        String(record.sectionName ?? '')
          .toLowerCase()
          .includes(sectionQuery) ||
        String(record.batchName ?? '')
          .toLowerCase()
          .includes(sectionQuery);

      return matchesDate && matchesCourse && matchesSection;
    });
  }, [appliedFilters, attendanceRecords]);

  const summary = useMemo(() => {
    if (!appliedFilters || filteredRecords.length === 0) {
      return {
        total: null,
        present: null,
        absent: null,
        belowThreshold: null,
      };
    }

    const present = filteredRecords.filter(
      (record) => record.status === 'PRESENT',
    ).length;

    const absent = filteredRecords.filter(
      (record) => record.status === 'ABSENT',
    ).length;

    const belowThreshold = filteredRecords.filter((record) => {
      const percentage = Number(record.attendancePercentage);

      return (
        Number.isFinite(percentage) &&
        percentage < ATTENDANCE_THRESHOLD
      );
    }).length;

    return {
      total: filteredRecords.length,
      present,
      absent,
      belowThreshold,
    };
  }, [appliedFilters, filteredRecords]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (filters.date) {
      const selectedDate = new Date(`${filters.date}T00:00:00`);

      if (Number.isNaN(selectedDate.getTime())) {
        nextErrors.date = 'Enter a valid attendance date.';
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setNotice('');
      return;
    }

    setAppliedFilters({ ...filters });

    setNotice(
      'Filters applied. Actual attendance records will appear when the faculty attendance API is integrated.',
    );
  }

  function handleReset() {
    setFilters({ ...INITIAL_FILTERS });
    setAppliedFilters(null);
    setErrors({});
    setNotice('');
  }

  function formatPercentage(value) {
    const percentage = Number(value);

    return Number.isFinite(percentage)
      ? `${percentage.toFixed(1)}%`
      : '—';
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Attendance"
        description="Review class attendance, track student participation, and identify students who may need attendance support."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Attendance',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Attendance Records
          </p>

          <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
            {summary.total ?? '—'}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Matching the selected filters
          </p>
        </section>

        <section className="rounded-2xl border border-emerald-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Present
          </p>

          <p className="mt-3 text-3xl font-semibold text-emerald-300">
            {summary.present ?? '—'}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Students marked present
          </p>
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Absent
          </p>

          <p className="mt-3 text-3xl font-semibold text-red-300">
            {summary.absent ?? '—'}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Students marked absent
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Below {ATTENDANCE_THRESHOLD}%
          </p>

          <p className="mt-3 text-3xl font-semibold text-amber-200">
            {summary.belowThreshold ?? '—'}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Students requiring attention
          </p>
        </section>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="ATTENDANCE MANAGEMENT"
          title="Find Class Attendance"
          description="Filter attendance records by date, course, and section."
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label
                  htmlFor="attendance-date"
                  className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                >
                  Class Date
                </label>

                <input
                  id="attendance-date"
                  name="date"
                  type="date"
                  value={filters.date}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.date)}
                  aria-describedby={
                    errors.date ? 'attendance-date-error' : undefined
                  }
                  className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                />

                {errors.date && (
                  <p
                    id="attendance-date-error"
                    role="alert"
                    className="mt-2 text-xs text-red-300"
                  >
                    {errors.date}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="attendance-course"
                  className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                >
                  Course Name or Code
                </label>

                <input
                  id="attendance-course"
                  name="course"
                  type="search"
                  value={filters.course}
                  onChange={handleChange}
                  placeholder="Search assigned course"
                  autoComplete="off"
                  className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors placeholder:text-[#777986] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="attendance-section"
                  className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                >
                  Section or Batch
                </label>

                <input
                  id="attendance-section"
                  name="section"
                  type="search"
                  value={filters.section}
                  onChange={handleChange}
                  placeholder="Search assigned section"
                  autoComplete="off"
                  className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#191A21] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors placeholder:text-[#777986] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                />
              </div>
            </div>

            {notice && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
              >
                {notice}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={handleReset}
              >
                Reset Filters
              </ActionButton>

              <ActionButton type="submit">
                Apply Filters
              </ActionButton>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="CLASS RECORDS"
          title="Student Attendance"
          description="Review student-level attendance records and percentage warnings."
        >
          {filteredRecords.length === 0 ? (
            <EmptyState
              title={
                appliedFilters
                  ? 'No attendance records available'
                  : 'Attendance records not connected yet'
              }
              description={
                appliedFilters
                  ? 'No actual attendance records are available for these filters. The attendance API must be integrated before student records can be displayed.'
                  : 'Once the faculty attendance API is available, assigned classes and student attendance records will appear here.'
              }
              action={
                appliedFilters ? (
                  <ActionButton
                    variant="secondary"
                    onClick={handleReset}
                  >
                    Clear Filters
                  </ActionButton>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">
                  Faculty student attendance records
                </caption>

                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Student
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Section
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Date
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Attendance
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredRecords.map((record, index) => {
                    const percentage = Number(
                      record.attendancePercentage,
                    );

                    const isBelowThreshold =
                      Number.isFinite(percentage) &&
                      percentage < ATTENDANCE_THRESHOLD;

                    return (
                      <tr
                        key={record.id ?? record._id ?? index}
                        className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#EAEAE6]">
                            {record.studentName || '—'}
                          </p>

                          {record.studentId && (
                            <p className="mt-1 text-xs text-[#9697A2]">
                              {record.studentId}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.courseName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.sectionName || record.batchName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {record.date || '—'}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={[
                              'inline-flex rounded-full border px-2.5 py-1',
                              'text-xs font-medium',
                              record.status === 'PRESENT'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : record.status === 'ABSENT'
                                  ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                  : 'border-[#454650] bg-[#26272B] text-[#B8B8C2]',
                            ].join(' ')}
                          >
                            {record.status || 'Not recorded'}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              isBelowThreshold
                                ? 'font-medium text-red-300'
                                : 'text-[#D0D0D8]'
                            }
                          >
                            {formatPercentage(record.attendancePercentage)}
                          </span>

                          {isBelowThreshold && (
                            <p className="mt-1 text-xs text-red-300">
                              Below threshold
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 rounded-2xl border border-[#343640] bg-[#191A21] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                d="M12 11v5M12 8h.01"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <div>
            <h2 className="text-sm font-semibold text-[#EAEAE6]">
              Attendance policy reminder
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Students with attendance below {ATTENDANCE_THRESHOLD}% should
              be flagged for review according to the institution's attendance
              policy. Warnings will be calculated from actual attendance
              records once backend integration is available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}