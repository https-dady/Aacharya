import api from '../../auth/services/api/axios.js';

const COURSE_BASE_PATH = '/v1/courses/department';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const COURSE_CATEGORIES = Object.freeze({
  CORE: 'CORE',
  ELECTIVE: 'ELECTIVE',
});

export const COURSE_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

const VALID_CATEGORIES = new Set(
  Object.values(COURSE_CATEGORIES),
);

const VALID_STATUSES = new Set(
  Object.values(COURSE_STATUSES),
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
      '',
    code: reference.code ?? '',
  };
}

function normalizeCourse(course) {
  if (!course || typeof course !== 'object') {
    throw new Error(
      'The server returned an invalid course record.',
    );
  }

  const id = normalizeId(course.id ?? course._id);

  if (!id) {
    throw new Error(
      'The course record does not contain a valid identifier.',
    );
  }

  return {
    ...course,

    id,

    title: course.title ?? '',

    code: course.code ?? '',

    description: course.description ?? '',

    faculty: normalizeReference(course.faculty),

    facultyName:
      course.facultyName ??
      course.faculty?.fullName ??
      '',

    department: normalizeReference(course.department),

    batches: Array.isArray(course.batches)
      ? course.batches.map(normalizeReference).filter(Boolean)
      : [],

    sections: Array.isArray(course.sections)
      ? course.sections.map(normalizeReference).filter(Boolean)
      : [],

    semester: course.semester ?? '',

    category: String(
      course.category ?? COURSE_CATEGORIES.CORE,
    ).toUpperCase(),

    credits: Number(course.credits ?? 0),

    status: String(
      course.status ?? COURSE_STATUSES.ACTIVE,
    ).toUpperCase(),

    createdAt: course.createdAt ?? null,

    updatedAt: course.updatedAt ?? null,
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
      pagination.hasNextPage ?? page < totalPages,

    hasPreviousPage:
      pagination.hasPreviousPage ?? page > 1,
  };
}

function normalizeListFilters(filters = {}) {
  const params = {};

  const page = Number(filters.page ?? DEFAULT_PAGE);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000
  ) {
    throw new Error(
      'Page must be an integer between 1 and 100000.',
    );
  }

  const limit = Number(filters.limit ?? DEFAULT_LIMIT);

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

    if (search.length > 100) {
      throw new Error(
        'Course search cannot exceed 100 characters.',
      );
    }

    if (search) {
      params.search = search;
    }
  }

  if (filters.status) {
    const status = String(filters.status).toUpperCase();

    if (!VALID_STATUSES.has(status)) {
      throw new Error('Invalid course status filter.');
    }

    params.status = status;
  }

  return params;
}

function validateIdentifierList(values, fieldName, maximum) {
  if (values === undefined || values === null) {
    return [];
  }

  if (!Array.isArray(values)) {
    throw new Error(`${fieldName} must be an array.`);
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
        `${fieldName} contains an invalid ID.`,
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
    throw new Error('Course information is required.');
  }

  const title = String(payload.title ?? '').trim();

  const code = String(payload.code ?? '')
    .trim()
    .toUpperCase();

  const description = String(
    payload.description ?? '',
  ).trim();

  const semester = String(
    payload.semester ?? '',
  ).trim();

  const category = String(
    payload.category ?? COURSE_CATEGORIES.CORE,
  ).toUpperCase();

  const credits = Number(payload.credits ?? 0);

  const instructorId = payload.instructorId
    ? normalizeId(payload.instructorId)
    : null;

  if (title.length < 2 || title.length > 150) {
    throw new Error(
      'Course title must contain between 2 and 150 characters.',
    );
  }

  if (
    code.length < 2 ||
    code.length > 30 ||
    !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)
  ) {
    throw new Error(
      'Course code must contain 2–30 letters, numbers, or hyphen-separated groups.',
    );
  }

  if (description.length > 2000) {
    throw new Error(
      'Course description cannot exceed 2000 characters.',
    );
  }

  if (semester.length > 30) {
    throw new Error(
      'Semester cannot exceed 30 characters.',
    );
  }

  if (!VALID_CATEGORIES.has(category)) {
    throw new Error('Select a valid course category.');
  }

  if (
    !Number.isFinite(credits) ||
    credits < 0 ||
    credits > 30
  ) {
    throw new Error(
      'Course credits must be a number between 0 and 30.',
    );
  }

  if (
    instructorId &&
    !/^[a-f\d]{24}$/i.test(instructorId)
  ) {
    throw new Error('Select a valid instructor.');
  }

  const batchIds = validateIdentifierList(
    payload.batchIds,
    'Batch assignments',
    100,
  );

  const sectionIds = validateIdentifierList(
    payload.sectionIds,
    'Section assignments',
    500,
  );

  return {
    title,
    code,
    description,
    instructorId,
    batchIds,
    sectionIds,
    semester,
    category,
    credits,
  };
}

function normalizeCourseList(data, fallback = {}) {
  if (!Array.isArray(data?.courses)) {
    throw new Error(
      'The server returned an invalid department course list.',
    );
  }

  return {
    courses: data.courses.map(normalizeCourse),

    department: data.department ?? null,

    pagination: normalizePagination(
      data.pagination,
      fallback,
    ),
  };
}

const courseManagementService = {
  /**
   * Retrieves courses belonging to the authenticated HOD's
   * department.
   *
   * Supported filters:
   * page, limit, search, status.
   */
  async listCourses(filters = {}, options = {}) {
    const params = normalizeListFilters(filters);

    const response = await api.get(
      COURSE_BASE_PATH,
      {
        params,

        ...(options.signal
          ? { signal: options.signal }
          : {}),
      },
    );

    const data = unwrapResponse(
      response,
      'Unable to retrieve department courses.',
    );

    return normalizeCourseList(data, params);
  },

  /**
   * Creates a course inside the authenticated HOD's department.
   *
   * Department and creator IDs are deliberately not accepted
   * from the frontend. The backend derives them from the
   * authenticated HOD account.
   */
  async createCourse(payload) {
    const requestBody = normalizeCreatePayload(payload);

    const response = await api.post(
      COURSE_BASE_PATH,
      requestBody,
    );

    const data = unwrapResponse(
      response,
      'Unable to create the course.',
    );

    const course = normalizeCourse(data?.course);

    return {
      course,

      message:
        response.data?.message ||
        'Course created successfully.',
    };
  },
};

export default courseManagementService;