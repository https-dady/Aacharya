import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import facultyCourseService from '../../services/facultyCourseService.js';

function getErrorMessage(error) {
  return (
    error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.message
    || 'Unable to load assigned courses.'
  );
}

function CourseCard({ course }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[#343640] bg-[#191A21] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#CDB5F7]/50 hover:bg-[#202129]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#CDB5F7]/20 bg-[#CDB5F7]/10 text-sm font-bold text-[#CDB5F7]">
          {course.code?.slice(0, 2)?.toUpperCase() || 'CR'}
        </div>

        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs font-medium text-emerald-300">
          {course.status || 'ACTIVE'}
        </span>
      </div>

      <div className="mt-5 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[#9697A2]">
          {course.code || 'Course code unavailable'}
        </p>

        <h3 className="mt-2 break-words text-lg font-semibold text-[#EAEAE6] transition-colors group-hover:text-[#CDB5F7]">
          {course.title || 'Untitled Course'}
        </h3>

        <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-6 text-[#9697A2]">
          {course.description || 'No course description is available.'}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#343640] bg-[#202129] p-3">
          <p className="text-xs text-[#858590]">Semester</p>
          <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
            {course.semester || '—'}
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#202129] p-3">
          <p className="text-xs text-[#858590]">Credits</p>
          <p className="mt-1 text-sm font-medium text-[#EAEAE6]">
            {course.credits ?? '—'}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs text-[#858590]">Department</p>
          <p className="mt-1 text-sm text-[#D0D0D8]">
            {course.department?.name || 'Not available'}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#858590]">Assigned batches</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {course.batches.length > 0 ? (
              course.batches.map((batch) => (
                <span
                  key={batch.id}
                  className="rounded-lg border border-[#454650] px-2 py-1 text-xs text-[#C8C8D0]"
                >
                  {batch.name || batch.code || 'Batch'}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#777986]">
                No batches assigned
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-[#858590]">Assigned sections</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {course.sections.length > 0 ? (
              course.sections.map((section) => (
                <span
                  key={section.id}
                  className="rounded-lg border border-[#454650] px-2 py-1 text-xs text-[#C8C8D0]"
                >
                  {section.name || section.code || 'Section'}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#777986]">
                No sections assigned
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-[#343640] pt-4">
        <Link
          to="/faculty/courses/details"
          state={{ course }}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#CDB5F7]/30 bg-[#CDB5F7]/10 px-4 py-2 text-sm font-semibold text-[#CDB5F7] transition-colors hover:bg-[#CDB5F7]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
        >
          View Course Details
        </Link>
      </div>
    </article>
  );
}

export default function FacultyCourses() {
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCourses = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const result = await facultyCourseService.listMyAssignedCourses({
        signal,
      });

      if (signal?.aborted) return;

      setCourses(result.courses);
      setTotal(result.total);
    } catch (requestError) {
      if (signal?.aborted) return;

      setError(getErrorMessage(requestError));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadCourses(controller.signal);

    return () => controller.abort();
  }, [loadCourses]);

  const filteredCourses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return courses;

    return courses.filter((course) => (
      [
        course.title,
        course.code,
        course.description,
        course.category,
        course.semester,
        course.department?.name,
        ...course.batches.map((batch) => batch.name),
        ...course.sections.map((section) => section.name),
      ].some((value) =>
        String(value || '').toLowerCase().includes(query),
      )
    ));
  }, [courses, searchTerm]);

  const totalBatches = useMemo(
    () => new Set(
      courses.flatMap((course) => course.batches.map((batch) => batch.id)),
    ).size,
    [courses],
  );

  const totalSections = useMemo(
    () => new Set(
      courses.flatMap((course) => course.sections.map((section) => section.id)),
    ).size,
    [courses],
  );

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="My Courses"
        description="View your assigned courses, academic details, batches, and sections."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'My Courses',
          },
        ]}
        actions={
          <Link to="/faculty/dashboard">
            <ActionButton variant="secondary">
              Back to Dashboard
            </ActionButton>
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">Assigned Courses</p>
          <p className="mt-3 text-3xl font-semibold text-[#EAEAE6]">
            {loading ? '—' : total}
          </p>
          <p className="mt-2 text-xs text-[#777986]">
            Active courses assigned to your account.
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">Assigned Batches</p>
          <p className="mt-3 text-3xl font-semibold text-[#CDB5F7]">
            {loading ? '—' : totalBatches}
          </p>
          <p className="mt-2 text-xs text-[#777986]">
            Unique batches across your courses.
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">Assigned Sections</p>
          <p className="mt-3 text-3xl font-semibold text-[#E5DF98]">
            {loading ? '—' : totalSections}
          </p>
          <p className="mt-2 text-xs text-[#777986]">
            Unique sections across your courses.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SectionCard
          eyebrow="ACADEMIC WORKSPACE"
          title="Assigned Course Directory"
          description="Search and explore the courses assigned to your faculty account."
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-lg">
              <SearchInput
                name="facultyCourseSearch"
                label="Search courses"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by course name, code, batch..."
              />
            </div>

            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => loadCourses()}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh Courses'}
            </ActionButton>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex flex-col gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-red-300">{error}</p>

              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => loadCourses()}
              >
                Try Again
              </ActionButton>
            </div>
          )}

          {loading ? (
            <div
              role="status"
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-[#343640] bg-[#191A21] p-5"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#343640]" />
                  <div className="mt-5 h-4 w-2/3 rounded bg-[#343640]" />
                  <div className="mt-3 h-3 w-full rounded bg-[#343640]" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-[#343640]" />
                  <div className="mt-6 h-16 rounded-xl bg-[#343640]" />
                </div>
              ))}
            </div>
          ) : !error && filteredCourses.length === 0 ? (
            <EmptyState
              title={
                searchTerm.trim()
                  ? 'No matching courses'
                  : 'No assigned courses found'
              }
              description={
                searchTerm.trim()
                  ? 'Try another course name, code, batch, or section.'
                  : 'No active courses are currently assigned to your faculty account.'
              }
              action={
                searchTerm.trim() ? (
                  <ActionButton
                    variant="secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </ActionButton>
                ) : null
              }
            />
          ) : !error ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[#9697A2]">
                  Showing{' '}
                  <span className="font-semibold text-[#EAEAE6]">
                    {filteredCourses.length}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-[#EAEAE6]">
                    {total}
                  </span>{' '}
                  assigned courses
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}