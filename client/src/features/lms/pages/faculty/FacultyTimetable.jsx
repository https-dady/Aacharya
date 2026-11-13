import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import facultyTimetableService from '../../services/facultyTimetableService.js';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const INITIAL_DAY = 'Monday';

function getDayAbbreviation(day) {
  return day.slice(0, 3);
}

function getUniqueCourseCount(entries) {
  return new Set(
    entries
      .map((entry) => entry.courseId)
      .filter(Boolean),
  ).size;
}

function TimetableLoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 rounded-xl border border-[#343640] bg-[#191A21] py-12 text-sm text-[#A5A6B0]"
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-[#CDB5F7] border-r-transparent motion-reduce:animate-none"
      />

      Loading your timetable...
    </div>
  );
}

export default function FacultyTimetable() {
  const [selectedDay, setSelectedDay] = useState(INITIAL_DAY);
  const [searchTerm, setSearchTerm] = useState('');

  const [timetableEntries, setTimetableEntries] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [error, setError] = useState('');

  const loadTimetable = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');

    try {
      const result = await facultyTimetableService.getMyTimetable({
        page: 1,
        limit: 100,
        status: 'ACTIVE',
      });

      setTimetableEntries(result.entries);
    } catch (requestError) {
      setError(
        requestError?.message ||
          'Unable to load your timetable. Please try again.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTimetable();

  }, [loadTimetable]);

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

  const handleRefresh = () => {
    loadTimetable({ silent: true });
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
        actions={
          <ActionButton
            variant="secondary"
            onClick={handleRefresh}
            loading={isRefreshing}
            disabled={isLoading || isRefreshing}
          >
            Refresh Schedule
          </ActionButton>
        }
      />

      {/* Timetable summary */}

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
            {isLoading ? '—' : timetableEntries.length}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Active timetable entries retrieved from your account.
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
            {isLoading ? '—' : getUniqueCourseCount(timetableEntries)}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777986]">
            Unique courses appearing in your timetable.
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
            {isLoading
              ? 'Loading schedule...'
              : filteredEntries.length > 0
                ? `${filteredEntries.length} scheduled ${
                    filteredEntries.length === 1 ? 'class' : 'classes'
                  }`
                : 'No classes scheduled'}
          </p>
        </section>
      </div>

      {/* Weekly schedule */}

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
              {isLoading ? (
                <TimetableLoadingState />
              ) : error ? (
                <div className="space-y-4">
                  <div
                    role="alert"
                    className="rounded-xl border border-[#B86D78]/30 bg-[#B86D78]/10 p-4 text-sm leading-6 text-[#F0B0B9]"
                  >
                    {error}
                  </div>

                  <ActionButton
                    variant="secondary"
                    onClick={() => loadTimetable()}
                  >
                    Try Again
                  </ActionButton>
                </div>
              ) : filteredEntries.length === 0 ? (
                <EmptyState
                  title={
                    searchTerm.trim()
                      ? 'No matching classes'
                      : `No classes scheduled for ${selectedDay}`
                  }
                  description={
                    searchTerm.trim()
                      ? 'Try another search term or clear your search to review the selected day.'
                      : 'There are currently no active timetable records assigned to you for this weekday.'
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
                      {filteredEntries.map((entry) => (
                        <tr
                          key={entry.id}
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

      {/* Information */}

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
              Schedule information
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#9697A2]">
              Your timetable is retrieved using your authenticated
              Faculty account. You can review your assigned courses,
              batches, sections, weekdays, and classroom details here.
              Timetable changes are managed through the authorized
              department workflow.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}