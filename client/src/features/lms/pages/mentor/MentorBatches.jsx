import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import DataTable from '../../components/DataTable.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const BATCH_COLUMNS = [
  {
    key: 'name',
    header: 'Batch',
    accessor: 'name',
  },
  {
    key: 'academicYear',
    header: 'Academic Year',
    accessor: 'academicYear',
  },
  {
    key: 'sections',
    header: 'Assigned Sections',
    render: (_value, batch) => {
      const sections = Array.isArray(batch.sections)
        ? batch.sections
        : [];

      if (sections.length === 0) {
        return (
          <span className="text-[#858590]">
            Not available
          </span>
        );
      }

      return (
        <div className="flex max-w-xs flex-wrap gap-2">
          {sections.map((section, index) => (
            <span
              key={
                section.id ||
                section._id ||
                `${section.name || 'section'}-${index}`
              }
              className="inline-flex rounded-lg border border-[#454650] bg-[#292A32] px-2.5 py-1 text-xs font-medium text-[#D0D0D8]"
            >
              {section.name || section.code || 'Unnamed section'}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (value) => {
      const normalizedStatus = String(value || '').toUpperCase();

      const styles = {
        ACTIVE:
          'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
        INACTIVE:
          'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
      };

      return (
        <span
          className={[
            'inline-flex rounded-full border px-2.5 py-1',
            'text-xs font-medium',
            styles[normalizedStatus] ||
              'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
          ].join(' ')}
        >
          {value || 'Not available'}
        </span>
      );
    },
  },
];

function getBatchSearchValues(batch) {
  const sections = Array.isArray(batch.sections)
    ? batch.sections
    : [];

  return [
    batch.name,
    batch.academicYear,
    batch.status,
    ...sections.flatMap((section) => [
      section.name,
      section.code,
    ]),
  ];
}

function getBatchKey(batch) {
  return (
    batch.id ||
    batch._id ||
    `${batch.name || 'batch'}-${batch.academicYear || 'year'}`
  );
}

export default function MentorBatches() {
  const [search, setSearch] = useState('');

  /*
   * Frontend-only phase:
   * Replace this empty collection with the authenticated mentor's
   * assigned-batch response during backend integration.
   *
   * Never load all departmental batches into the mentor workspace.
   */
  const assignedBatches = [];

  const normalizedSearch = search.trim().toLowerCase();

  const filteredBatches = useMemo(
    () =>
      assignedBatches.filter((batch) => {
        if (!normalizedSearch) {
          return true;
        }

        return getBatchSearchValues(batch).some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(normalizedSearch),
        );
      }),
    [assignedBatches, normalizedSearch],
  );

  const assignedSectionCount = assignedBatches.reduce(
    (total, batch) =>
      total +
      (Array.isArray(batch.sections) ? batch.sections.length : 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="MENTOR WORKSPACE"
        title="My Batches & Sections"
        description="View the academic batches and sections assigned to you by your HOD."
        breadcrumbs={[
          {
            label: 'Mentor Dashboard',
            to: '/mentor/dashboard',
          },
          {
            label: 'My Batches & Sections',
          },
        ]}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Assigned Batches
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {assignedBatches.length > 0
              ? assignedBatches.length
              : '—'}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Your assigned academic batches.
          </p>
        </section>

        <section className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Assigned Sections
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {assignedBatches.length > 0
              ? assignedSectionCount
              : '—'}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Sections available within your assigned batches.
          </p>
        </section>
      </div>

      <SectionCard
        eyebrow="ASSIGNMENT OVERVIEW"
        title="Your academic assignments"
        description="Search your assigned batches by name, academic year, section, or status."
      >
        <div className="space-y-5">
          <div className="max-w-xl">
            <SearchInput
              name="mentor-batch-search"
              label="Search assigned batches"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search batch, section, or academic year..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p className="text-sm text-[#A5A6B0]">
              {filteredBatches.length} assigned{' '}
              {filteredBatches.length === 1 ? 'batch' : 'batches'} found
            </p>

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="rounded-lg border border-[#454650] px-3 py-2 text-sm font-medium text-[#D0D0D8] transition hover:bg-[#292A32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Clear Search
              </button>
            )}
          </div>

          <DataTable
            columns={BATCH_COLUMNS}
            data={filteredBatches}
            rowKey={getBatchKey}
            ariaLabel="My assigned batches and sections"
            emptyTitle={
              assignedBatches.length === 0
                ? 'No assigned batches available'
                : 'No matching batches found'
            }
            emptyDescription={
              assignedBatches.length === 0
                ? 'Your HOD-assigned batches and sections will appear here when the mentor assignment data is connected.'
                : 'Try a different search term to find your assigned batch or section.'
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        className="mt-5"
        title="Assignment Access"
        description="Your access is limited to the academic groups assigned to your mentor account."
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/10 text-[#CDB5F7]"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-5 w-5"
            >
              <rect
                x="5"
                y="10"
                width="14"
                height="11"
                rx="2"
              />
              <path
                d="M8 10V7a4 4 0 0 1 8 0v3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#EAEAE6]">
              Assigned groups only
            </h3>

            <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
              Batch and section assignments are managed by your HOD.
              This page is read-only; it does not allow mentors to create
              batches, create sections, or change their assignments.
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/mentor/students"
          className="inline-flex items-center justify-center rounded-lg border border-[#454650] px-4 py-2.5 text-sm font-medium text-[#D0D0D8] transition hover:bg-[#292A32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          View Assigned Students
        </Link>

        <Link
          to="/mentor/attendance"
          className="inline-flex items-center justify-center rounded-lg border border-[#454650] px-4 py-2.5 text-sm font-medium text-[#D0D0D8] transition hover:bg-[#292A32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          View Attendance
        </Link>
      </div>

      {assignedBatches.length === 0 && (
        <div className="mt-5">
          <EmptyState
            title="Assignment data is pending"
            description="The frontend is ready for integration. Actual batch and section assignments must come from the authenticated mentor's authorized backend response."
          />
        </div>
      )}
    </div>
  );
}