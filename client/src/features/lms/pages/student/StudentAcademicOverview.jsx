import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

import studentAttendanceService from '../../services/studentAttendanceService.js';
import studentCourseService from '../../services/studentCourseService.js';
import studentAssignmentService from '../../services/studentAssignmentService.js';
import studentQuizService from '../../services/studentQuizService.js';
import studentQuizResultService from '../../services/studentQuizResultService.js';

const ACADEMIC_SECTIONS = [
  {
    id: 'attendance',
    title: 'Attendance Overview',
    description: 'Review attendance percentages and recorded class history.',
    path: '/student/attendance',
    icon: '◷',
  },
  {
    id: 'courses',
    title: 'Course Overview',
    description: 'View your enrolled courses and learning information.',
    path: '/student/courses',
    icon: '▤',
  },
  {
    id: 'assignments',
    title: 'Assignment Status',
    description: 'Review available assignments and deadlines.',
    path: '/student/assignments',
    icon: '✓',
  },
  {
    id: 'quizzes',
    title: 'Quiz Overview',
    description: 'Review available quizzes and assessment activity.',
    path: '/student/quizzes',
    icon: '◇',
  },
  {
    id: 'results',
    title: 'Results Summary',
    description: 'Review marks from your submitted quiz attempts.',
    path: '/student/results',
    icon: '↗',
  },
];

const EMPTY_ACADEMIC_DATA = {
  attendance: [],
  courses: [],
  assignments: [],
  quizzes: [],
  results: [],
};

function getRecordStatus(record) {
  return String(record?.status || '').toLowerCase();
}

