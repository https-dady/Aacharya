import api from '../../auth/services/api/axios.js';

const FACULTY_QUIZ_RESULTS_ENDPOINT = '/v1/quiz-results/faculty';

function unwrapResponse(response) {
  const body = response?.data;

  if (body?.success !== true || !body.data) {
    throw new Error(
      body?.error?.message ||
        body?.message ||
        'The Faculty quiz results request could not be completed.',
    );
  }

  return body.data;
}

function normalizeStudent(student) {
  if (!student || typeof student !== 'object') {
    return null;
  }

  return {
    id: String(student.id ?? student._id ?? ''),
    fullName: student.fullName ?? 'Unknown Student',
    institutionalId: student.institutionalId ?? '',
    email: student.email ?? null,
  };
}

function normalizeQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') {
    return null;
  }

  return {
    id: String(quiz.id ?? quiz._id ?? ''),
    title: quiz.title ?? 'Untitled Quiz',
    status: quiz.status ?? 'UNKNOWN',
  };
}

function normalizeCourse(course) {
  if (!course || typeof course !== 'object') {
    return null;
  }

  return {
    id: String(course.id ?? course._id ?? ''),
    title: course.title ?? 'Course unavailable',
    code: course.code ?? '',
    semester: course.semester ?? '',
  };
}

function normalizeQuizResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  return {
    id: String(result.id ?? result.attemptId ?? ''),
    attemptId: String(result.attemptId ?? result.id ?? ''),

    status: result.status ?? 'UNKNOWN',

    student: normalizeStudent(result.student),
    quiz: normalizeQuiz(result.quiz),
    course: normalizeCourse(result.course),

    obtainedMarks:
      typeof result.obtainedMarks === 'number'
        ? result.obtainedMarks
        : null,

    totalMarks:
      typeof result.totalMarks === 'number'
        ? result.totalMarks
        : null,

    percentage:
      typeof result.percentage === 'number'
        ? result.percentage
        : null,

    startedAt: result.startedAt ?? null,
    submittedAt: result.submittedAt ?? null,
  };
}

function normalizePagination(pagination) {
  if (!pagination || typeof pagination !== 'object') {
    return {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }

  return {
    page: Number(pagination.page ?? 1),
    limit: Number(pagination.limit ?? 20),
    total: Number(pagination.total ?? 0),
    totalPages: Number(pagination.totalPages ?? 0),
    hasPreviousPage: Boolean(pagination.hasPreviousPage),
    hasNextPage: Boolean(pagination.hasNextPage),
  };
}

const facultyQuizResultsService = {
  /**
   * List submitted quiz attempts belonging to the
   * authenticated Faculty's assigned courses.
   *
   * Supported filters:
   * - page
   * - limit
   * - quizId
   * - search
   *
   * GET /v1/quiz-results/faculty
   */
  async listResults(filters = {}) {
    const params = {};

    const allowedFilters = [
      'page',
      'limit',
      'quizId',
      'search',
    ];

    for (const key of allowedFilters) {
      const value = filters[key];

      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        params[key] = value;
      }
    }

    const response = await api.get(
      FACULTY_QUIZ_RESULTS_ENDPOINT,
      { params },
    );

    const data = unwrapResponse(response);

    if (!Array.isArray(data.items)) {
      throw new Error(
        'The server returned an invalid Faculty quiz results list.',
      );
    }

    return {
      items: data.items
        .map(normalizeQuizResult)
        .filter((item) => item && item.id),

      pagination: normalizePagination(data.pagination),
    };
  },
};

export default facultyQuizResultsService;