import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import useAuth from '../../../auth/context/useAuth.js';
import api from '../../../auth/services/api/axios.js';

import ActionButton from '../../components/ActionButton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import SectionCard from '../../components/SectionCard.jsx';

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

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getRecordId(record) {
  return record?.id || record?._id || '';
}

function getRecordName(record) {
  return (
    record?.fullName ||
    record?.name ||
    record?.title ||
    record?.code ||
    'Unnamed'
  );
}

function getInstructorName(course) {
  const instructor = course?.faculty;

  if (typeof instructor === 'string') {
    return 'Assigned instructor';
  }

  return (
    instructor?.fullName ||
    instructor?.name ||
    (instructor?.role === 'HOD' ? 'HOD' : 'Not assigned')
  );
}

function getBatchNames(course) {
  if (!Array.isArray(course?.batches) || course.batches.length === 0) {
    return 'No batches assigned';
  }

  return course.batches
    .map((batch) => {
      if (typeof batch === 'string') {
        return batch;
      }

      return batch?.name || batch?.code || 'Batch';
    })
    .join(', ');
}

function getSectionNames(course) {
  if (!Array.isArray(course?.sections) || course.sections.length === 0) {
    return 'No sections assigned';
  }

  return course.sections
    .map((section) => {
      if (typeof section === 'string') {
        return section;
      }

      return section?.name || section?.code || 'Section';
    })
    .join(', ');
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

export default function CourseOverview() {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const currentUserId = getRecordId(user);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setDirectoryError('');

    try {
      const [courseResponse, facultyResponse, batchResponse] =
        await Promise.all([
          api.get('/v1/courses/department', {
            params: {
              page: 1,
              limit: 100,
            },
          }),
          api.get('/v1/provisioning/faculty', {
            params: {
              page: 1,
              limit: 100,
              status: 'ACTIVE',
            },
          }),
          api.get('/v1/provisioning/batches', {
            params: {
              page: 1,
              limit: 100,
              status: 'ACTIVE',
            },
          }),
        ]);

      const courseData = getResponseData(courseResponse);
      const facultyData = getResponseData(facultyResponse);
      const batchData = getResponseData(batchResponse);

      setCourses(
        Array.isArray(courseData.courses)
          ? courseData.courses
          : [],
      );

      setFaculty(
        Array.isArray(facultyData.faculty)
          ? facultyData.faculty
          : [],
      );

      setBatches(
        Array.isArray(batchData.batches)
          ? batchData.batches
          : [],
      );
    } catch (error) {
      setDirectoryError(
        getErrorMessage(
          error,
          'Unable to load department course information.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const filteredCourses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return courses;
    }

    return courses.filter((course) => {
      const searchableValues = [
        course?.title,
        course?.name,
        course?.code,
        course?.description,
        getInstructorName(course),
        getBatchNames(course),
        getSectionNames(course),
        course?.semester,
        course?.category,
      ];

      return searchableValues.some((value) =>
        String(value || '').toLowerCase().includes(query),
      );
    });
  }, [courses, searchTerm]);

  const activeCourses = useMemo(
    () =>
      courses.filter(
        (course) =>
          String(course?.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
      ),
    [courses],
  );

  const assignedCourses = useMemo(
    () =>
      courses.filter((course) => {
        const instructor = course?.faculty;

        const instructorId =
          typeof instructor === 'string'
            ? instructor
            : getRecordId(instructor);

        return Boolean(instructorId);
      }),
    [courses],
  );

  function handleFormChange(event) {
    const { name, value, selectedOptions } = event.target;

    if (name === 'batchIds') {
      setForm((current) => ({
        ...current,
        batchIds: Array.from(
          selectedOptions,
          (option) => option.value,
        ),
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetCreateForm() {
    setForm(INITIAL_FORM);
    setFormError('');
    setSuccessMessage('');
    setShowCreateForm(false);
  }

  async function handleCreateCourse(event) {
    event.preventDefault();

    setFormError('');
    setSuccessMessage('');

    const title = form.title.trim();
    const code = form.code.trim().toUpperCase();

    if (title.length < 2 || title.length > 150) {
      setFormError(
        'Course title must contain between 2 and 150 characters.',
      );
      return;
    }

    if (
      code.length < 2 ||
      code.length > 30 ||
      !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)
    ) {
      setFormError(
        'Enter a valid course code using letters, numbers, and hyphens.',
      );
      return;
    }

    const credits = Number(form.credits);

    if (
      !Number.isFinite(credits) ||
      credits < 0 ||
      credits > 30
    ) {
      setFormError('Credits must be between 0 and 30.');
      return;
    }

    if (
      form.semester.trim() &&
      form.semester.trim().length > 30
    ) {
      setFormError('Semester cannot exceed 30 characters.');
      return;
    }

    if (!currentUserId && form.instructorId === '__self__') {
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
      title,
      code,
      description: form.description.trim(),
      instructorId,
      semester: form.semester.trim(),
      category: form.category,
      credits,
      batchIds: form.batchIds,
      sectionIds: [],
    };

    setCreating(true);

    try {
      const response = await api.post(
        '/v1/courses/department',
        payload,
      );

      const responseData = getResponseData(response);

      setSuccessMessage(
        responseData?.message ||
          response?.data?.message ||
          'Course created successfully.',
      );

      setForm(INITIAL_FORM);
      setShowCreateForm(false);

      await loadDirectory();
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
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="ACADEMIC OVERSIGHT"
        title="Course Management"
        description="Manage department courses, instructor allocations, and academic assignments."
        breadcrumbs={[
          { label: 'HOD Dashboard', to: '/hod/dashboard' },
          { label: 'Academic Oversight' },
          { label: 'Courses' },
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
              onClick={loadDirectory}
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
          className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
        >
          <p>{directoryError}</p>

          <button
            type="button"
            onClick={loadDirectory}
            className="mt-2 font-medium underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          {successMessage}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Department Courses
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {loading ? '—' : courses.length}
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Courses registered in your department
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Active Courses
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {loading ? '—' : activeCourses.length}
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Courses currently marked active
          </p>
        </div>

        <div className="rounded-xl border border-[#343640] bg-[#191A21] p-5">
          <p className="text-sm text-[#9697A2]">
            Instructor Allocations
          </p>

          <p className="mt-3 text-2xl font-semibold text-[#EAEAE6]">
            {loading ? '—' : assignedCourses.length}
          </p>

          <p className="mt-2 text-xs text-[#777986]">
            Courses with an instructor assigned
          </p>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-6">
          <SectionCard
            eyebrow="NEW COURSE"
            title="Create Department Course"
            description="Create a course and optionally assign an instructor and batches."
          >
            <form onSubmit={handleCreateCourse}>
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
                  placeholder="e.g. 3 or Semester 3"
                  maxLength={30}
                />

                <div>
                  <label
                    htmlFor="courseCategory"
                    className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                  >
                    Course Category
                  </label>

                  <select
                    id="courseCategory"
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  >
                    <option value="CORE">Core</option>
                    <option value="ELECTIVE">Elective</option>
                  </select>
                </div>

                <FormField
                  label="Credits"
                  name="credits"
                  type="number"
                  value={form.credits}
                  onChange={handleFormChange}
                  min="0"
                  max="30"
                  step="0.5"
                  required
                />

                <div>
                  <label
                    htmlFor="courseInstructor"
                    className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                  >
                    Instructor
                  </label>

                  <select
                    id="courseInstructor"
                    name="instructorId"
                    value={form.instructorId}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  >
                    <option value="">Do not assign yet</option>

                    {currentUserId && (
                      <option value="__self__">
                        Assign to myself (HOD)
                      </option>
                    )}

                    {faculty.map((member) => {
                      const id = getRecordId(member);

                      if (!id || id === currentUserId) {
                        return null;
                      }

                      return (
                        <option key={id} value={id}>
                          {getRecordName(member)}
                          {member?.role
                            ? ` — ${member.role}`
                            : ''}
                        </option>
                      );
                    })}
                  </select>

                  <p className="mt-2 text-xs leading-5 text-[#777986]">
                    You can assign the course to yourself or to an active
                    faculty member/mentor in your department.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="courseBatches"
                    className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                  >
                    Assign Batches
                  </label>

                  <select
                    id="courseBatches"
                    name="batchIds"
                    multiple
                    value={form.batchIds}
                    onChange={handleFormChange}
                    className="min-h-32 w-full rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  >
                    {batches.map((batch) => {
                      const id = getRecordId(batch);

                      if (!id) {
                        return null;
                      }

                      return (
                        <option key={id} value={id}>
                          {getRecordName(batch)}
                          {batch?.academicYear
                            ? ` — ${batch.academicYear}`
                            : ''}
                        </option>
                      );
                    })}
                  </select>

                  <p className="mt-2 text-xs leading-5 text-[#777986]">
                    Use Ctrl (Windows) or Command (Mac) to select multiple
                    batches. Leave empty if allocation will be done later.
                  </p>

                  {batches.length === 0 && (
                    <p className="mt-2 text-xs text-amber-200">
                      No active batches were returned by the server.
                      Create a batch before assigning one here.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="courseDescription"
                    className="mb-2 block text-sm font-medium text-[#D0D0D8]"
                  >
                    Description
                  </label>

                  <textarea
                    id="courseDescription"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    rows={4}
                    maxLength={2000}
                    placeholder="Describe the course and its academic scope..."
                    className="w-full resize-y rounded-xl border border-[#383943] bg-[#191A21] px-4 py-3 text-sm text-[#EAEAE6] outline-none transition placeholder:text-[#777986] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  />

                  <p className="mt-2 text-xs text-[#777986]">
                    {form.description.length}/2000 characters
                  </p>
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
                >
                  {formError}
                </div>
              )}

              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#343640] pt-5">
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={resetCreateForm}
                  disabled={creating}
                >
                  Cancel
                </ActionButton>

                <ActionButton type="submit" disabled={creating}>
                  {creating ? 'Creating Course...' : 'Create Course'}
                </ActionButton>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <Link to="/hod/assignments">
          <ActionButton variant="secondary">
            Assignments
          </ActionButton>
        </Link>

        <Link to="/hod/quizzes">
          <ActionButton variant="secondary">
            Quizzes
          </ActionButton>
        </Link>

        <Link to="/hod/results">
          <ActionButton variant="secondary">
            Results
          </ActionButton>
        </Link>
      </div>

      <SectionCard
        eyebrow="COURSE DIRECTORY"
        title="All Department Courses"
        description="Search and review the courses registered in your department."
      >
        <div className="mb-5 max-w-md">
          <SearchInput
            name="courseSearch"
            label="Search courses"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search title, code, instructor, or batch..."
          />
        </div>

        {loading ? (
          <div
            role="status"
            className="rounded-xl border border-[#343640] bg-[#191A21] p-8 text-center text-sm text-[#9697A2]"
          >
            Loading department courses...
          </div>
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            title={
              searchTerm.trim()
                ? 'No matching courses'
                : 'No department courses yet'
            }
            description={
              searchTerm.trim()
                ? 'Try another course title, code, instructor, or batch.'
                : 'Create a course to start managing your department curriculum.'
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
                  Create First Course
                </ActionButton>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#343640]">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-[#202129] text-xs uppercase tracking-wider text-[#9697A2]">
                <tr>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Instructor</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Sections</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#343640]">
                {filteredCourses.map((course, index) => {
                  const courseId = getRecordId(course);

                  return (
                    <tr
                      key={courseId || index}
                      className="bg-[#191A21] hover:bg-[#202129]"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#EAEAE6]">
                          {course?.title || course?.name || 'Untitled course'}
                        </p>

                        <p className="mt-1 max-w-xs truncate text-xs text-[#777986]">
                          {course?.semester
                            ? `Semester ${course.semester}`
                            : 'Semester not specified'}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {course?.code || '—'}
                      </td>

                      <td className="px-4 py-4 text-[#D0D0D8]">
                        {getInstructorName(course)}
                      </td>

                      <td className="max-w-xs px-4 py-4 text-[#D0D0D8]">
                        {getBatchNames(course)}
                      </td>

                      <td className="max-w-xs px-4 py-4 text-[#D0D0D8]">
                        {getSectionNames(course)}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-[#454650] px-2.5 py-1 text-xs text-[#C8C8D0]">
                          {course?.status || 'ACTIVE'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          to="/hod/courses/details"
                          state={{ course }}
                          className="font-medium text-[#CDB5F7] hover:text-[#E0D4FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CDB5F7]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}