function calculateAttendance(records) {
  const validRecords = records.filter((record) =>
    ['present', 'absent', 'late'].includes(getRecordStatus(record)),
  );

  if (validRecords.length === 0) return null;

  const presentCount = validRecords.filter(
    (record) => getRecordStatus(record) === 'present',
  ).length;

  return Math.round((presentCount / validRecords.length) * 100);
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Unable to load this section.'
  );
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function StudentAcademicOverview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [academicData, setAcademicData] = useState(EMPTY_ACADEMIC_DATA);
  const [sectionErrors, setSectionErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadAcademicData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError('');

    const requests = [
      {
        key: 'attendance',
        request: () => studentAttendanceService.getMyAttendance(),
      },
      {
        key: 'courses',
        request: () => studentCourseService.getMyCourses(),
      },
      {
        key: 'assignments',
        request: () => studentAssignmentService.getMyAssignments(),
      },
      {
        key: 'quizzes',
        request: () => studentQuizService.getMyQuizzes(),
      },
      {
        key: 'results',
        request: () => studentQuizResultService.getMyResults(),
      },
    ];

    const settledResults = await Promise.allSettled(
      requests.map(({ request }) => request()),
    );

    const nextData = { ...EMPTY_ACADEMIC_DATA };
    const nextErrors = {};

    settledResults.forEach((result, index) => {
      const key = requests[index].key;

      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        nextData[key] = result.value;
      } else {
        nextErrors[key] =
          result.status === 'rejected'
            ? getErrorMessage(result.reason)
            : 'The API returned an unexpected response.';
      }
    });

    setAcademicData(nextData);
    setSectionErrors(nextErrors);

    if (Object.keys(nextErrors).length === requests.length) {
      setLoadError(
        'Academic information could not be loaded. Please check your connection and try again.',
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadAcademicData();
  }, [loadAcademicData]);

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return ACADEMIC_SECTIONS;

    return ACADEMIC_SECTIONS.filter(
      (section) =>
        section.title.toLowerCase().includes(query) ||
        section.description.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const attendancePercentage = calculateAttendance(
    academicData.attendance,
  );

  const summaryItems = [
    {
      label: 'Attendance',
      value:
        attendancePercentage === null
          ? '—'
          : `${attendancePercentage}%`,
      detail: 'Recorded class attendance',
      path: '/student/attendance',
      error: sectionErrors.attendance,
    },
    {
      label: 'Courses',
      value: sectionErrors.courses
        ? '—'
        : academicData.courses.length,
      detail: 'Enrolled courses',
      path: '/student/courses',
      error: sectionErrors.courses,
    },
    {
      label: 'Assignments',
      value: sectionErrors.assignments
        ? '—'
        : academicData.assignments.length,
      detail: 'Available assignments',
      path: '/student/assignments',
      error: sectionErrors.assignments,
    },
    {
      label: 'Quizzes',
      value: sectionErrors.quizzes
        ? '—'
        : academicData.quizzes.length,
      detail: 'Available quizzes',
      path: '/student/quizzes',
      error: sectionErrors.quizzes,
    },
  ];

  const latestResults = useMemo(
    () =>
      [...academicData.results]
        .sort((a, b) => {
          const dateA = new Date(a.submittedAt || 0).getTime();
          const dateB = new Date(b.submittedAt || 0).getTime();

          return dateB - dateA;
        })
        .slice(0, 5),
    [academicData.results],
  );

  const completedSections = Object.keys(sectionErrors).length;
  const hasSectionErrors = completedSections > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="Academic Overview"
        description="A consolidated view of your attendance, courses, assignments, quizzes, and submitted quiz results."
        breadcrumbs={[
          { label: 'Student', to: '/student/dashboard' },
          { label: 'Academic Overview' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => loadAcademicData(true)}
            disabled={loading || refreshing}
            className={[
              'inline-flex min-h-10 items-center justify-center',
              'rounded-xl border border-[#454650] px-4 py-2',
              'text-sm font-semibold text-[#CDB5F7]',
              'transition-colors hover:border-[#CDB5F7]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            ].join(' ')}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/5 p-4"
        >
          <p className="text-sm text-red-300">{loadError}</p>

          <button
            type="button"
            onClick={() => loadAcademicData()}
            className="mt-3 rounded-lg border border-[#454650] px-3 py-2 text-sm font-medium text-[#CDB5F7] hover:border-[#CDB5F7]"
          >
            Try Again
          </button>
        </div>
      )}

      {hasSectionErrors && !loadError && (
        <div
          role="status"
          className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"
        >
          <p className="text-sm leading-6 text-amber-200">
            Some academic information could not be loaded. Available
            sections are still displayed; refresh to try again.
          </p>
        </div>
      )}

      <SectionCard
        title="Academic Summary"
        description="Metrics calculated from the academic records available to your account."
      >
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#343640] bg-[#26272B] p-6 text-sm text-[#A5A6B0]"
          >
            Loading your academic information...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={[
                  'rounded-xl border border-[#343640] bg-[#26272B] p-4',
                  'transition hover:border-[#CDB5F7]/50',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[#CDB5F7]',
                ].join(' ')}
              >
                <p className="text-sm text-[#A5A6B0]">
                  {item.label}
                </p>

                <p className="mt-3 break-words text-3xl font-semibold text-[#EAEAE6]">
                  {item.value}
                </p>

                <p className="mt-2 text-xs text-[#777985]">
                  {item.error ? 'Data unavailable' : item.detail}
                </p>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-[#777985]">
          A dash means a metric is unavailable or no attendance records
          have been recorded. It does not mean zero.
        </p>
      </SectionCard>

      <SectionCard
        title="Academic Activities"
        description="Choose an area to review its detailed academic information."
      >
        <div>
          <label
            htmlFor="academic-overview-search"
            className="mb-2 block text-sm font-medium text-[#EAEAE6]"
          >
            Find an academic section
          </label>

          <input
            id="academic-overview-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search attendance, courses, assignments..."
            className={[
              'w-full rounded-xl border border-[#3B3C43]',
              'bg-[#26272B] px-4 py-3 text-sm text-[#EAEAE6]',
              'placeholder:text-[#777985]',
              'focus:border-[#CDB5F7] focus:outline-none',
              'focus:ring-2 focus:ring-[#CDB5F7]/20',
            ].join(' ')}
          />
        </div>

        <div className="mt-5">
          {filteredSections.length === 0 ? (
            <EmptyState
              title="No matching academic sections"
              description="Try a different search term."
              icon="⌕"
              action={
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                >
                  Clear search
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredSections.map((section) => (
                <article
                  key={section.id}
                  className="flex flex-col rounded-xl border border-[#343640] bg-[#26272B] p-5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#CDB5F7]/10 text-lg text-[#CDB5F7]"
                    >
                      {section.icon}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#EAEAE6]">
                        {section.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#343640] pt-4">
                    <Link
                      to={section.path}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                    >
                      View details
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Recent Quiz Results"
        description="Your latest submitted quiz attempts and recorded marks."
      >
        {loading ? (
          <p className="text-sm text-[#A5A6B0]" role="status">
            Loading quiz results...
          </p>
        ) : sectionErrors.results ? (
          <EmptyState
            title="Results unavailable"
            description="Quiz results could not be loaded. Visit the results page or refresh the overview."
            icon="↗"
            action={
              <Link
                to="/student/results"
                className="inline-flex rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Open My Results
              </Link>
            }
          />
        ) : latestResults.length === 0 ? (
          <EmptyState
            title="No submitted quiz results yet"
            description="Your quiz scores will appear here after you submit a quiz and its result is recorded."
            icon="↗"
            action={
              <Link
                to="/student/results"
                className="inline-flex rounded-xl border border-[#3B3C43] px-4 py-2.5 text-sm font-medium text-[#EAEAE6] transition hover:bg-[#26272B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                Open My Results
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {latestResults.map((result) => (
              <article
                key={result.id}
                className="flex flex-col gap-3 rounded-xl border border-[#343640] bg-[#26272B] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="break-words font-medium text-[#EAEAE6]">
                    {result.title}
                  </h3>

                  <p className="mt-1 text-sm text-[#A5A6B0]">
                    {result.courseName || 'Course unavailable'}
                  </p>

                  <p className="mt-1 text-xs text-[#777985]">
                    Submitted {formatDate(result.submittedAt)}
                  </p>
                </div>

                <div className="shrink-0 sm:text-right">
                  <p className="text-lg font-semibold text-[#CDB5F7]">
                    {typeof result.obtainedMarks === 'number' &&
                    typeof result.totalMarks === 'number'
                      ? `${result.obtainedMarks} / ${result.totalMarks}`
                      : 'Marks unavailable'}
                  </p>

                  <p className="mt-1 text-xs text-[#A5A6B0]">
                    {typeof result.percentage === 'number'
                      ? `${result.percentage}%`
                      : 'Percentage unavailable'}
                  </p>
                </div>
              </article>
            ))}

            <div className="pt-2">
              <Link
                to="/student/results"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
              >
                View all results
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}