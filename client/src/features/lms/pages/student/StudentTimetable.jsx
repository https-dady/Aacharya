import { useState } from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const WEEKDAYS = [
  { label: 'Monday', short: 'MON' },
  { label: 'Tuesday', short: 'TUE' },
  { label: 'Wednesday', short: 'WED' },
  { label: 'Thursday', short: 'THU' },
  { label: 'Friday', short: 'FRI' },
  { label: 'Saturday', short: 'SAT' },
  { label: 'Sunday', short: 'SUN' },
];

function getCurrentDay() {
  const day = new Date().getDay();

  return day === 0 ? 6 : day - 1;
}

export default function StudentTimetable() {
  const [selectedDay, setSelectedDay] = useState(getCurrentDay());

  const activeDay = WEEKDAYS[selectedDay];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="My Timetable"
        description="View your weekly class schedule and organize your academic day."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Timetable' },
        ]}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Selected Day
          </p>

          <p className="mt-3 text-xl font-semibold text-[#EAEAE6]">
            {activeDay.label}
          </p>

          <p className="mt-1 text-xs text-[#858590]">
            Schedule overview
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Scheduled Classes
          </p>

          <p className="mt-3 text-xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-1 text-xs text-[#858590]">
            Awaiting timetable data
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Next Class
          </p>

          <p className="mt-3 text-xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-1 text-xs text-[#858590]">
            No schedule information available
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="WEEKLY SCHEDULE"
        title="Your Class Calendar"
        description="Select a day to view its timetable."
      >
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
          role="group"
          aria-label="Select timetable day"
        >
          {WEEKDAYS.map((day, index) => {
            const isSelected = selectedDay === index;

            return (
              <button
                key={day.short}
                type="button"
                onClick={() => setSelectedDay(index)}
                aria-pressed={isSelected}
                className={[
                  'flex min-h-[76px] flex-col items-start',
                  'justify-center rounded-xl border px-4 py-3',
                  'text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#CDB5F7]',
                  isSelected
                    ? 'border-[#CDB5F7]/50 bg-[#CDB5F7]/10'
                    : 'border-[#343640] bg-[#191A21] hover:border-[#555663]',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-[10px] font-semibold tracking-[0.15em]',
                    isSelected ? 'text-[#CDB5F7]' : 'text-[#858590]',
                  ].join(' ')}
                >
                  {day.short}
                </span>

                <span
                  className={[
                    'mt-2 text-sm font-medium',
                    isSelected ? 'text-[#EAEAE6]' : 'text-[#A5A6B0]',
                  ].join(' ')}
                >
                  {day.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 border-t border-[#343640] pt-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#EAEAE6]">
                {activeDay.label}
              </h3>

              <p className="mt-1 text-sm text-[#858590]">
                Your classes and lecture timings will appear here.
              </p>
            </div>

            <span className="rounded-full border border-[#454650] bg-[#191A21] px-3 py-1.5 text-xs text-[#A5A6B0]">
              Schedule unavailable
            </span>
          </div>

          <EmptyState
            title={`No timetable available for ${activeDay.label}`}
            description="Your scheduled lectures, subjects, faculty details, rooms, and class timings will appear here when your timetable is available."
            icon={
              <span aria-hidden="true" className="text-2xl">
                ◷
              </span>
            }
          />
        </div>
      </SectionCard>

      <div className="mt-6 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#CDB5F7]">
              Keep learning
            </p>

            <h3 className="mt-2 text-base font-semibold text-[#EAEAE6]">
              Continue to your courses
            </h3>

            <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
              Access your enrolled subjects and available learning materials.
            </p>
          </div>

          <Link
            to="/student/courses"
            className={[
              'inline-flex min-h-11 items-center justify-center',
              'rounded-xl bg-[#CDB5F7] px-5 py-2.5',
              'text-sm font-semibold text-[#20172D]',
              'transition-colors hover:bg-[#DDCCFA]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7] focus-visible:ring-offset-2',
              'focus-visible:ring-offset-[#1D1F27]',
            ].join(' ')}
          >
            View My Courses
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}