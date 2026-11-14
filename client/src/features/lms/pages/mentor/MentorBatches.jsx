import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import DataTable from '../../components/DataTable.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorDashboardService from '../../services/mentorDashboardService.js';

const COLUMNS = [
  {
    key: 'name',
    header: 'Batch',
    accessor: 'name',
  },
  {
    key: 'code',
    header: 'Batch Code',
    accessor: 'code',
  },
  {
    key: 'academicYear',
    header: 'Academic Year',
    accessor: 'academicYear',
  },
  {
    key: 'sections',
    header: 'Assigned Sections',
    render: (_value, batch) => (
      <div className="flex max-w-xs flex-wrap gap-2">
        {batch.sections.length === 0 ? (
          <span className="text-xs text-[#858590]">
            No assigned sections
          </span>
        ) : (
          batch.sections.map((section) => (
            <span
              key={section.id}
              className="rounded-lg border border-[#454650] bg-[#292A32] px-2.5 py-1 text-xs text-[#D0D0D8]"
            >
              {section.name || section.code}
            </span>
          ))
        )}
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: () => (
      <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
        ACTIVE
      </span>
    ),
  },
];

function SummaryCard({ title, value, description }) {
  return (
    <article className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <p className="text-sm text-[#A5A6B0]">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
        {value}
      </p>
      <p className="mt-2 text-xs text-[#858590]">{description}</p>
    </article>
  );
}

export default function MentorBatches() {
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadAssignments() {
      setLoading(true);
      setError('');

      try {
        const dashboard = await mentorDashboardService.getDashboard({
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setBatches(dashboard.assignments.batches);
        setSections(dashboard.assignments.sections);
      } catch (err) {
        if (
          controller.signal.aborted ||
          err.name === 'CanceledError' ||
          err.name === 'AbortError'
        ) {
          return;
        }

        setError(
          err.response?.data?.error?.message ||
          err.message ||
          'Unable to load assigned batches.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAssignments();

    return () => controller.abort();
  }, []);

  const assignedBatches = useMemo(() => {
    const sectionMap = new Map();

    sections.forEach((section) => {
      const batchId = section.batch?.id;

      if (!batchId) return;

      if (!sectionMap.has(batchId)) {
        sectionMap.set(batchId, []);
      }

      sectionMap.get(batchId).push(section);
    });

    return batches.map((batch) => ({
      ...batch,
      sections: sectionMap.get(batch.id) || [],
    }));
  }, [batches, sections]);

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return assignedBatches;

    return assignedBatches.filter((batch) => {
      const values = [
        batch.name,
        batch.code,
        batch.academicYear,
        ...batch.sections.flatMap((section) => [
          section.name,
          section.code,
        ]),
      ];

      return values.some((value) =>
        String(value ?? '').toLowerCase().includes(query),
      );
    });
  }, [assignedBatches, search]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="MENTOR WORKSPACE"
        title="My Batches & Sections"
        description="View the academic batches and sections assigned to you."
        breadcrumbs={[
          { label: 'Mentor', to: '/mentor/dashboard' },
          { label: 'My Batches & Sections' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Assigned Batches"
          value={loading ? '—' : batches.length}
          description="Active batches assigned through your sections."
        />

        <SummaryCard
          title="Assigned Sections"
          value={loading ? '—' : sections.length}
          description="Sections currently owned by your mentor account."
        />
      </div>

      <SectionCard
        eyebrow="ASSIGNMENT OVERVIEW"
        title="Your academic assignments"
        description="Search your assigned batches and sections."
      >
        <div className="space-y-5">
          <div className="max-w-xl">
            <SearchInput
              name="mentor-batch-search"
              label="Search assignments"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search batch, section or academic year..."
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-[#A5A6B0]">
              Loading your assignments...
            </div>
          ) : (
            <DataTable
              columns={COLUMNS}
              data={filteredBatches}
              rowKey={(batch) => batch.id}
              ariaLabel="Mentor assigned batches"
              emptyTitle={
                assignedBatches.length
                  ? 'No matching assignments'
                  : 'No batches assigned'
              }
              emptyDescription={
                assignedBatches.length
                  ? 'Try changing your search.'
                  : 'Your HOD has not assigned any active sections to you.'
              }
            />
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Assignment permissions"
        description="Mentor access is limited to assigned academic groups."
      >
        <p className="text-sm leading-6 text-[#A5A6B0]">
          Batch and section ownership is managed by your HOD. This
          workspace is read-only. It does not allow mentors to create
          batches, create sections, or change assignment ownership.
        </p>
      </SectionCard>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/mentor/students"
          className="rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#D0D0D8] transition hover:bg-[#292A32]"
        >
          View Assigned Students
        </Link>

        <Link
          to="/mentor/attendance"
          className="rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#D0D0D8] transition hover:bg-[#292A32]"
        >
          View Attendance
        </Link>
      </div>
    </div>
  );
}