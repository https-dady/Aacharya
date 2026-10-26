import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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

export default function TimetableOverview() {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [searchTerm, setSearchTerm] = useState('');

  // Actual timetable records will be connected during backend integration.
  const timetableEntries = [];

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return timetableEntries.filter((entry) => {
      const matchesDay = entry.day === selectedDay;

      const matchesSearch =
        !query ||
        [
          entry.courseName,
          entry.courseCode,
          entry.facultyName,
          entry.sectionName,
          entry.room,
        ].some((value) =>
          String(value || '').toLowerCase().includes(query),
        );

      return matchesDay && matchesSearch;
    });
  }, [selectedDay, searchTerm]);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACADEMIC OPERATIONS"
        title="Timetable Management"
        description="Review the weekly academic schedule and manage timetable planning for department sections."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Timetable Management' },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/hod/sections">
              <ActionButton variant="secondary">
                View Sections
              </ActionButton>
            </Link>

            <Link to="/hod/timetable/create">
              <ActionButton>
                Create Timetable
              </ActionButton>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">Scheduled Classes</p>
          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">—</p>
          <p className="mt-2 text-xs text-[#777986]">
            Awaiting timetable records
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">Faculty Allocations</p>
          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">—</p>
          <p className="mt-2 text-xs text-[#777986]">
            Awaiting faculty assignments
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">Section Coverage</p>
          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">—</p>
          <p className="mt-2 text-xs text-[#777986]">
            Awaiting section schedule data
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="WEEKLY SCHEDULE"
          title="Department Timetable"
          description="Choose a day to review its scheduled classes."
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
              placeholder="Search course, faculty, section, or room..."
            />
          </div>

          {filteredEntries.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim()
                  ? 'No matching classes'
                  : `No classes available for ${selectedDay}`
              }
              description={
                searchTerm.trim()
                  ? 'Try changing the search term or selecting another day.'
                  : 'The timetable will appear here after actual schedule records are connected.'
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
                  <Link to="/hod/timetable/create">
                    <ActionButton>
                      Create Timetable
                    </ActionButton>
                  </Link>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="px-4 py-3 font-medium">Faculty</th>
                    <th className="px-4 py-3 font-medium">Section</th>
                    <th className="px-4 py-3 font-medium">Room</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {filteredEntries.map((entry, index) => (
                    <tr
                      key={entry.id || entry._id || index}
                      className="bg-[#191A21] hover:bg-[#202129]"
                    >
                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {entry.startTime || '—'} – {entry.endTime || '—'}
                      </td>
                      <td className="px-4 py-4 text-[#EAEAE6]">
                        {entry.courseName || '—'}
                      </td>
                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {entry.facultyName || '—'}
                      </td>
                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {entry.sectionName || '—'}
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
        </SectionCard>
      </div>

      <div className="mt-5 rounded-xl border border-[#343640] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#D0D0D8]">
          Timetable data status
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          This page currently provides the timetable interface only.
          Schedule creation, faculty availability checks, room-conflict
          detection, and persistence will be connected when the relevant
          backend contracts are implemented.
        </p>
      </div>
    </div>
  );
}