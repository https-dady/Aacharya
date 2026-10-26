import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

// Connect this collection to the authenticated student's results API.
// Expected fields:
// id, semester, subjectName, subjectCode, obtainedMarks,
// totalMarks, grade, status: published | pending
const results = [];

const RESULT_FILTERS = [
  { value: 'all', label: 'All Semesters' },
];

const RESULT_STATUSES = [
  { value: 'all', label: 'All Results' },
  { value: 'published', label: 'Published' },
  { value: 'pending', label: 'Pending Publication' },
];

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();

  if (value === 'published' || value === 'pending') {
    return value;
  }

  return 'unknown';
}

function formatMarks(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : '—';
}

function ResultStatusBadge({ status }) {
  const normalizedStatus = normalizeStatus(status);

  const styles = {
    published:
      'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    pending:
      'border-amber-400/20 bg-amber-400/10 text-amber-300',
    unknown:
      'border-[#454650] bg-[#252630] text-[#A5A6B0]',
  };

  const labels = {
    published: 'Published',
    pending: 'Pending',
    unknown: 'Unavailable',
  };

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1',
        'text-xs font-medium',
        styles[normalizedStatus],
      ].join(' ')}
    >
      {labels[normalizedStatus]}
    </span>
  );
}

function ResultCard({ result }) {
  const hasValidMarks =
    typeof result.obtainedMarks === 'number' &&
    Number.isFinite(result.obtainedMarks) &&
    typeof result.totalMarks === 'number' &&
    Number.isFinite(result.totalMarks) &&
    result.totalMarks > 0;

  const percentage = hasValidMarks
    ? (result.obtainedMarks / result.totalMarks) * 100
    : null;

  return (
    <article className="rounded-2xl border border-[#343640] bg-[#191A21] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#858590]">
            {result.subjectCode || 'Subject'}
          </p>

          <h3 className="mt-2 break-words text-base font-semibold text-[#EAEAE6]">
            {result.subjectName || 'Unnamed subject'}
          </h3>

          <p className="mt-1 text-sm text-[#A5A6B0]">
            {result.semester || 'Semester unavailable'}
          </p>
        </div>

        <ResultStatusBadge status={result.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-[#858590]">Marks Obtained</p>

          <p className="mt-2 text-2xl font-semibold text-[#EAEAE6]">
            {formatMarks(result.obtainedMarks)}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#858590]">Maximum Marks</p>

          <p className="mt-2 text-2xl font-semibold text-[#EAEAE6]">
            {formatMarks(result.totalMarks)}
          </p>
        </div>
      </div>

      {percentage !== null && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs text-[#858590]">
              Marks Percentage
            </span>

            <span className="text-sm font-semibold text-[#CDB5F7]">
              {percentage.toFixed(1)}%
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-[#30313A]"
            role="progressbar"
            aria-label={`${result.subjectName} marks percentage`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, percentage))}
          >
            <div
              className="h-full rounded-full bg-[#CDB5F7]"
              style={{
                width: `${Math.min(100, Math.max(0, percentage))}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#343640] pt-4">
        <div>
          <p className="text-xs text-[#858590]">Grade</p>

          <p className="mt-1 text-lg font-semibold text-[#EAEAE6]">
            {result.grade || '—'}
          </p>
        </div>

        <span className="text-xs text-[#858590]">
          {normalizeStatus(result.status) === 'published'
            ? 'Official result'
            : 'Awaiting publication'}
        </span>
      </div>
    </article>
  );
}

export default function StudentResults() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const semesters = useMemo(() => {
    const uniqueSemesters = [
      ...new Set(
        results
          .map((result) => result.semester)
          .filter(Boolean),
      ),
    ];

    return uniqueSemesters.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, {
        numeric: true,
      }),
    );
  }, []);

  const semesterFilters = useMemo(
    () => [
      ...RESULT_FILTERS,
      ...semesters.map((semester) => ({
        value: semester,
        label: semester,
      })),
    ],
    [semesters],
  );

  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return results.filter((result) => {
      const matchesSearch =
        !query ||
        [
          result.subjectName,
          result.subjectCode,
          result.semester,
          result.grade,
        ].some((value) =>
          String(value || '').toLowerCase().includes(query),
        );

      const matchesSemester =
        selectedSemester === 'all' ||
        result.semester === selectedSemester;

      const matchesStatus =
        selectedStatus === 'all' ||
        normalizeStatus(result.status) === selectedStatus;

      return matchesSearch && matchesSemester && matchesStatus;
    });
  }, [searchQuery, selectedSemester, selectedStatus]);

  const publishedResults = results.filter(
    (result) => normalizeStatus(result.status) === 'published',
  );

  const pendingResults = results.filter(
    (result) => normalizeStatus(result.status) === 'pending',
  );

  const validMarks = publishedResults.filter(
    (result) =>
      typeof result.obtainedMarks === 'number' &&
      Number.isFinite(result.obtainedMarks) &&
      typeof result.totalMarks === 'number' &&
      Number.isFinite(result.totalMarks) &&
      result.totalMarks > 0,
  );

  const totalObtained = validMarks.reduce(
    (total, result) => total + result.obtainedMarks,
    0,
  );

  const totalMaximum = validMarks.reduce(
    (total, result) => total + result.totalMarks,
    0,
  );

  const overallPercentage =
    totalMaximum > 0
      ? (totalObtained / totalMaximum) * 100
      : null;

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSemester !== 'all' ||
    selectedStatus !== 'all';

  function resetFilters() {
    setSearchQuery('');
    setSelectedSemester('all');
    setSelectedStatus('all');
  }

  const summaryCards = [
    {
      label: 'Published Subjects',
      value: publishedResults.length || '—',
      description: 'Subjects with published results',
      color: 'text-emerald-300',
    },
    {
      label: 'Pending Results',
      value: pendingResults.length || '—',
      description: 'Awaiting official publication',
      color: 'text-amber-300',
    },
    {
      label: 'Overall Percentage',
      value:
        overallPercentage === null
          ? '—'
          : `${overallPercentage.toFixed(1)}%`,
      description: 'Calculated from available published marks',
      color: 'text-[#CDB5F7]',
    },
    {
      label: 'CGPA',
      value: '—',
      description: 'Available when official CGPA data is connected',
      color: 'text-[#EAEAE6]',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="My Results"
        description="Review published academic results, subject-wise marks, grades, and semester performance."
        breadcrumbs={[
          { label: 'Dashboard', to: '/student/dashboard' },
          { label: 'Results' },
        ]}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5"
          >
            <p className="text-sm text-[#A5A6B0]">
              {card.label}
            </p>

            <p className={`mt-3 text-3xl font-semibold ${card.color}`}>
              {card.value}
            </p>

            <p className="mt-2 text-xs leading-5 text-[#858590]">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      <SectionCard
        eyebrow="ACADEMIC RECORD"
        title="Find Results"
        description="Search your subjects and filter results by semester and publication status."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_220px_auto]">
          <div className="min-w-0">
            <label
              htmlFor="result-search"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Search subjects
            </label>

            <input
              id="result-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Subject, code, grade..."
              className={[
                'min-h-11 w-full rounded-xl border border-[#454650]',
                'bg-[#191A21] px-4 py-2.5 text-sm text-[#EAEAE6]',
                'placeholder:text-[#777884]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            />
          </div>

          <div className="min-w-0">
            <label
              htmlFor="result-semester"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Semester
            </label>

            <select
              id="result-semester"
              value={selectedSemester}
              onChange={(event) =>
                setSelectedSemester(event.target.value)
              }
              className={[
                'min-h-11 w-full rounded-xl border border-[#454650]',
                'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            >
              {semesterFilters.map((semester) => (
                <option key={semester.value} value={semester.value}>
                  {semester.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="result-status"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Publication status
            </label>

            <select
              id="result-status"
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value)
              }
              className={[
                'min-h-11 w-full rounded-xl border border-[#454650]',
                'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            >
              {RESULT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className={[
                'min-h-11 w-full rounded-xl border px-4 py-2.5',
                'text-sm font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[#CDB5F7]',
                hasActiveFilters
                  ? 'border-[#454650] text-[#D1D1D8] hover:border-[#CDB5F7]'
                  : 'cursor-not-allowed border-[#343640] text-[#666772]',
              ].join(' ')}
            >
              Reset
            </button>
          </div>
        </div>
      </SectionCard>

      <section className="mt-6" aria-labelledby="results-list-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="results-list-heading"
              className="text-lg font-semibold text-[#EAEAE6]"
            >
              Subject Results
            </h2>

            <p className="mt-1 text-sm text-[#858590]">
              Your available academic result records.
            </p>
          </div>

          <span className="rounded-full border border-[#343640] bg-[#1D1F27] px-3 py-1.5 text-xs text-[#A5A6B0]">
            {filteredResults.length} displayed
          </span>
        </div>

        {filteredResults.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredResults.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              hasActiveFilters
                ? 'No matching results'
                : 'No results published yet'
            }
            description={
              hasActiveFilters
                ? 'No results match your selected semester, publication status, or search query. Try adjusting the filters.'
                : 'Your subject-wise marks and grades will appear here when official result records become available.'
            }
            icon={
              <span aria-hidden="true" className="text-2xl">
                ↗
              </span>
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className={[
                    'inline-flex min-h-10 items-center justify-center',
                    'rounded-xl border border-[#454650] px-4 py-2',
                    'text-sm font-semibold text-[#CDB5F7]',
                    'transition-colors hover:border-[#CDB5F7]',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[#CDB5F7]',
                  ].join(' ')}
                >
                  Clear filters
                </button>
              ) : null
            }
          />
        )}
      </section>

      <div className="mt-6 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#CDB5F7]">
          Academic support
        </p>

        <h3 className="mt-2 text-base font-semibold text-[#EAEAE6]">
          Need help with your academic progress?
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A5A6B0]">
          Your mentor can help you review attendance, identify subjects
          that need attention, and plan your academic follow-up.
        </p>

        <Link
          to="/student/attendance"
          className={[
            'mt-4 inline-flex min-h-10 items-center justify-center',
            'rounded-xl border border-[#454650] px-4 py-2',
            'text-sm font-semibold text-[#CDB5F7]',
            'transition-colors hover:border-[#CDB5F7]',
            'hover:bg-[#CDB5F7]/10',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7]',
          ].join(' ')}
        >
          Review Attendance
          <span className="ml-2" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}