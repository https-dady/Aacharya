import api from '../../auth/services/api/axios.js';

const ASSESSMENT_BASE_PATH = '/v1/assessments/manage';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const ASSESSMENT_TYPES = Object.freeze({
  INTERNAL: 'INTERNAL',
  MID_TERM_1: 'MID_TERM_1',
  MID_TERM_2: 'MID_TERM_2',
  CLASS_TEST: 'CLASS_TEST',
  PRACTICAL: 'PRACTICAL',
  ASSIGNMENT: 'ASSIGNMENT',
  OTHER: 'OTHER',
});

export const ASSESSMENT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
});

export const ASSESSMENT_RESULT_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  ENTERED: 'ENTERED',
  ABSENT: 'ABSENT',
  EXEMPT: 'EXEMPT',
});

const VALID_TYPES = new Set(
  Object.values(ASSESSMENT_TYPES),
);

const VALID_STATUSES = new Set(
  Object.values(ASSESSMENT_STATUSES),
);

const VALID_RESULT_STATUSES = new Set(
  Object.values(ASSESSMENT_RESULT_STATUSES),
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

    hasNextPage: page < totalPages,

    hasPreviousPage: page > 1,
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

    totalMarks: Number(assessment.totalMarks ?? 0),

    passingMarks: Number(assessment.passingMarks ?? 0),

    resultCount: Number(assessment.resultCount ?? 0),

    assessmentDate: assessment.assessmentDate ?? null,

    createdAt: assessment.createdAt ?? null,

    updatedAt: assessment.updatedAt ?? null,

    publishedAt: assessment.publishedAt ?? null,

    closedAt: assessment.closedAt ?? null,
  };
}

function normalizeAssessmentResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error(
      'The server returned an invalid student result.',
    );
  }

  const id = normalizeId(
    result.id ?? result._id,
  );

  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new Error(
      'The student result does not contain a valid identifier.',
    );
  }

  const status = String(
    result.status ?? '',
  ).toUpperCase();

  return {
    ...result,

    id,

    student: normalizeReference(result.student),

    marksObtained:
      result.marksObtained === null ||
      result.marksObtained === undefined
        ? null
        : Number(result.marksObtained),

    totalMarks: Number(result.totalMarks ?? 0),

    percentage:
      result.percentage === null ||
      result.percentage === undefined
        ? null
        : Number(result.percentage),

    passed:
      typeof result.passed === 'boolean'
        ? result.passed
        : null,

    status,

    remarks: result.remarks ?? '',

    evaluatedBy: normalizeId(result.evaluatedBy) || null,

    evaluatedAt: result.evaluatedAt ?? null,

    publishedAt: result.publishedAt ?? null,

    createdAt: result.createdAt ?? null,

    updatedAt: result.updatedAt ?? null,
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

  if (filters.search !== undefined && filters.search !== null) {
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
    const type = String(filters.type).toUpperCase();

    if (!VALID_TYPES.has(type)) {
      throw new Error(
        'Select a valid assessment type.',
      );
    }

    params.type = type;
  }

  if (filters.status) {
    const status = String(filters.status).toUpperCase();

    if (!VALID_STATUSES.has(status)) {
      throw new Error(
        'Select a valid assessment status.',
      );
    }

    params.status = status;
  }

  const identifierFilters = [
    'courseId',
    'batchId',
    'sectionId',
  ];

  identifierFilters.forEach((field) => {
    if (!filters[field]) {
      return;
    }

    const identifier = normalizeId(filters[field]);

    if (!/^[a-f\d]{24}$/i.test(identifier)) {
      throw new Error(
        `${field} must be a valid identifier.`,
      );
    }

    params[field] = identifier;
  });

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

function normalizeResultFilters(filters = {}) {
  const params = normalizeListFilters({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
  });

  delete params.page;
  delete params.limit;

  if (filters.page !== undefined) {
    params.page = Number(filters.page);
  } else {
    params.page = DEFAULT_PAGE;
  }

  if (filters.limit !== undefined) {
    params.limit = Number(filters.limit);
  } else {
    params.limit = DEFAULT_LIMIT;
  }

  if (filters.status) {
    const status = String(filters.status).toUpperCase();

    if (!VALID_RESULT_STATUSES.has(status)) {
      throw new Error(
        'Select a valid student result status.',
      );
    }

    params.status = status;
  }

  return params;
}

function validateIdentifierList(values, fieldName, maximum = 100) {
  if (values === undefined || values === null) {
    return [];
  }

  if (!Array.isArray(values)) {
    throw new Error(
      `${fieldName} must be an array.`,
    );
  }

  if (values.length > maximum) {
    throw new Error(
      `${fieldName} cannot contain more than ${maximum} records.`,
    );
  }

  const normalized = values.map((value) => {
    const identifier = normalizeId(value);

    if (!/^[a-f\d]{24}$/i.test(identifier)) {
      throw new Error(
        `${fieldName} contains an invalid identifier.`,
      );
    }

    return identifier;
  });

  return [...new Set(normalized)];
}

function normalizeCreatePayload(payload = {}) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error(
      'Assessment information is required.',
    );
  }

  const title = String(
    payload.title ?? '',
  ).trim();

  const description = String(
    payload.description ?? '',
  ).trim();

  const type = String(
    payload.type ?? '',
  ).toUpperCase();

  const courseId = normalizeId(
    payload.courseId,
  );

  const assessmentDate = new Date(
    payload.assessmentDate,
  );

  const totalMarks = Number(
    payload.totalMarks,
  );

  const passingMarks = Number(
    payload.passingMarks,
  );

  if (title.length < 2 || title.length > 200) {
    throw new Error(
      'Assessment title must contain between 2 and 200 characters.',
    );
  }

  if (description.length > 5000) {
    throw new Error(
      'Assessment description cannot exceed 5000 characters.',
    );
  }

  if (!VALID_TYPES.has(type)) {
    throw new Error(
      'Select a valid assessment type.',
    );
  }

  if (!/^[a-f\d]{24}$/i.test(courseId)) {
    throw new Error(
      'Select a valid course.',
    );
  }

  if (Number.isNaN(assessmentDate.getTime())) {
    throw new Error(
      'Enter a valid assessment date.',
    );
  }

  if (
    !Number.isFinite(totalMarks) ||
    totalMarks < 0.01 ||
    totalMarks > 10000
  ) {
    throw new Error(
      'Total marks must be greater than zero and cannot exceed 10000.',
    );
  }

  if (
    !Number.isFinite(passingMarks) ||
    passingMarks < 0 ||
    passingMarks > totalMarks
  ) {
    throw new Error(
      'Passing marks must be between zero and total marks.',
    );
  }

  const batchIds = validateIdentifierList(
    payload.batchIds,
    'Batch assignments',
    100,
  );

  const sectionIds = validateIdentifierList(
    payload.sectionIds,
    'Section assignments',
    100,
  );

  if (!batchIds.length && !sectionIds.length) {
    throw new Error(
      'Select at least one batch or section.',
    );
  }

  const requestBody = {
    title,
    description,
    type,
    courseId,
    batchIds,
    sectionIds,
    assessmentDate: assessmentDate.toISOString(),
    totalMarks,
    passingMarks,
  };

  if (payload.status !== undefined) {
    const status = String(
      payload.status,
    ).toUpperCase();

    if (!VALID_STATUSES.has(status)) {
      throw new Error(
        'Select a valid assessment status.',
      );
    }

    requestBody.status = status;
  }

  return requestBody;
}

