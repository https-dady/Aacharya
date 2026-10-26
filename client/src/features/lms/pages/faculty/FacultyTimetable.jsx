import { useMemo, useState } from 'react';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const INITIAL_DAY = 'Monday';

const INITIAL_SCHEDULE = [];

function getDayAbbreviation(day) {
  return day.slice(0, 3);
}

export default function FacultyTimetable() {
  const [selectedDay, setSelectedDay] = useState(INITIAL_DAY);
  const [searchTerm, setSearchTerm] = useState('');

  // Real timetable records will be connected when the backend contract exists.
  const timetableEntries = INITIAL_SCHEDULE;

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return timetableEntries
      .filter((entry) => entry.day === selectedDay)
      .filter((entry) => {
        if (!query) {
          return true;
        }

        return [
          entry.courseName,
          entry.courseCode,
          entry.sectionName,
          entry.batchName,
          entry.room,
          entry.startTime,
          entry.endTime,
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        );
      })
      .sort((first, second) =>
        String(first.startTime ?? '').localeCompare(
          String(second.startTime ?? ''),
        ),
      );
  }, [timetableEntries, selectedDay, searchTerm]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="TEACHING WORKSPACE"
        title="My Timetable"
        description="Review your teaching schedule, assigned courses, sections, and classroom details."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'My Timetable',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[#9697A2]">
              Classes This Week
            </p>

            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="2"
                />
                <path
                  d="M16 3v4M8 3v4M3 10h18"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>

          <p className="mt-4 text-3xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Available when schedule records are connected
          </p>
        </section>

        <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[#9697A2]">
              Assigned Courses
            </p>

            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#A8D9C1]/20 bg-[#A8D9C1]/10 text-[#A8D9C1]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 17a2.5 2.5 0 0 1 2.5-2.5H20M8 7h7M8 10h7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>

          <p className="mt-4 text-3xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Based on your assigned teaching responsibilities
          </p>
        </section>

        <section className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[#9697A2]">
              Selected Day
            </p>

            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]"
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
                  d="M12 7v5l3 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          <p className="mt-4 text-2xl font-semibold text-[#EAEAE6]">
            {selectedDay}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            {filteredEntries.length > 0
              ? `${filteredEntries.length} scheduled ${
                  filteredEntries.length === 1 ? 'class' : 'classes'
                }`
              : 'No schedule records available'}
          </p>
        </section>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="WEEKLY OVERVIEW"
          title="Teaching Schedule"
          description="Select a weekday to review your scheduled classes and classroom information."
        >
          <div className="p-5 sm:p-6">
            <div
              className="grid grid-cols-3 gap-2 sm:grid-cols-6"
              role="group"
              aria-label="Select timetable weekday"
            >
              {WEEKDAYS.map((day) => {
                const isSelected = selectedDay === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    aria-pressed={isSelected}
                    className={[
                      'flex min-w-0 flex-col items-center gap-1',
                      'rounded-xl border px-2 py-3 sm:px-3',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-[#CDB5F7]',
                      isSelected
                        ? 'border-[#B9A4FF] bg-[#B9A4FF]/15 text-[#D8CBFF]'
                        : 'border-[#383943] bg-[#191A21] text-[#A5A6B0] hover:border-[#555762] hover:text-[#EAEAE6]',
                    ].join(' ')}
                  >
                    <span className="text-xs font-medium sm:text-sm">
                      {getDayAbbreviation(day)}
                    </span>

                    <span className="text-[10px] opacity-80 sm:text-xs">
                      {day}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 max-w-md">
              <SearchInput
                name="facultyTimetableSearch"
                label="Search schedule"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search course, section, batch, or room..."
              />
            </div>

            <div className="mt-6">
              {filteredEntries.length === 0 ? (
                <EmptyState
                  title={
                    searchTerm.trim()
                      ? 'No matching classes'
                      : `No classes scheduled for ${selectedDay}`
                  }
                  description={
                    searchTerm.trim()
                      ? 'Try another search term or clear your search to review the selected day.'
                      : 'Your teaching schedule will appear here when actual timetable records are available.'
                  }
                  action={
                    searchTerm.trim() ? (
                      <ActionButton
                        variant="secondary"
                        onClick={clearSearch}
                      >
                        Clear Search
                      </ActionButton>
                    ) : null
                  }
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#343640]">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <caption className="sr-only">
                      Teaching timetable for {selectedDay}
                    </caption>

                    <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium"
                        >
                          Time
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
                          Room
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#343640]">
                      {filteredEntries.map((entry, index) => (
                        <tr
                          key={entry.id ?? entry._id ?? index}
                          className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                        >
                          <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                            {entry.startTime || '—'} – {entry.endTime || '—'}
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-medium text-[#EAEAE6]">
                              {entry.courseName || '—'}
                            </p>

                            {entry.courseCode && (
                              <p className="mt-1 text-xs text-[#9697A2]">
                                {entry.courseCode}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 text-[#D0D0D8]">
                            {entry.sectionName || entry.batchName || '—'}
                          </td>

                          <td className="px-4 py-4 text-[#D0D0D8]">
                            {entry.room || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <section className="mt-5 rounded-2xl border border-[#343640] bg-[#191A21] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]"
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

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#EAEAE6]">
              Schedule data availability
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              This page currently provides the faculty timetable interface.
              Live schedule retrieval, class details, and timetable updates
              require a confirmed backend API contract and will be integrated
              without introducing sample schedule records.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}