import api from '../../auth/services/api/axios.js';

const ASSIGNED_COURSES_ENDPOINT = '/v1/courses/assigned-to-me';

function unwrapResponse(response) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message
        || payload?.message
        || 'Unable to retrieve assigned courses.',
    );
  }

  return payload.data;
}

function normalizeReference(reference) {
  if (!reference) {
    return null;
  }

  if (typeof reference === 'string') {
    return {
      id: reference,
      name: '',
      code: '',
    };
  }

  return {
    id: String(reference.id ?? reference._id ?? ''),
    name: reference.name ?? reference.fullName ?? '',
    code: reference.code ?? '',
  };
}

function normalizeCourse(course) {
  if (!course || typeof course !== 'object') {
    throw new Error(
      'The server returned an invalid course record.',
    );
  }

  const id = String(course.id ?? course._id ?? '');

  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new Error(
      'A course record contains an invalid identifier.',
    );
  }

  return {
    id,
    title: course.title ?? '',
    code: course.code ?? '',
    description: course.description ?? '',
    semester: course.semester ?? '',
    category: course.category ?? '',
    credits: Number(course.credits ?? 0),
    status: String(course.status ?? '').toUpperCase(),

    department: normalizeReference(course.department),

    batches: Array.isArray(course.batches)
      ? course.batches.map(normalizeReference).filter(Boolean)
      : [],

    sections: Array.isArray(course.sections)
      ? course.sections.map((section) => ({
          ...normalizeReference(section),
          batch: section.batch ?? null,
        })).filter(Boolean)
      : [],

    instructor: course.instructor
      ? {
          id: String(course.instructor.id ?? ''),
          fullName: course.instructor.fullName ?? '',
          role: course.instructor.role ?? '',
        }
      : null,
  };
}

async function fetchAssignedCourses(options = {}) {
  const response = await api.get(
    ASSIGNED_COURSES_ENDPOINT,
    options.signal
      ? { signal: options.signal }
      : undefined,
  );

  const data = unwrapResponse(response);

  if (!Array.isArray(data?.courses)) {
    throw new Error(
      'The server returned an invalid assigned course list.',
    );
  }

  const courses = data.courses.map(normalizeCourse);
  const total = Number(data.total ?? courses.length);

  return {
    courses,
    total: Number.isFinite(total) && total >= 0
      ? total
      : courses.length,
  };
}

const facultyCourseService = {
  /**
   * GET /v1/courses/assigned-to-me
   *
   * Canonical response:
   * {
   *   courses: [],
   *   total: number
   * }
   */
  async listMyAssignedCourses(options = {}) {
    return fetchAssignedCourses(options);
  },

  /**
   * Compatibility adapter for FacultyAttendance.
   *
   * Response:
   * {
   *   items: [],
   *   courses: [],
   *   total: number
   * }
   */
  async listAssignedCourses(options = {}) {
    const result = await fetchAssignedCourses(options);

    return {
      items: result.courses,
      courses: result.courses,
      total: result.total,
    };
  },
};

export default facultyCourseService;