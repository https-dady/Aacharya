import { useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import DataTable from '../../components/DataTable.jsx';
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
    key: 'sectionCount',
    header: 'Sections',
    accessor: 'sectionCount',
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
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
          {value || 'Not available'}
        </span>
      );
    },
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (_value, batch) => (
      <Link
        to="/hod/batches/details"
        state={{ batch }}
        aria-label={`View details for ${batch.name || 'academic batch'}`}
      >
        <ActionButton variant="secondary" size="sm">
          View Details
        </ActionButton>
      </Link>
    ),
  },
];

export default function BatchList() {
  const [search, setSearch] = useState('');

  /*
   * Frontend-only phase:
   * Real batch records will be connected during integration.
   * No fabricated batches or counts are displayed.
   */
  const batches = [];
  const isLoading = false;

  const normalizedSearch = search.trim().toLowerCase();

  const filteredBatches = batches.filter((batch) => {
    const searchableValues = [
      batch.name,
      batch.academicYear,
      batch.status,
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
        title="Batch Management"
        description="Organize departmental academic batches and access their sections."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Batch Management' },
        ]}
        actions={
          <Link to="/hod/batches/new">
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
              Create Batch
            </ActionButton>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Academic Batches
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Total batch count will appear after integration.
          </p>
        </div>

        <div className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Academic Sections
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            —
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Section totals are not loaded yet.
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="ACADEMIC STRUCTURE"
        title="Department batches"
        description="Search batches by name, academic year, or status."
      >
        <div className="space-y-5">
          <div className="max-w-xl">
            <SearchInput
              name="batch-search"
              label="Search batches"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search batch or academic year..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#343640] pt-4">
            <p className="text-sm text-[#A5A6B0]">
              {filteredBatches.length} batches currently loaded
            </p>

            {search && (
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={() => setSearch('')}
              >
                Clear Search
              </ActionButton>
            )}
          </div>

          <DataTable
            columns={BATCH_COLUMNS}
            data={filteredBatches}
            rowKey={(batch) =>
              batch.id ||
              batch._id ||
              `${batch.name}-${batch.academicYear}`
            }
            loading={isLoading}
            ariaLabel="Department academic batches"
            emptyTitle="No batch records loaded"
            emptyDescription="Batch records will appear here when connected to the appropriate backend endpoint. No sample batches are being displayed."
          />
        </div>
      </SectionCard>

      <div className="mt-5 rounded-xl border border-[#383943] bg-[#1D1F27] p-4">
        <p className="text-sm font-medium text-[#EAEAE6]">
          Department-level access
        </p>

        <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
          Batch and section management must remain within the authenticated
          HOD's department. Faculty and mentor allocations will follow the
          existing role and assignment rules.
        </p>
      </div>
    </div>
  );
}