function normalizeUpdatePayload(payload = {}) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error(
      'Assessment update information is required.',
    );
  }

  const requestBody = {};

  if (payload.title !== undefined) {
    const title = String(payload.title).trim();

    if (title.length < 2 || title.length > 200) {
      throw new Error(
        'Assessment title must contain between 2 and 200 characters.',
      );
    }

    requestBody.title = title;
  }

  if (payload.description !== undefined) {
    const description = String(
      payload.description,
    ).trim();

    if (description.length > 5000) {
      throw new Error(
        'Assessment description cannot exceed 5000 characters.',
      );
    }

    requestBody.description = description;
  }

  if (payload.type !== undefined) {
    const type = String(
      payload.type,
    ).toUpperCase();

    if (!VALID_TYPES.has(type)) {
      throw new Error(
        'Select a valid assessment type.',
      );
    }

    requestBody.type = type;
  }

  if (payload.assessmentDate !== undefined) {
    const date = new Date(payload.assessmentDate);

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        'Enter a valid assessment date.',
      );
    }

    requestBody.assessmentDate = date.toISOString();
  }

  if (payload.passingMarks !== undefined) {
    const passingMarks = Number(
      payload.passingMarks,
    );

    if (
      !Number.isFinite(passingMarks) ||
      passingMarks < 0 ||
      passingMarks > 10000
    ) {
      throw new Error(
        'Passing marks must be between zero and 10000.',
      );
    }

    requestBody.passingMarks = passingMarks;
  }

  if (payload.status !== undefined) {
    const status = String(
      payload.status,
    ).toUpperCase();

    if (!VALID_STATUSES.has(status)) {
      throw new Error(
        'Select a valid assessment status.',
      );
    }

    requestBody.status = status;
  }

  if (!Object.keys(requestBody).length) {
    throw new Error(
      'Provide at least one field to update.',
    );
  }

  return requestBody;
}

function normalizeBulkResults(results) {
  if (!Array.isArray(results) || results.length < 1) {
    throw new Error(
      'At least one student result is required.',
    );
  }

  if (results.length > 500) {
    throw new Error(
      'A maximum of 500 student results can be updated at once.',
    );
  }

  const seenStudents = new Set();

  return results.map((entry) => {
    const studentId = normalizeId(
      entry.studentId,
    );

    if (!/^[a-f\d]{24}$/i.test(studentId)) {
      throw new Error(
        'A student result contains an invalid student identifier.',
      );
    }

    if (seenStudents.has(studentId)) {
      throw new Error(
        'A student can appear only once in a bulk marks update.',
      );
    }

    seenStudents.add(studentId);

    const status = String(
      entry.status ?? '',
    ).toUpperCase();

    if (!VALID_RESULT_STATUSES.has(status)) {
      throw new Error(
        'Select a valid student result status.',
      );
    }

    const requestEntry = {
      studentId,
      status,
    };

    if (status === ASSESSMENT_RESULT_STATUSES.ENTERED) {
      const marksObtained = Number(
        entry.marksObtained,
      );

      if (
        !Number.isFinite(marksObtained) ||
        marksObtained < 0 ||
        marksObtained > 10000
      ) {
        throw new Error(
          'Entered marks must be a valid number between zero and 10000.',
        );
      }

      requestEntry.marksObtained = marksObtained;
    } else if (
      entry.marksObtained !== undefined &&
      entry.marksObtained !== null &&
      entry.marksObtained !== ''
    ) {
      throw new Error(
        'Pending, absent, and exempt results cannot contain marks.',
      );
    }

    if (entry.remarks !== undefined) {
      const remarks = String(entry.remarks).trim();

      if (remarks.length > 1000) {
        throw new Error(
          'Student remarks cannot exceed 1000 characters.',
        );
      }

      requestEntry.remarks = remarks;
    }

    return requestEntry;
  });
}

