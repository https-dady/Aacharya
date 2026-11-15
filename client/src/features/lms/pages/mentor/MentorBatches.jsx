import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import DataTable from '../../components/DataTable.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import mentorDashboardService from '../../services/mentorDashboardService.js';

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Unable to load your assigned batches and sections.'
  );
}

function normalizeAssignedBatches(assignments) {
  const batches = Array.isArray(assignments?.batches)
    ? assignments.batches
    : [];

  const sections = Array.isArray(assignments?.sections)
    ? assignments.sections
    : [];

  const sectionsByBatch = new Map();

  for (const section of sections) {
    const batchId = String(section.batch?.id ?? '');

    if (!batchId) {
      continue;
    }

    if (!sectionsByBatch.has(batchId)) {
      sectionsByBatch.set(batchId, []);
    }

    sectionsByBatch.get(batchId).push({
      id: section.id,
      name: section.name,
      code: section.code,
    });
  }

  return batches.map((batch) => ({
    id: batch.id,
    name: batch.name,
    code: batch.code,
    academicYear: batch.academicYear,
    sections: sectionsByBatch.get(batch.id) ?? [],
  }));
}

function getBatchSearchValues(batch) {
  const sections = Array.isArray(batch.sections)
    ? batch.sections
    : [];

  return [
    batch.name,
    batch.code,
    batch.academicYear,
    ...sections.flatMap((section) => [
      section.name,
      section.code,
    ]),
  ];
}

function getBatchKey(batch) {
  return batch.id;
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-4"
    >
      <span className="sr-only">
        Loading assigned batches and sections.
      </span>

      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-[#383943] bg-[#1D1F27] p-5"
        >
          <div className="h-4 w-36 rounded bg-[#343640]" />

          <div className="mt-4 h-3 w-24 rounded bg-[#343640]" />

          <div className="mt-5 h-8 w-full rounded bg-[#343640]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5"
    >
      <h3 className="text-sm font-semibold text-[#EAEAE6]">
        Unable to load assignments
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#CDB5F7] px-4 py-2 text-sm font-semibold text-[#17151E] transition-colors hover:bg-[#DCCBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
      >
        Try again
      </button>
    </div>
  );
}

const BATCH_COLUMNS = [
  {
    key: 'name',
    header: 'Batch',
    render: (_value, batch) => (
      <div className="min-w-0">
        <p className="font-medium text-[#EAEAE6]">
          {batch.name || 'Unnamed batch'}
        </p>

        <p className="mt-1 text-xs text-[#858590]">
          {batch.code || 'No batch code'}
        </p>
      </div>
    ),
  },
  {
    key: 'academicYear',
    header: 'Academic Year',
    accessor: 'academicYear',
    render: (value) => (
      <span className="text-sm text-[#C5C5CF]">
        {value || 'Not specified'}
      </span>
    ),
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
            No sections
          </span>
        );
      }

      return (
        <div className="flex max-w-xs flex-wrap gap-2">
          {sections.map((section) => (
            <span
              key={section.id}
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
    key: 'sectionCount',
    header: 'Sections',
    render: (_value, batch) => (
      <span className="inline-flex min-w-8 items-center justify-center rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-2 py-1 text-xs font-semibold text-[#CDB5F7]">
        {batch.sections.length}
      </span>
    ),
  },
];

export default function MentorBatches() {
  const [search, setSearch] = useState('');

  const [assignedBatches, setAssignedBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssignments = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const dashboard =
        await mentorDashboardService.getDashboard({
          signal,
        });

      if (signal.aborted) {
        return;
      }

      const normalizedBatches = normalizeAssignedBatches(
        dashboard.assignments,
      );

      setAssignedBatches(normalizedBatches);
    } catch (requestError) {
      if (
        signal.aborted
        || requestError?.name === 'AbortError'
        || requestError?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setError(getErrorMessage(requestError));
      setAssignedBatches([]);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadAssignments(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadAssignments]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredBatches = useMemo(
    () => assignedBatches.filter((batch) => {
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

  const assignedSectionCount = useMemo(
    () => assignedBatches.reduce(
      (total, batch) => total + batch.sections.length,
      0,
    ),
    [assignedBatches],
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-[#383943] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">
            Assigned Batches
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {loading ? '—' : assignedBatches.length}
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
            {loading ? '—' : assignedSectionCount}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#777986]">
            Sections within your assigned batches.
          </p>
        </section>
      </div>

      <SectionCard
        eyebrow="ASSIGNMENT OVERVIEW"
        title="Your academic assignments"
        description="Search your assigned batches by name, code, academic year, or section."
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
              {loading
                ? 'Loading assignments...'
                : `${filteredBatches.length} assigned ${
                    filteredBatches.length === 1
                      ? 'batch'
                      : 'batches'
                  } found`}
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

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() => {
                const controller = new AbortController();

                loadAssignments(controller.signal);
              }}
            />
          ) : (
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
                  ? 'Your HOD-assigned batches and sections will appear here when an assignment is available.'
                  : 'Try a different search term to find your assigned batch or section.'
              }
            />
          )}
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

      <div className="flex flex-wrap gap-3">
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

      {!loading && !error && assignedBatches.length === 0 && (
        <EmptyState
          title="No academic assignments yet"
          description="Your HOD-assigned batches and sections will appear here once they are assigned to your mentor account."
        />
      )}
    </div>
  );
}