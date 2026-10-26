import { useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import DataTable from '../../components/DataTable.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const ASSIGNMENT_COLUMNS = [
  {
    key: 'facultyName',
    header: 'Faculty Member',
    accessor: 'facultyName',
  },
  {
    key: 'institutionalId',
    header: 'Institutional ID',
    accessor: 'institutionalId',
  },
  {
    key: 'batch',
    header: 'Batch',
    accessor: 'batch',
  },
  {
    key: 'section',
    header: 'Section',
    accessor: 'section',
  },
  {
    key: 'status',
    header: 'Assignment Status',
    render: (value) => {
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
            styles[value] ??
              'border-[#454650] bg-[#292A32] text-[#A5A6B0]',
          ].join(' ')}
        >
          {value || 'Unknown'}
        </span>
      );
    },
  },
];

export default function MentorAssignments() {
  const [search, setSearch] = useState('');

  /*
   * Frontend-only phase:
   * Connect actual mentor assignment records during integration.
   * Do not populate this list with fabricated records.
   */
  const assignments = [];
  const isLoading = false;

  const normalizedSearch = search.trim().toLowerCase();

  const filteredAssignments = assignments.filter((assignment) => {
    const searchableValues = [
      assignment.facultyName,
      assignment.institutionalId,
      assignment.batch,
      assignment.section,
    ];

    return searchableValues.some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  });

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="DEPARTMENT ADMINISTRATION"
        title="Mentor Assignments"
        description="Review mentor designations and their assigned batches and sections."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Mentor Assignments' },
        ]}
        actions={
          <Link to="/hod/mentors/grant-role">
            <ActionButton
              leadingIcon={
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Grant Mentor Role
            </ActionButton>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Mentor Assignments
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Assignment totals will appear after backend integration.
          </p>
        </div>

        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Batch & Section Coverage
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Coverage information is not loaded yet.
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="MENTOR DIRECTORY"
        title="Current assignments"
        description="Find mentor assignments using a faculty member's name, institutional ID, batch, or section."
      >
        <div className="space-y-5">
          <div className="max-w-xl">
            <SearchInput
              name="mentor-assignment-search"
              label="Search mentor assignments"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search faculty, batch, or section..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p className="text-sm text-[#A5A6B0]">
              {filteredAssignments.length} assignments currently loaded
            </p>

            {search && (
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={() => setSearch('')}
              >
                Clear search
              </ActionButton>
            )}
          </div>

          <DataTable
            columns={ASSIGNMENT_COLUMNS}
            data={filteredAssignments}
            rowKey="id"
            loading={isLoading}
            ariaLabel="Mentor assignments"
            emptyTitle="No mentor assignments loaded"
            emptyDescription="Mentor assignments will appear here when actual departmental records are connected. No sample assignments are being displayed."
          />
        </div>
      </SectionCard>

      <div className="mt-5 rounded-xl border border-[#383943] bg-[#1D1F27] p-4">
        <p className="text-sm font-medium text-[#EAEAE6]">
          Assignment management
        </p>

        <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
          Mentor assignments must remain within the authenticated HOD's
          department. Available batches, sections, and faculty records will
          be connected during the backend integration phase.
        </p>
      </div>
    </div>
  );
}