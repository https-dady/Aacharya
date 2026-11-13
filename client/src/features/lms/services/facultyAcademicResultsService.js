import api from '../../auth/services/api/axios.js';

import {
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
} from './assessmentManagementService.js';

const FACULTY_ASSESSMENT_RESULTS_PATH = '/v1/assessments/faculty';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VALID_TYPES = new Set(
  Object.values(ASSESSMENT_TYPES),
);

const VALID_STATUSES = new Set(
  Object.values(ASSESSMENT_STATUSES),
);

function unwrapResponse(response, fallbackMessage) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        fallbackMessage,
    );
  }

  return payload.data;
}

function normalizeId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value.id ?? value._id ?? '');
  }

  return String(value);
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
    ...reference,
    id: normalizeId(reference),
    name:
      reference.name ??
      reference.fullName ??
      reference.title ??
      '',
    code: reference.code ?? '',
  };
}

function normalizePagination(pagination = {}, fallback = {}) {
  const page = Number(
    pagination.page ?? fallback.page ?? DEFAULT_PAGE,
  );

  const limit = Number(
    pagination.limit ?? fallback.limit ?? DEFAULT_LIMIT,
  );

  const total = Number(pagination.total ?? 0);

  const totalPages = Number(
    pagination.totalPages ??
      Math.ceil(total / Math.max(limit, 1)),
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

function normalizeResultSummary(summary = {}) {
  return {
    total: Number(summary.total ?? 0),
    entered: Number(summary.entered ?? 0),
    pending: Number(summary.pending ?? 0),
    absent: Number(summary.absent ?? 0),
    exempt: Number(summary.exempt ?? 0),

    evaluatedPercentage: Number(
      summary.evaluatedPercentage ?? 0,
    ),
  };
}

function normalizeOverallSummary(summary = {}) {
  return {
    totalAssessments: Number(
      summary.totalAssessments ?? 0,
    ),

    publishedAssessments: Number(
      summary.publishedAssessments ?? 0,
    ),

    draftAssessments: Number(
      summary.draftAssessments ?? 0,
    ),

    closedAssessments: Number(
      summary.closedAssessments ?? 0,
    ),

    totalStudentResults: Number(
      summary.totalStudentResults ?? 0,
    ),

    enteredResults: Number(
      summary.enteredResults ?? 0,
    ),

    pendingResults: Number(
      summary.pendingResults ?? 0,
    ),

    absentResults: Number(
      summary.absentResults ?? 0,
    ),

    exemptResults: Number(
      summary.exemptResults ?? 0,
    ),
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
      'The assessment record does not contain a valid identifier.',
    );
  }

  const type = String(
    assessment.type ?? '',
  ).toUpperCase();

  const status = String(
    assessment.status ?? '',
  ).toUpperCase();

  return {
    ...assessment,

    id,

    title: assessment.title ?? '',

    description: assessment.description ?? '',

    type,

    typeLabel: type.replaceAll('_', ' '),

    status,

    course: normalizeReference(assessment.course),

    batches: Array.isArray(assessment.batches)
      ? assessment.batches
          .map(normalizeReference)
          .filter(Boolean)
      : [],

    sections: Array.isArray(assessment.sections)
      ? assessment.sections
          .map(normalizeReference)
          .filter(Boolean)
      : [],

    totalMarks: Number(
      assessment.totalMarks ?? 0,
    ),

    passingMarks: Number(
      assessment.passingMarks ?? 0,
    ),

    resultSummary: normalizeResultSummary(
      assessment.resultSummary,
    ),

    createdBy: normalizeReference(
      assessment.createdBy,
    ),

    assessmentDate: assessment.assessmentDate ?? null,

    createdAt: assessment.createdAt ?? null,

    updatedAt: assessment.updatedAt ?? null,

    publishedAt: assessment.publishedAt ?? null,

    closedAt: assessment.closedAt ?? null,
  };
}

function normalizeListFilters(filters = {}) {
  const params = {};

  const page = Number(
    filters.page ?? DEFAULT_PAGE,
  );

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000
  ) {
    throw new Error(
      'Page must be an integer between 1 and 100000.',
    );
  }

  const limit = Number(
    filters.limit ?? DEFAULT_LIMIT,
  );

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIMIT
  ) {
    throw new Error(
      `Page size must be between 1 and ${MAX_LIMIT}.`,
    );
  }

  params.page = page;
  params.limit = limit;

  if (
    filters.search !== undefined &&
    filters.search !== null
  ) {
    const search = String(filters.search).trim();

    if (search.length > 200) {
      throw new Error(
        'Assessment search cannot exceed 200 characters.',
      );
    }

    if (search) {
      params.search = search;
    }
  }

  if (filters.type) {
    const type = String(
      filters.type,
    ).toUpperCase();

    if (!VALID_TYPES.has(type)) {
      throw new Error(
        'Select a valid assessment type.',
      );
    }

    params.type = type;
  }

  if (filters.status) {
    const status = String(
      filters.status,
    ).toUpperCase();

    if (!VALID_STATUSES.has(status)) {
      throw new Error(
        'Select a valid assessment status.',
      );
    }

    params.status = status;
  }

  if (filters.courseId) {
    const courseId = normalizeId(
      filters.courseId,
    );

    if (!/^[a-f\d]{24}$/i.test(courseId)) {
      throw new Error(
        'courseId must be a valid identifier.',
      );
    }

    params.courseId = courseId;
  }

  ['startDate', 'endDate'].forEach((field) => {
    if (!filters[field]) {
      return;
    }

    const date = new Date(filters[field]);

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        `${field} must be a valid date.`,
      );
    }

    params[field] = date.toISOString();
  });

  if (
    params.startDate &&
    params.endDate &&
    new Date(params.startDate) > new Date(params.endDate)
  ) {
    throw new Error(
      'End date must be on or after start date.',
    );
  }

  return params;
}

const facultyAcademicResultsService = {
  /**
   * Retrieves paginated academic assessments assigned
   * to the authenticated Faculty member.
   *
   * Filters:
   * page, limit, search, type, status,
   * courseId, startDate, endDate.
   */
  async listAssessments(filters = {}, options = {}) {
    const params = normalizeListFilters(filters);

    const response = await api.get(
      FACULTY_ASSESSMENT_RESULTS_PATH,
      {
        params,

        ...(options.signal
          ? {
              signal: options.signal,
            }
          : {}),
      },
    );

    const data = unwrapResponse(
      response,
      'Unable to retrieve Faculty academic assessments.',
    );

    if (!Array.isArray(data?.items)) {
      throw new Error(
        'The server returned an invalid Faculty assessment list.',
      );
    }

    return {
      assessments: data.items.map(normalizeAssessment),

      summary: normalizeOverallSummary(
        data.summary,
      ),

      pagination: normalizePagination(
        data.pagination,
        params,
      ),

      message:
        response.data?.message ||
        'Faculty academic results retrieved successfully.',
    };
  },
};

export default facultyAcademicResultsService;