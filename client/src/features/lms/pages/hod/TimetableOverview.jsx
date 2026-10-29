import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import timetableService from '../../services/timetableService.js';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load the department timetable. Please try again.'
  );
}

function getEntryId(entry) {
  return entry?.id || entry?._id || '';
}

function sortEntries(entries) {
  return [...entries].sort((first, second) => {
    const timeComparison = String(first.startTime || '').localeCompare(
      String(second.startTime || ''),
    );

    if (timeComparison !== 0) {
      return timeComparison;
    }

    return String(first.courseName || '').localeCompare(
      String(second.courseName || ''),
    );
  });
}

function MetricCard({ label, value, description }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
      <p className="text-sm text-[#9697A2]">{label}</p>

      <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs text-[#777986]">
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="rounded-xl border border-[#343640] bg-[#191A21] p-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-[#B9A4FF] border-t-transparent"
          aria-hidden="true"
        />

        <p className="text-sm text-[#D0D0D8]">
          Loading department timetable...
        </p>
      </div>
    </div>
  );
}

export default function TimetableOverview() {
  const navigate = useNavigate();

  const [selectedDay, setSelectedDay] = useState('Monday');
  const [searchTerm, setSearchTerm] = useState('');

  const [timetableEntries, setTimetableEntries] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await timetableService.getTimetable({
        page: 1,
        limit: 100,
        status: 'ACTIVE',
      });

      if (!result || !Array.isArray(result.entries)) {
        throw new Error(
          'The timetable API returned an unexpected response.',
        );
      }

      setTimetableEntries(result.entries);
      setPagination(result.pagination);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable, refreshVersion]);

  const activeEntries = useMemo(
    () =>
      timetableEntries.filter(
        (entry) => entry.status === 'ACTIVE',
      ),
    [timetableEntries],
  );

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = activeEntries.filter((entry) => {
      const matchesDay = entry.day === selectedDay;

      const searchableValues = [
        entry.courseName,
        entry.courseCode,
        entry.facultyName,
        entry.sectionName,
        entry.batchName,
        entry.room,
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value || '').toLowerCase().includes(query),
        );

      return matchesDay && matchesSearch;
    });

    return sortEntries(filtered);
  }, [activeEntries, selectedDay, searchTerm]);

  const metrics = useMemo(() => {
    const facultyIds = new Set();
    const sectionIds = new Set();

    activeEntries.forEach((entry) => {
      if (entry.facultyId) {
        facultyIds.add(entry.facultyId);
      } else if (entry.facultyName) {
        facultyIds.add(entry.facultyName);
      }

      if (entry.sectionId) {
        sectionIds.add(entry.sectionId);
      } else if (entry.sectionName) {
        sectionIds.add(entry.sectionName);
      }
    });

    return {
      scheduledClasses: activeEntries.length,
      facultyAllocations: facultyIds.size,
      sectionCoverage: sectionIds.size,
    };
  }, [activeEntries]);

  function handleRefresh() {
    setRefreshVersion((current) => current + 1);
  }

  function handleEdit(entry) {
    navigate('/hod/timetable/edit', {
      state: {
        timetableEntry: entry,
      },
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACADEMIC OPERATIONS"
        title="Timetable Management"
        description="Review the department's weekly academic schedule and manage timetable planning."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Timetable Management',
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <ActionButton
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </ActionButton>

            <Link to="/hod/sections">
              <ActionButton variant="secondary">
                View Sections
              </ActionButton>
            </Link>

            <Link to="/hod/timetable/new">
              <ActionButton>
                Create Timetable
              </ActionButton>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Scheduled Classes"
          value={loading ? '—' : metrics.scheduledClasses}
          description="Active timetable entries loaded from the API"
        />

        <MetricCard
          label="Faculty Allocations"
          value={loading ? '—' : metrics.facultyAllocations}
          description="Distinct faculty assigned to scheduled classes"
        />

        <MetricCard
          label="Section Coverage"
          value={loading ? '—' : metrics.sectionCoverage}
          description="Distinct sections with active schedules"
        />
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="WEEKLY SCHEDULE"
          title="Department Timetable"
          description="Choose a weekday to review its scheduled classes."
        >
          <div
            className="mb-5 flex gap-2 overflow-x-auto pb-2"
            role="group"
            aria-label="Select weekday"
          >
            {WEEKDAYS.map((day) => {
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  aria-pressed={isSelected}
                  className={`shrink-0 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-[#B9A4FF] bg-[#B9A4FF]/15 text-[#D8CBFF]'
                      : 'border-[#383943] bg-[#191A21] text-[#A5A6B0] hover:border-[#555762] hover:text-[#EAEAE6]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mb-5 max-w-md">
            <SearchInput
              name="timetableSearch"
              label="Search timetable"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search course, faculty, section, batch, or room..."
            />
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <div
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-5"
              role="alert"
            >
              <p className="font-medium text-red-200">
                Unable to load timetable
              </p>

              <p className="mt-2 text-sm leading-6 text-red-200/80">
                {error}
              </p>

              <div className="mt-4">
                <ActionButton
                  variant="secondary"
                  onClick={handleRefresh}
                >
                  Retry
                </ActionButton>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim()
                  ? 'No matching classes'
                  : `No classes available for ${selectedDay}`
              }
              description={
                searchTerm.trim()
                  ? 'Try a different search term or choose another weekday.'
                  : activeEntries.length === 0
                    ? 'No active timetable entries were returned. Create a schedule to populate this view.'
                    : `No active classes are scheduled for ${selectedDay}.`
              }
              action={
                searchTerm.trim() ? (
                  <ActionButton
                    variant="secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </ActionButton>
                ) : (
                  <Link to="/hod/timetable/new">
                    <ActionButton>
                      Create Timetable
                    </ActionButton>
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[#9697A2]">
                  {filteredEntries.length} class
                  {filteredEntries.length === 1 ? '' : 'es'} on{' '}
                  {selectedDay}
                </p>

                <p className="text-xs text-[#777986]">
                  {pagination.total} total records reported by API
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#343640]">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                    <tr>
                      <th className="px-4 py-3 font-medium">
                        Time
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Course
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
                        Room
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#343640]">
                    {filteredEntries.map((entry, index) => (
                      <tr
                        key={getEntryId(entry) || index}
                        className="bg-[#191A21] hover:bg-[#202129]"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-[#D0D0D8]">
                          {entry.startTime || '—'} –{' '}
                          {entry.endTime || '—'}
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
                          {entry.facultyName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {entry.batchName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {entry.sectionName || '—'}
                        </td>

                        <td className="px-4 py-4 text-[#D0D0D8]">
                          {entry.room || '—'}
                        </td>

                        <td className="px-4 py-4">
                          <ActionButton
                            variant="secondary"
                            onClick={() => handleEdit(entry)}
                          >
                            Edit
                          </ActionButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Timetable data
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This page now requests timetable records from the backend.
          Schedule creation and editing must use the same API contract,
          and server-side authorization and conflict validation remain
          authoritative.
        </p>
      </div>
    </div>
  );
}