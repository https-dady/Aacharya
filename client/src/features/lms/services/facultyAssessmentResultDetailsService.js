import api from '../../auth/services/api/axios.js';

const ENDPOINT = '/v1/assessments/faculty';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const RESULT_STATUSES = new Set([
  'ENTERED',
  'PENDING',
  'ABSENT',
  'EXEMPT',
]);

function normalizeId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value.id ?? value._id ?? '');
  }

  return String(value);
}

function unwrapResponse(response) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message
        || payload?.message
        || 'Unable to retrieve student assessment results.',
    );
  }

  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error(
      'The server returned an invalid assessment result response.',
    );
  }

  return payload.data;
}

function normalizePagination(pagination = {}, filters = {}) {
  const page = Number(
    pagination.page ?? filters.page ?? DEFAULT_PAGE,
  );

  const limit = Number(
    pagination.limit ?? filters.limit ?? DEFAULT_LIMIT,
  );

  const total = Number(pagination.total ?? 0);

  const totalPages = Number(
    pagination.totalPages
      ?? Math.ceil(total / Math.max(limit, 1)),
  );

  return {
    page,
    limit,
    total,
    totalPages,

    hasNextPage:
      typeof pagination.hasNextPage === 'boolean'
        ? pagination.hasNextPage
        : page < totalPages,

    hasPreviousPage:
      typeof pagination.hasPreviousPage === 'boolean'
        ? pagination.hasPreviousPage
        : page > 1,
  };
}

function normalizeSummary(summary = {}) {
  return {
    total: Number(summary.total ?? 0),
    pending: Number(summary.pending ?? 0),
    entered: Number(summary.entered ?? 0),
    absent: Number(summary.absent ?? 0),
    exempt: Number(summary.exempt ?? 0),
  };
}

function normalizeReference(reference) {
  if (!reference) {
    return null;
  }

  if (typeof reference === 'string') {
    return {
      id: reference,
      title: '',
      code: '',
    };
  }

  return {
    ...reference,

    id: normalizeId(reference),

    title: reference.title ?? '',

    code: reference.code ?? '',
  };
}

function normalizeAssessment(assessment) {
  if (!assessment || typeof assessment !== 'object') {
    throw new Error(
      'The server returned an invalid assessment record.',
    );
  }

  const id = normalizeId(
    assessment.id ?? assessment._id,
  );

  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new Error(
      'The assessment does not contain a valid identifier.',
    );
  }

  return {
    id,

    title: assessment.title ?? '',

    description: assessment.description ?? '',

    type: assessment.type ?? '',

    status: assessment.status ?? '',

    assessmentDate: assessment.assessmentDate ?? null,

    totalMarks: Number(assessment.totalMarks ?? 0),

    passingMarks: Number(assessment.passingMarks ?? 0),

    course: normalizeReference(assessment.course),

    publishedAt: assessment.publishedAt ?? null,

    closedAt: assessment.closedAt ?? null,
  };
}

function normalizeStudent(student) {
  if (!student) {
    return null;
  }

  return {
    id: normalizeId(student),

    fullName: student.fullName ?? '',

    institutionalId: student.institutionalId ?? '',
  };
}

function normalizeEvaluator(evaluator) {
  if (!evaluator) {
    return null;
  }

  return {
    id: normalizeId(evaluator),

    fullName: evaluator.fullName ?? '',

    institutionalId: evaluator.institutionalId ?? '',
  };
}

function normalizeResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error(
      'The server returned an invalid student result record.',
    );
  }

  const id = normalizeId(
    result.id ?? result._id,
  );

  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new Error(
      'A student result record contains an invalid identifier.',
    );
  }

  const status = String(
    result.status ?? '',
  ).toUpperCase();

  if (!RESULT_STATUSES.has(status)) {
    throw new Error(
      'A student result record contains an invalid status.',
    );
  }

  const marksObtained =
    result.marksObtained === null
    || result.marksObtained === undefined
      ? null
      : Number(result.marksObtained);

  const totalMarks = Number(result.totalMarks ?? 0);

  const percentage =
    result.percentage === null
    || result.percentage === undefined
      ? null
      : Number(result.percentage);

  return {
    id,

    student: normalizeStudent(result.student),

    marksObtained,

    totalMarks,

    percentage,

    passed:
      typeof result.passed === 'boolean'
        ? result.passed
        : null,

    status,

    remarks: result.remarks ?? '',

    evaluatedBy: normalizeEvaluator(result.evaluatedBy),

    evaluatedAt: result.evaluatedAt ?? null,

    publishedAt: result.publishedAt ?? null,

    createdAt: result.createdAt ?? null,

    updatedAt: result.updatedAt ?? null,
  };
}

function normalizeFilters(filters = {}) {
  const params = {};

  const page = Number(
    filters.page ?? DEFAULT_PAGE,
  );

  if (
    !Number.isInteger(page)
    || page < 1
    || page > 100000
  ) {
    throw new Error(
      'Page must be an integer between 1 and 100000.',
    );
  }

  const limit = Number(
    filters.limit ?? DEFAULT_LIMIT,
  );

  if (
    !Number.isInteger(limit)
    || limit < 1
    || limit > MAX_LIMIT
  ) {
    throw new Error(
      `Page size must be between 1 and ${MAX_LIMIT}.`,
    );
  }

  params.page = page;
  params.limit = limit;

  if (filters.search !== undefined && filters.search !== null) {
    const search = String(filters.search).trim();

    if (search.length > 200) {
      throw new Error(
        'Student search cannot exceed 200 characters.',
      );
    }

    if (search) {
      params.search = search;
    }
  }

  if (filters.status) {
    const status = String(
      filters.status,
    ).toUpperCase();

    if (!RESULT_STATUSES.has(status)) {
      throw new Error(
        'Select a valid student result status.',
      );
    }

    params.status = status;
  }

  return params;
}

const facultyAssessmentResultDetailsService = {
  /**
   * Retrieves paginated student-wise results for an assessment.
   *
   * Endpoint:
   * GET /v1/assessments/faculty/:assessmentId/results
   *
   * Filters:
   * page, limit, search, status.
   */
  async listAssessmentResults(
    assessmentId,
    filters = {},
    options = {},
  ) {
    const id = normalizeId(assessmentId);

    if (!/^[a-f\d]{24}$/i.test(id)) {
      throw new Error(
        'A valid assessment identifier is required.',
      );
    }

    const params = normalizeFilters(filters);

    const response = await api.get(
      `${ENDPOINT}/${encodeURIComponent(id)}/results`,
      {
        params,

        ...(options.signal
          ? {
              signal: options.signal,
            }
          : {}),
      },
    );

    const data = unwrapResponse(response);

    if (!Array.isArray(data.results)) {
      throw new Error(
        'The server returned an invalid student results collection.',
      );
    }

    return {
      assessment: normalizeAssessment(data.assessment),

      summary: normalizeSummary(data.summary),

      results: data.results.map(normalizeResult),

      pagination: normalizePagination(
        data.pagination,
        params,
      ),

      message:
        response.data?.message
        || 'Student assessment results retrieved successfully.',
    };
  },
};

export default facultyAssessmentResultDetailsService;