const assessmentManagementService = {
  /**
   * Retrieves assessments belonging to the authenticated
   * HOD department.
   *
   * Filters:
   * page, limit, search, type, status, courseId,
   * batchId, sectionId, startDate, endDate.
   */
  async listAssessments(filters = {}, options = {}) {
    const params = normalizeListFilters(filters);

    const response = await api.get(
      ASSESSMENT_BASE_PATH,
      {
        params,

        ...(options.signal
          ? { signal: options.signal }
          : {}),
      },
    );

    const data = unwrapResponse(
      response,
      'Unable to retrieve department assessments.',
    );

    if (!Array.isArray(data?.assessments)) {
      throw new Error(
        'The server returned an invalid assessment list.',
      );
    }

    return {
      assessments: data.assessments.map(normalizeAssessment),

      department: data.department ?? null,

      pagination: normalizePagination(
        data.pagination,
        params,
      ),
    };
  },

  /**
   * Creates an assessment and its pending student result records.
   *
   * Department and creator IDs are derived by the backend.
   */
  async createAssessment(payload) {
    const requestBody = normalizeCreatePayload(payload);

    const response = await api.post(
      ASSESSMENT_BASE_PATH,
      requestBody,
    );

    const data = unwrapResponse(
      response,
      'Unable to create the assessment.',
    );

    return {
      assessment: normalizeAssessment(data?.assessment),

      message:
        response.data?.message ||
        'Assessment created successfully.',
    };
  },

  /**
   * Updates editable assessment information.
   *
   * Course, batch assignments, section assignments,
   * and maximum marks remain immutable after creation.
   */
  async updateAssessment(assessmentId, payload) {
    const identifier = normalizeId(assessmentId);

    if (!/^[a-f\d]{24}$/i.test(identifier)) {
      throw new Error(
        'A valid assessment identifier is required.',
      );
    }

    const requestBody = normalizeUpdatePayload(payload);

    const response = await api.patch(
      `${ASSESSMENT_BASE_PATH}/${identifier}`,
      requestBody,
    );

    const data = unwrapResponse(
      response,
      'Unable to update the assessment.',
    );

    return {
      assessment: normalizeAssessment(data?.assessment),

      message:
        response.data?.message ||
        'Assessment updated successfully.',
    };
  },

  /**
   * Retrieves paginated student results for an assessment.
   *
   * Filters:
   * page, limit, search, status.
   */
  async listAssessmentResults(
    assessmentId,
    filters = {},
    options = {},
  ) {
    const identifier = normalizeId(assessmentId);

    if (!/^[a-f\d]{24}$/i.test(identifier)) {
      throw new Error(
        'A valid assessment identifier is required.',
      );
    }

    const params = normalizeResultFilters(filters);

    const response = await api.get(
      `${ASSESSMENT_BASE_PATH}/${identifier}/results`,
      {
        params,

        ...(options.signal
          ? { signal: options.signal }
          : {}),
      },
    );

    const data = unwrapResponse(
      response,
      'Unable to retrieve student assessment results.',
    );

    if (!Array.isArray(data?.results)) {
      throw new Error(
        'The server returned an invalid student result list.',
      );
    }

    return {
      assessment: data.assessment ?? null,

      summary: {
        total: Number(data.summary?.total ?? 0),
        pending: Number(data.summary?.pending ?? 0),
        entered: Number(data.summary?.entered ?? 0),
        absent: Number(data.summary?.absent ?? 0),
        exempt: Number(data.summary?.exempt ?? 0),
      },

      results: data.results.map(normalizeAssessmentResult),

      pagination: normalizePagination(
        data.pagination,
        params,
      ),
    };
  },

  /**
   * Saves marks and statuses for multiple students.
   *
   * Supported statuses:
   * PENDING, ENTERED, ABSENT, EXEMPT.
   */
  async updateAssessmentResults(assessmentId, results) {
    const identifier = normalizeId(assessmentId);

    if (!/^[a-f\d]{24}$/i.test(identifier)) {
      throw new Error(
        'A valid assessment identifier is required.',
      );
    }

    const requestBody = {
      results: normalizeBulkResults(results),
    };

    const response = await api.patch(
      `${ASSESSMENT_BASE_PATH}/${identifier}/results`,
      requestBody,
    );

    const data = unwrapResponse(
      response,
      'Unable to save student assessment results.',
    );

    if (!Array.isArray(data?.results)) {
      throw new Error(
        'The server returned an invalid updated result list.',
      );
    }

    return {
      results: data.results.map(normalizeAssessmentResult),

      summary: {
        total: Number(data.summary?.total ?? 0),
        pending: Number(data.summary?.pending ?? 0),
        entered: Number(data.summary?.entered ?? 0),
        absent: Number(data.summary?.absent ?? 0),
        exempt: Number(data.summary?.exempt ?? 0),
      },

      message:
        response.data?.message ||
        'Student marks updated successfully.',
    };
  },
};

export default assessmentManagementService;