import api from '../../auth/services/api/axios.js';

const QUIZ_MANAGEMENT_ENDPOINT = '/v1/quizzes/manage';

function unwrapResponse(response) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        'The quiz management request could not be completed.',
    );
  }

  return payload.data;
}

function requireIdentifier(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function normalizeQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') {
    return null;
  }

  return {
    ...quiz,
    id: String(quiz.id ?? quiz._id ?? ''),
    title: quiz.title ?? 'Untitled Quiz',
    description: quiz.description ?? '',
    course:
      quiz.course && typeof quiz.course === 'object'
        ? quiz.course
        : null,
    courseId: String(
      quiz.courseId ??
        quiz.course?._id ??
        quiz.course?.id ??
        quiz.course ??
        '',
    ),
    departmentId: String(
      quiz.departmentId ??
        quiz.department?._id ??
        quiz.department?.id ??
        quiz.department ??
        '',
    ),
    batchIds: Array.isArray(quiz.batchIds)
      ? quiz.batchIds.map((batch) =>
          String(
            typeof batch === 'object'
              ? batch.id ?? batch._id ?? ''
              : batch,
          ),
        )
      : Array.isArray(quiz.batches)
        ? quiz.batches.map((batch) =>
            String(
              typeof batch === 'object'
                ? batch.id ?? batch._id ?? ''
                : batch,
            ),
          )
        : [],
    sectionIds: Array.isArray(quiz.sectionIds)
      ? quiz.sectionIds.map((section) =>
          String(
            typeof section === 'object'
              ? section.id ?? section._id ?? ''
              : section,
          ),
        )
      : Array.isArray(quiz.sections)
        ? quiz.sections.map((section) =>
            String(
              typeof section === 'object'
                ? section.id ?? section._id ?? ''
                : section,
            ),
          )
        : [],
    startAt: quiz.startAt ?? null,
    endAt: quiz.endAt ?? null,
    durationMinutes: Number(quiz.durationMinutes ?? 0),
    totalMarks: Number(quiz.totalMarks ?? 0),
    status: String(quiz.status ?? 'DRAFT').toUpperCase(),
    questions: Array.isArray(quiz.questions)
      ? quiz.questions
      : [],
    createdAt: quiz.createdAt ?? null,
    updatedAt: quiz.updatedAt ?? null,
  };
}

function normalizeListResult(data) {
  // Support a direct array as well as the paginated response contract.
  if (Array.isArray(data)) {
    return {
      items: data.map(normalizeQuiz).filter(Boolean),
      pagination: null,
    };
  }

  if (!data || typeof data !== 'object') {
    throw new Error('The server returned an invalid quiz list.');
  }

  const items =
    data.items ??
    data.quizzes ??
    data.results ??
    data.docs;

  if (!Array.isArray(items)) {
    throw new Error('The server returned an invalid quiz list.');
  }

  return {
    items: items.map(normalizeQuiz).filter(Boolean),
    pagination: data.pagination ?? {
      page: data.page ?? 1,
      limit: data.limit ?? items.length,
      total: data.total ?? data.totalDocs ?? items.length,
      pages: data.pages ?? data.totalPages ?? 1,
    },
  };
}

function normalizeSingleQuiz(data) {
  const quiz =
    data?.quiz ??
    data?.item ??
    data;

  const normalized = normalizeQuiz(quiz);

  if (!normalized?.id) {
    throw new Error('The server returned an invalid quiz record.');
  }

  return normalized;
}

const quizManagementService = {
  /**
   * List quizzes visible to the authenticated HOD or Faculty.
   *
   * Supported filters:
   * page, limit, search, status, courseId, semester, batchId, sectionId.
   */
  async listQuizzes(filters = {}) {
    const params = {};

    const allowedFilters = [
      'page',
      'limit',
      'search',
      'status',
      'courseId',
      'semester',
      'batchId',
      'sectionId',
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

    const response = await api.get(QUIZ_MANAGEMENT_ENDPOINT, {
      params,
    });

    return normalizeListResult(unwrapResponse(response));
  },

  /**
   * Create a quiz for an existing course allocation.
   *
   * Expected payload:
   * {
   *   title,
   *   description,
   *   courseId,
   *   batchIds,
   *   sectionIds,
   *   startAt,
   *   endAt,
   *   durationMinutes,
   *   questions,
   *   status
   * }
   */
  async createQuiz(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Quiz details are required.');
    }

    requireIdentifier(payload.courseId, 'Course');

    const response = await api.post(
      QUIZ_MANAGEMENT_ENDPOINT,
      payload,
    );

    return normalizeSingleQuiz(unwrapResponse(response));
  },

  /**
   * Update an existing quiz.
   */
  async updateQuiz(quizId, payload) {
    const id = requireIdentifier(quizId, 'Quiz ID');

    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      Object.keys(payload).length === 0
    ) {
      throw new Error('At least one quiz field must be provided.');
    }

    const response = await api.patch(
      `${QUIZ_MANAGEMENT_ENDPOINT}/${encodeURIComponent(id)}`,
      payload,
    );

    return normalizeSingleQuiz(unwrapResponse(response));
  },

  /**
   * Delete an existing quiz.
   *
   * The backend remains responsible for refusing deletion when
   * quiz attempts or other protected records exist.
   */
  async deleteQuiz(quizId) {
    const id = requireIdentifier(quizId, 'Quiz ID');

    const response = await api.delete(
      `${QUIZ_MANAGEMENT_ENDPOINT}/${encodeURIComponent(id)}`,
    );

    return unwrapResponse(response);
  },
};

export default quizManagementService;