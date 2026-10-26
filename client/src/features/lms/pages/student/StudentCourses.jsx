import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const COURSE_CATEGORIES = [
  { value: 'all', label: 'All Courses' },
  { value: 'core', label: 'Core Subjects' },
  { value: 'elective', label: 'Electives' },
];

const COURSE_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

// Connect this collection to the student courses API later.
// Do not populate it with fabricated course records.
const enrolledCourses = [];

function CourseCard({ course }) {
  const isCompleted = course.status === 'completed';

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-[#343640] bg-[#191A21] transition-colors hover:border-[#CDB5F7]/35">
      <div className="border-b border-[#343640] p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-lg border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 px-3 py-1.5 text-xs font-semibold text-[#CDB5F7]">
            {course.code || 'Course'}
          </span>

          <span
            className={[
              'rounded-full border px-2.5 py-1 text-[11px] font-medium',
              isCompleted
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                : 'border-[#E5DF98]/20 bg-[#E5DF98]/10 text-[#E5DF98]',
            ].join(' ')}
          >
            {isCompleted ? 'Completed' : 'In Progress'}
          </span>
        </div>

        <h3 className="mt-5 break-words text-lg font-semibold text-[#EAEAE6]">
          {course.title}
        </h3>

        {course.description && (
          <p className="mt-2 text-sm leading-6 text-[#A5A6B0]">
            {course.description}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <dl className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <dt className="text-xs text-[#858590]">Faculty</dt>
            <dd className="mt-1 break-words text-sm text-[#D1D1D8]">
              {course.facultyName || 'Not available'}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-xs text-[#858590]">Semester</dt>
            <dd className="mt-1 break-words text-sm text-[#D1D1D8]">
              {course.semester || 'Not available'}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-xs text-[#858590]">Category</dt>
            <dd className="mt-1 text-sm capitalize text-[#D1D1D8]">
              {course.category || 'Not available'}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-xs text-[#858590]">Credits</dt>
            <dd className="mt-1 text-sm text-[#D1D1D8]">
              {course.credits ?? '—'}
            </dd>
          </div>
        </dl>

        {course.id && (
          <Link
            to={`/student/courses/${encodeURIComponent(course.id)}`}
            className={[
              'mt-auto inline-flex min-h-10 items-center justify-center',
              'rounded-xl border border-[#454650] px-4 py-2',
              'text-sm font-semibold text-[#CDB5F7]',
              'transition-colors hover:border-[#CDB5F7]',
              'hover:bg-[#CDB5F7]/10',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[#CDB5F7]',
            ].join(' ')}
          >
            View Course
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        )}
      </div>
    </article>
  );
}

export default function StudentCourses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return enrolledCourses.filter((course) => {
      const matchesSearch =
        !query ||
        [
          course.title,
          course.code,
          course.description,
          course.facultyName,
        ].some((value) =>
          String(value || '').toLowerCase().includes(query),
        );

      const matchesCategory =
        selectedCategory === 'all' ||
        course.category === selectedCategory;

      const matchesStatus =
        selectedStatus === 'all' ||
        course.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, selectedCategory, selectedStatus]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all';

  function resetFilters() {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="STUDENT WORKSPACE"
        title="My Courses"
        description="Explore your enrolled subjects, access course information, and continue your learning."
        breadcrumbs={[
          { label: 'Dashboard', to: '/student/dashboard' },
          { label: 'My Courses' },
        ]}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">Enrolled Courses</p>
          <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">—</p>
          <p className="mt-2 text-xs text-[#858590]">
            Awaiting enrolled course data
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">In Progress</p>
          <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">—</p>
          <p className="mt-2 text-xs text-[#858590]">
            Active course information
          </p>
        </div>

        <div className="rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
          <p className="text-sm text-[#A5A6B0]">Completed</p>
          <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">—</p>
          <p className="mt-2 text-xs text-[#858590]">
            Completed course records
          </p>
        </div>
      </div>

      <SectionCard
        eyebrow="COURSE DIRECTORY"
        title="Find Your Courses"
        description="Search by course name, code, description, or faculty."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_200px_auto]">
          <div className="min-w-0">
            <label
              htmlFor="course-search"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Search courses
            </label>

            <input
              id="course-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name, code, faculty..."
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
              htmlFor="course-category"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Category
            </label>

            <select
              id="course-category"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
              className={[
                'min-h-11 w-full rounded-xl border border-[#454650]',
                'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            >
              {COURSE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="course-status"
              className="mb-2 block text-sm font-medium text-[#D1D1D8]"
            >
              Status
            </label>

            <select
              id="course-status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className={[
                'min-h-11 w-full rounded-xl border border-[#454650]',
                'bg-[#191A21] px-3 py-2.5 text-sm text-[#EAEAE6]',
                'focus:border-[#CDB5F7] focus:outline-none',
                'focus:ring-2 focus:ring-[#CDB5F7]/20',
              ].join(' ')}
            >
              {COURSE_STATUSES.map((status) => (
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
                  ? 'border-[#454650] text-[#D1D1D8] hover:border-[#CDB5F7] hover:text-[#CDB5F7]'
                  : 'cursor-not-allowed border-[#343640] text-[#666772]',
              ].join(' ')}
            >
              Reset filters
            </button>
          </div>
        </div>
      </SectionCard>

      <section className="mt-6" aria-labelledby="enrolled-courses-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="enrolled-courses-heading"
              className="text-lg font-semibold text-[#EAEAE6]"
            >
              Enrolled Courses
            </h2>

            <p className="mt-1 text-sm text-[#858590]">
              Your registered academic subjects.
            </p>
          </div>

          <span className="rounded-full border border-[#343640] bg-[#1D1F27] px-3 py-1.5 text-xs text-[#A5A6B0]">
            {filteredCourses.length} displayed
          </span>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              hasActiveFilters
                ? 'No matching courses'
                : 'No enrolled courses available'
            }
            description={
              hasActiveFilters
                ? 'No courses match your current search and filter selections. Try changing your search or resetting the filters.'
                : 'Your enrolled courses will appear here once your student account is connected to the course records.'
            }
            icon={
              <span aria-hidden="true" className="text-2xl">
                ▤
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
                    'hover:bg-[#CDB5F7]/10',
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343640] bg-[#1D1F27] p-5">
        <div>
          <h3 className="text-sm font-semibold text-[#EAEAE6]">
            Looking for your class schedule?
          </h3>
          <p className="mt-1 text-sm text-[#A5A6B0]">
            Visit your timetable to review your weekly schedule.
          </p>
        </div>

        <Link
          to="/student/timetable"
          className={[
            'inline-flex min-h-10 items-center justify-center',
            'rounded-xl border border-[#454650] px-4 py-2',
            'text-sm font-semibold text-[#CDB5F7]',
            'transition-colors hover:border-[#CDB5F7]',
            'hover:bg-[#CDB5F7]/10',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[#CDB5F7]',
          ].join(' ')}
        >
          Open Timetable
          <span className="ml-2" aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}