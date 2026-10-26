import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const ASSESSMENT_TYPES = [
  { value: 'all', label: 'All assessments' },
  { value: 'internal', label: 'Internal assessment' },
  { value: 'midterm', label: 'Mid-term examination' },
  { value: 'practical', label: 'Practical examination' },
  { value: 'assignment', label: 'Assignment evaluation' },
  { value: 'quiz', label: 'Quiz / Test' },
];

const PUBLICATION_STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

function SummaryCard({ label, value, description, icon, accent = 'lavender' }) {
  const accentStyles = {
    lavender: 'border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-[#CDB5F7]',
    yellow: 'border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]',
    green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    neutral: 'border-[#454650] bg-[#26272B] text-[#A7A7B0]',
  };

  return (
    <article className="min-w-0 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#A5A6B0]">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#EAEAE6]">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${accentStyles[accent]}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#858590]">{description}</p>
    </article>
  );
}

function FilterSelect({ label, value, onChange, options, name }) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-semibold text-[#A5A6B0]"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          'min-h-11 w-full rounded-xl border border-[#454650]',
          'bg-[#1D1F27] px-3 text-sm text-[#EAEAE6]',
          'outline-none transition-colors',
          'focus-visible:border-[#CDB5F7] focus-visible:ring-2',
          'focus-visible:ring-[#CDB5F7]/30',
        ].join(' ')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ResultTable({ results, onSelectResult }) {
  if (results.length === 0) {
    return (
      <EmptyState
        title="No assessment results available"
        description="Published or draft assessment records will appear here when the results data is connected. You can change the filters or clear your search to review other records."
        icon={
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-7 w-7"
          >
            <path
              d="M5 4.75h14A1.25 1.25 0 0 1 20.25 6v12A1.25 1.25 0 0 1 19 19.25H5A1.25 1.25 0 0 1 3.75 18V6A1.25 1.25 0 0 1 5 4.75Z"
              strokeLinejoin="round"
            />
            <path
              d="M8 9h8M8 12.5h5M8 16h3"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#343640] text-xs uppercase tracking-wider text-[#858590]">
            <th scope="col" className="px-4 py-3 font-semibold">
              Assessment
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Course
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Class / Section
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Students
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[#343640]">
          {results.map((result) => (
            <tr
              key={result.id}
              className="transition-colors hover:bg-[#26272B]/70"
            >
              <td className="px-4 py-4">
                <p className="font-medium text-[#EAEAE6]">{result.title}</p>
                <p className="mt-1 text-xs text-[#858590]">
                  {result.assessmentLabel}
                </p>
              </td>

              <td className="px-4 py-4 text-sm text-[#B8B8C2]">
                {result.course}
              </td>

              <td className="px-4 py-4 text-sm text-[#B8B8C2]">
                {result.section}
              </td>

              <td className="px-4 py-4 text-sm text-[#B8B8C2]">
                {result.studentCount}
              </td>

              <td className="px-4 py-4">
                <span
                  className={[
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                    result.status === 'published'
                      ? 'bg-emerald-400/10 text-emerald-300'
                      : 'bg-[#E5DF98]/10 text-[#E5DF98]',
                  ].join(' ')}
                >
                  {result.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </td>

              <td className="px-4 py-4">
                <button
                  type="button"
                  onClick={() => onSelectResult(result)}
                  className={[
                    'rounded-lg px-3 py-2 text-xs font-semibold',
                    'text-[#CDB5F7] transition-colors',
                    'hover:bg-[#CDB5F7]/10',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[#CDB5F7]',
                  ].join(' ')}
                >
                  View details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentResultsPanel({ result, onClose }) {
  if (!result) {
    return null;
  }

  return (
    <SectionCard
      eyebrow="Assessment details"
      title={result.title}
      description="Student-wise performance and publication information."
      variant="elevated"
      action={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-[#B8B8C2] hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          Close details
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#343640] bg-[#14161C]/50 p-4">
          <p className="text-xs text-[#858590]">Course</p>
          <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
            {result.course}
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#14161C]/50 p-4">
          <p className="text-xs text-[#858590]">Class / Section</p>
          <p className="mt-2 break-words text-sm font-semibold text-[#EAEAE6]">
            {result.section}
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#14161C]/50 p-4">
          <p className="text-xs text-[#858590]">Students</p>
          <p className="mt-2 text-sm font-semibold text-[#EAEAE6]">
            {result.studentCount}
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#14161C]/50 p-4">
          <p className="text-xs text-[#858590]">Publication status</p>
          <p className="mt-2 text-sm font-semibold capitalize text-[#EAEAE6]">
            {result.status}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <EmptyState
          title="Student-wise records are not connected"
          description="Individual student marks, grades and feedback will be displayed here when the assessment results API provides the corresponding records. No student marks are fabricated."
          className="py-8"
        />
      </div>
    </SectionCard>
  );
}

export default function FacultyResults() {
  const [search, setSearch] = useState('');
  const [assessmentType, setAssessmentType] = useState('all');
  const [publicationStatus, setPublicationStatus] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);

  /*
   * No results endpoint has been confirmed for this page in the
   * inspected project baseline. Keep the data collection empty until
   * the real API contract is available; do not manufacture marks,
   * student records or assessment summaries.
   */
  const results = [];

  const filteredResults = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return results.filter((result) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          result.title,
          result.course,
          result.section,
          result.assessmentLabel,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesType =
        assessmentType === 'all' ||
        result.assessmentType === assessmentType;

      const matchesStatus =
        publicationStatus === 'all' ||
        result.status === publicationStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [search, assessmentType, publicationStatus, results]);

  const summary = useMemo(() => {
    const published = results.filter(
      (result) => result.status === 'published',
    ).length;

    const drafts = results.filter(
      (result) => result.status === 'draft',
    ).length;

    const studentCount = results.reduce(
      (total, result) => total + (Number(result.studentCount) || 0),
      0,
    );

    return {
      assessments: results.length,
      published,
      drafts,
      studentCount,
    };
  }, [results]);

  function clearFilters() {
    setSearch('');
    setAssessmentType('all');
    setPublicationStatus('all');
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title="Assessment Results"
        description="Review assessment records, monitor publication status and access student-wise performance details for your assigned classes."
        breadcrumbs={[
          { label: 'Faculty', to: '/faculty/dashboard' },
          { label: 'Results' },
        ]}
        actions={
          <Link
            to="/faculty/quizzes/results"
            className={[
              'inline-flex min-h-11 items-center justify-center gap-2',
              'rounded-xl border border-[#454650] bg-[#26272B]',
              'px-4 py-2.5 text-sm font-semibold text-[#EAEAE6]',
              'transition-colors hover:border-[#CDB5F7]/50',
              'hover:bg-[#303139]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
            ].join(' ')}
          >
            Quiz results
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
            >
              <path
                d="M4 10h12m-5-5 5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        }
      />

      <section
        aria-label="Assessment result summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label="Total assessments"
          value={summary.assessments}
          description="Assessment records available to you"
          accent="lavender"
          icon={
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <path
                d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v14A1.25 1.25 0 0 1 17 21.25H7A1.25 1.25 0 0 1 5.75 20V6A1.25 1.25 0 0 1 7 4.75Z"
                strokeLinejoin="round"
              />
              <path
                d="M9 9h6M9 12.5h6M9 16h3"
                strokeLinecap="round"
              />
            </svg>
          }
        />

        <SummaryCard
          label="Published"
          value={summary.published}
          description="Results available to students"
          accent="green"
          icon={
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <path
                d="m5 12.5 4.2 4.2L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="9" />
            </svg>
          }
        />

        <SummaryCard
          label="Draft results"
          value={summary.drafts}
          description="Results awaiting publication"
          accent="yellow"
          icon={
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <path
                d="M12 8v4l2.5 1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="9" />
            </svg>
          }
        />

        <SummaryCard
          label="Student result entries"
          value={summary.studentCount}
          description="Student records across assessments"
          accent="neutral"
          icon={
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <circle cx="9" cy="8" r="3.25" />
              <path
                d="M3.75 19a5.25 5.25 0 0 1 10.5 0M16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.25 4.3"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </section>

      <SectionCard
        title="Assessment records"
        description="Search and filter the results for your assigned courses and sections."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,1.5fr)_minmax(190px,1fr)_minmax(170px,1fr)]">
          <div className="min-w-0">
            <label
              htmlFor="faculty-results-search"
              className="mb-2 block text-xs font-semibold text-[#A5A6B0]"
            >
              Search assessments
            </label>

            <SearchInput
              name="faculty-results-search"
              label="Search assessments"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by assessment, course or section..."
            />
          </div>

          <FilterSelect
            name="faculty-assessment-type"
            label="Assessment type"
            value={assessmentType}
            onChange={setAssessmentType}
            options={ASSESSMENT_TYPES}
          />

          <FilterSelect
            name="faculty-publication-status"
            label="Publication status"
            value={publicationStatus}
            onChange={setPublicationStatus}
            options={PUBLICATION_STATUSES}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[#343640] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#858590]" aria-live="polite">
            Showing{' '}
            <span className="font-semibold text-[#EAEAE6]">
              {filteredResults.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-[#EAEAE6]">
              {results.length}
            </span>{' '}
            assessment records
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className={[
              'self-start rounded-lg px-3 py-2 text-sm font-semibold',
              'text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/10',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7] sm:self-auto',
            ].join(' ')}
          >
            Clear filters
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Results listing"
        description="Assessment records, student coverage and publication status."
      >
        <ResultTable
          results={filteredResults}
          onSelectResult={setSelectedResult}
        />
      </SectionCard>

      {selectedResult && (
        <StudentResultsPanel
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}

      <div className="rounded-2xl border border-[#CDB5F7]/15 bg-[#CDB5F7]/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-[#CDB5F7]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                d="M12 11v5m0-8h.01"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#EAEAE6]">
              Results data integration
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#A5A6B0]">
              This page is prepared for assessment listing, result summaries
              and student-wise details. A verified backend results contract is
              still required to load real records. Summary values remain zero
              until actual data is available; no sample marks or student
              results are being presented as real data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}