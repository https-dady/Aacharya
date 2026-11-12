import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import useAuth from '../../../auth/context/useAuth.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import courseManagementService from '../../services/courseManagementService.js';
import facultyManagementService from '../../services/facultyManagementService.js';
import batchManagementService from '../../services/batchManagementService.js';

const PAGE_SIZE = 20;

const INITIAL_FORM = {
  title: '',
  code: '',
  description: '',
  instructorId: '',
  semester: '',
  category: 'CORE',
  credits: '0',
  batchIds: [],
};

function getRecordId(record) {
  if (!record) {
    return '';
  }

  return String(record.id ?? record._id ?? '');
}

function getInstructorName(course) {
  if (!course.faculty) {
    return 'Not assigned';
  }

  if (typeof course.faculty === 'string') {
    return 'Assigned instructor';
  }

  return (
    course.faculty.fullName ||
    course.faculty.name ||
    'Assigned instructor'
  );
}

function getReferenceNames(references, fallback) {
  if (!Array.isArray(references) || references.length === 0) {
    return fallback;
  }

  return references
    .map((reference) => {
      if (typeof reference === 'string') {
        return reference;
      }

      return (
        reference.name ||
        reference.code ||
        'Unnamed'
      );
    })
    .join(', ');
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function StatusBadge({ status }) {
  const active = String(status).toUpperCase() === 'ACTIVE';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        active
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-[#454650] bg-[#26272B] text-[#B4B4BE]'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
      <p className="text-sm text-[#9697A2]">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
        {value}
      </p>

      <p className="mt-2 text-xs text-[#777986]">
        {description}
      </p>
    </div>
  );
}

export default function CourseOverview() {
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batches, setBatches] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [refreshVersion, setRefreshVersion] = useState(0);

  const currentUserId = getRecordId(user);

  const activeCourses = useMemo(
    () =>
      courses.filter(
        (course) => course.status === 'ACTIVE',
      ),
    [courses],
  );

  const assignedCourses = useMemo(
    () =>
      courses.filter(
        (course) => Boolean(getRecordId(course.faculty)),
      ),
    [courses],
  );

  const loadDirectory = useCallback(async (signal) => {
    setLoading(true);
    setDirectoryError('');

    try {
      const [
        courseResult,
        facultyResult,
        batchResult,
      ] = await Promise.all([
        courseManagementService.listCourses(
          {
            page: pagination.page,
            limit: pagination.limit,
            search: searchTerm.trim(),
          },
          { signal },
        ),

        facultyManagementService.listFaculty(
          {
            page: 1,
            limit: 100,
            status: 'ACTIVE',
          },
          { signal },
        ),

        batchManagementService.listBatches(
          {
            page: 1,
            limit: 100,
            status: 'ACTIVE',
          },
          { signal },
        ),
      ]);

      if (signal.aborted) {
        return;
      }

      setCourses(courseResult.courses);
      setPagination(courseResult.pagination);
      setFaculty(facultyResult.faculty);
      setBatches(batchResult.batches);
    } catch (error) {
      if (
        signal.aborted ||
        error?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      setDirectoryError(
        getErrorMessage(
          error,
          'Unable to load department course information.',
        ),
      );
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        loadDirectory(controller.signal);
      }
    });

    return () => {
      controller.abort();
    };
  }, [loadDirectory, refreshVersion]);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }, []);

  const handleFormChange = useCallback((event) => {
    const { name, value, selectedOptions } = event.target;

    if (name === 'batchIds') {
      const selectedBatchIds = Array.from(
        selectedOptions,
        (option) => option.value,
      );

      setForm((current) => ({
        ...current,
        batchIds: selectedBatchIds,
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }, []);

  const resetCreateForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setFormError('');
    setShowCreateForm(false);
  }, []);

  const handleCreateCourse = useCallback(async (event) => {
    event.preventDefault();

    setFormError('');
    setSuccessMessage('');

    if (
      form.instructorId === '__self__' &&
      !currentUserId
    ) {
      setFormError(
        'Your account ID is unavailable. Refresh your session and try again.',
      );

      return;
    }

    const instructorId =
      form.instructorId === '__self__'
        ? currentUserId
        : form.instructorId || null;

    const payload = {
      title: form.title,
      code: form.code,
      description: form.description,
      instructorId,
      semester: form.semester,
      category: form.category,
      credits: Number(form.credits),
      batchIds: form.batchIds,
      sectionIds: [],
    };

    setCreating(true);

    try {
      const result =
        await courseManagementService.createCourse(payload);

      setSuccessMessage(
        result.message || 'Course created successfully.',
      );

      setForm(INITIAL_FORM);
      setShowCreateForm(false);

      setPagination((current) => ({
        ...current,
        page: 1,
      }));

      setSearchTerm('');

      setRefreshVersion((current) => current + 1);
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          'Unable to create the course. Please try again.',
        ),
      );
    } finally {
      setCreating(false);
    }
  }, [form, currentUserId]);

  const handlePageChange = useCallback((nextPage) => {
    setPagination((current) => ({
      ...current,
      page: nextPage,
    }));
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshVersion((current) => current + 1);
  }, []);

  const showingStart = pagination.total === 0
    ? 0
    : ((pagination.page - 1) * pagination.limit) + 1;

  const showingEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Course Management"
        description="Manage department courses, instructor allocations, and academic assignments."
        breadcrumbs={[
          {
            label: 'HOD Dashboard',
            to: '/hod/dashboard',
          },
          {
            label: 'Academic Oversight',
          },
          {
            label: 'Courses',
          },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <ActionButton
              onClick={() => {
                setShowCreateForm((current) => !current);
                setFormError('');
                setSuccessMessage('');
              }}
            >
              {showCreateForm ? 'Close Form' : 'Create Course'}
            </ActionButton>

            <ActionButton
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </ActionButton>
          </div>
        }
      />

      {directoryError && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
        >
          <p className="text-sm leading-6 text-red-200">
            {directoryError}
          </p>

          <button
            type="button"
            onClick={handleRefresh}
            className="mt-2 text-sm font-medium text-red-200 underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          {successMessage}
        </div>
      )}

      {/* Course Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Department Courses"
          value={loading ? '—' : pagination.total}
          description="Total registered department courses"
        />

        <SummaryCard
          label="Active Courses"
          value={loading ? '—' : activeCourses.length}
          description="Active courses on this page"
        />

        <SummaryCard
          label="Instructor Allocations"
          value={loading ? '—' : assignedCourses.length}
          description="Courses with assigned instructors on this page"
        />
      </div>

      {/* Create Course */}
      {showCreateForm && (
        <SectionCard
          eyebrow="NEW COURSE"
          title="Create Department Course"
          description="Register a new course and optionally assign an instructor and batches."
        >
          <form onSubmit={handleCreateCourse} className="space-y-6">
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
              >
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                label="Course Title"
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="e.g. Data Structures"
                required
                maxLength={150}
              />

              <FormField
                label="Course Code"
                name="code"
                value={form.code}
                onChange={handleFormChange}
                placeholder="e.g. CS-201"
                required
                maxLength={30}
              />

              <FormField
                label="Semester"
                name="semester"
                value={form.semester}
                onChange={handleFormChange}
                placeholder="e.g. Semester 3"
                maxLength={30}
              />

              <FormField
                label="Credits"
                name="credits"
                type="number"
                value={form.credits}
                onChange={handleFormChange}
                min="0"
                max="30"
                step="1"
                required
              />

              <div>
                <label
                  htmlFor="courseCategory"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Course Category
                </label>

                <select
                  id="courseCategory"
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                >
                  <option value="CORE">Core</option>
                  <option value="ELECTIVE">Elective</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="courseInstructor"
                  className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                >
                  Instructor
                </label>

                <select
                  id="courseInstructor"
                  name="instructorId"
                  value={form.instructorId}
                  onChange={handleFormChange}
                  className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                >
                  <option value="">
                    No instructor assigned
                  </option>

                  {currentUserId && (
                    <option value="__self__">
                      Assign myself as instructor
                    </option>
                  )}

                  {faculty.map((member) => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {member.fullName}
                      {member.role === 'MENTOR'
                        ? ' (Mentor)'
                        : ''}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-[#9697A2]">
                  Only active department faculty and mentors are listed.
                </p>
              </div>
            </div>

            <FormField
              label="Course Description"
              name="description"
              value={form.description}
              onChange={handleFormChange}
              placeholder="Describe the course objectives and content..."
              maxLength={2000}
            />

            <div>
              <label
                htmlFor="courseBatches"
                className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
              >
                Assign Batches
              </label>

              <select
                id="courseBatches"
                name="batchIds"
                multiple
                value={form.batchIds}
                onChange={handleFormChange}
                className="min-h-32 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
              >
                {batches.map((batch) => (
                  <option
                    key={batch.id}
                    value={batch.id}
                    className="py-1"
                  >
                    {batch.name} ({batch.code})
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-[#9697A2]">
                Hold Ctrl (Windows) or Command (Mac) to select multiple batches.
              </p>

              {batches.length === 0 && (
                <p className="mt-2 text-xs text-amber-200">
                  No active batches are available for assignment.
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={resetCreateForm}
                disabled={creating}
              >
                Cancel
              </ActionButton>

              <ActionButton
                type="submit"
                loading={creating}
              >
                Create Course
              </ActionButton>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Course Directory */}
      <SectionCard
        eyebrow="DEPARTMENT DIRECTORY"
        title="Department Courses"
        description="Browse courses registered under your department."
      >
        <div className="mb-5 max-w-xl">
          <SearchInput
            name="courseSearch"
            label="Search department courses"
            placeholder="Search by course title, code or description..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={loading}
          />
        </div>

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#343640] bg-[#191A21] px-5 py-12 text-center"
          >
            <p className="text-sm text-[#C7C7D0]">
              Loading department courses...
            </p>
          </div>
        ) : directoryError ? (
          <EmptyState
            title="Course directory unavailable"
            description="The department course directory could not be loaded."
            action={
              <ActionButton
                variant="secondary"
                onClick={handleRefresh}
              >
                Retry
              </ActionButton>
            }
          />
        ) : courses.length === 0 ? (
          <EmptyState
            title={
              searchTerm.trim()
                ? 'No matching courses'
                : 'No courses registered'
            }
            description={
              searchTerm.trim()
                ? 'Try a different course title, code or description.'
                : 'Create the first course for your department to get started.'
            }
            action={
              searchTerm.trim() ? (
                <ActionButton
                  variant="secondary"
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={() => setShowCreateForm(true)}
                >
                  Create Course
                </ActionButton>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#343640]">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Course
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Instructor
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Batches
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Sections
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Semester
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Credits
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Created
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#343640]">
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      className="bg-[#191A21] transition-colors hover:bg-[#202129]"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#EAEAE6]">
                          {course.title}
                        </p>

                        <p className="mt-1 text-xs text-[#9697A2]">
                          {course.code}
                        </p>

                        <span className="mt-2 inline-flex rounded-md bg-[#CDB5F7]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#CDB5F7]">
                          {course.category}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-[#C7C7D0]">
                        {getInstructorName(course)}
                      </td>

                      <td className="max-w-48 px-4 py-4 text-[#C7C7D0]">
                        <p className="line-clamp-2">
                          {getReferenceNames(
                            course.batches,
                            'No batches assigned',
                          )}
                        </p>
                      </td>

                      <td className="max-w-40 px-4 py-4 text-[#C7C7D0]">
                        <p className="line-clamp-2">
                          {getReferenceNames(
                            course.sections,
                            'No sections assigned',
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-[#C7C7D0]">
                        {course.semester || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#C7C7D0]">
                        {course.credits}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={course.status} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-[#C7C7D0]">
                        {formatDate(course.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          to={`/hod/courses/${course.id}`}
                          state={{ course }}
                          className="inline-flex rounded-lg border border-[#CDB5F7]/30 px-3 py-2 text-xs font-semibold text-[#CDB5F7] transition hover:bg-[#CDB5F7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#9697A2]">
                Showing{' '}
                <span className="font-medium text-[#EAEAE6]">
                  {showingStart}–{showingEnd}
                </span>{' '}
                of{' '}
                <span className="font-medium text-[#EAEAE6]">
                  {pagination.total}
                </span>{' '}
                courses
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-[#454650] px-3 py-2 text-sm text-[#EAEAE6] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-sm text-[#C7C7D0]">
                  Page {pagination.page} of{' '}
                  {Math.max(pagination.totalPages, 1)}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={
                    pagination.page >= pagination.totalPages
                  }
                  className="rounded-lg border border-[#454650] px-3 py-2 text-sm text-[#EAEAE6] transition hover:bg-[#343640] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}