import api from '../../auth/services/api/axios.js';

const FACULTY_BASE_PATH = '/v1/provisioning/faculty';

export const FACULTY_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DISABLED: 'DISABLED',
});

export const FACULTY_ROLES = Object.freeze({
  FACULTY: 'FACULTY',
  MENTOR: 'MENTOR',
});

const VALID_STATUSES = new Set(
  Object.values(FACULTY_STATUSES),
);

const VALID_ROLES = new Set(
  Object.values(FACULTY_ROLES),
);

function unwrapResponse(response) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message ||
      payload?.message ||
      'The faculty management request could not be completed.',
    );
  }

  return payload.data;
}

function requireIdentifier(value, label) {
  const identifier = String(value ?? '').trim();

  if (!/^[a-f\d]{24}$/i.test(identifier)) {
    throw new Error(`A valid ${label} is required.`);
  }

  return identifier;
}

function normalizeId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value._id ?? value.id ?? '');
  }

  return String(value);
}

function normalizeFaculty(faculty) {
  if (!faculty || typeof faculty !== 'object') {
    throw new Error(
      'The server returned an invalid faculty record.',
    );
  }

  const id = normalizeId(faculty.id ?? faculty._id);

  if (!id) {
    throw new Error(
      'The faculty record does not contain a valid identifier.',
    );
  }

  const department = faculty.department ?? null;

  return {
    ...faculty,

    id,

    institutionalId: faculty.institutionalId ?? '',

    fullName: faculty.fullName ?? '',

    email: faculty.email ?? null,

    role: faculty.role ?? FACULTY_ROLES.FACULTY,

    status: faculty.status ?? FACULTY_STATUSES.ACTIVE,

    department: department
      ? {
          id: normalizeId(department),
          name:
            typeof department === 'object'
              ? department.name ?? ''
              : '',
          code:
            typeof department === 'object'
              ? department.code ?? ''
              : '',
        }
      : null,

    assignedBatches: Array.isArray(faculty.assignedBatches)
      ? faculty.assignedBatches.map(normalizeId)
      : [],

    assignedSections: Array.isArray(faculty.assignedSections)
      ? faculty.assignedSections.map(normalizeId)
      : [],

    isEmailVerified: faculty.isEmailVerified === true,

    lastLoginAt: faculty.lastLoginAt ?? null,

    createdAt: faculty.createdAt ?? null,

    updatedAt: faculty.updatedAt ?? null,
  };
}

function normalizePagination(pagination = {}) {
  return {
    page: Number(pagination.page ?? 1),

    limit: Number(pagination.limit ?? 20),

    total: Number(pagination.total ?? 0),

    totalPages: Number(pagination.totalPages ?? 0),

    hasNextPage: pagination.hasNextPage === true,

    hasPreviousPage: pagination.hasPreviousPage === true,
  };
}

function normalizeFacultyList(data) {
  if (!Array.isArray(data?.faculty)) {
    throw new Error(
      'The server returned an invalid faculty list.',
    );
  }

  return {
    faculty: data.faculty.map(normalizeFaculty),

    department: data.department ?? null,

    pagination: normalizePagination(data.pagination),
  };
}

function normalizeFacultyResponse(data) {
  const faculty = data?.faculty ?? data?.user ?? data;

  return normalizeFaculty(faculty);
}

function normalizeListFilters(filters = {}) {
  const params = {};

  const allowedFilters = [
    'page',
    'limit',
    'search',
    'role',
    'status',
  ];

  for (const key of allowedFilters) {
    const value = filters[key];

    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      continue;
    }

    if (key === 'role' && !VALID_ROLES.has(value)) {
      throw new Error('Invalid faculty role filter.');
    }

    if (key === 'status' && !VALID_STATUSES.has(value)) {
      throw new Error('Invalid faculty status filter.');
    }

    if (key === 'page') {
      const page = Number(value);

      if (!Number.isInteger(page) || page < 1 || page > 100000) {
        throw new Error('Page must be between 1 and 100000.');
      }

      params.page = page;
      continue;
    }

    if (key === 'limit') {
      const limit = Number(value);

      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100.');
      }

      params.limit = limit;
      continue;
    }

    if (key === 'search') {
      const search = String(value).trim();

      if (search.length > 100) {
        throw new Error(
          'Search cannot exceed 100 characters.',
        );
      }

      if (search) {
        params.search = search;
      }

      continue;
    }

    params[key] = value;
  }

  return params;
}

function normalizeCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Faculty information is required.');
  }

  const normalized = {
    institutionalId: String(
      payload.institutionalId ?? '',
    ).trim().toUpperCase(),

    fullName: String(
      payload.fullName ?? '',
    ).trim(),

    email: String(
      payload.email ?? '',
    ).trim().toLowerCase(),

    password: String(
      payload.password ?? '',
    ),
  };

  if (
    normalized.institutionalId.length < 2 ||
    normalized.institutionalId.length > 50
  ) {
    throw new Error(
      'Institutional ID must contain 2 to 50 characters.',
    );
  }

  if (
    normalized.fullName.length < 2 ||
    normalized.fullName.length > 100
  ) {
    throw new Error(
      'Full name must contain 2 to 100 characters.',
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email) ||
    normalized.email.length > 254
  ) {
    throw new Error('A valid email address is required.');
  }

  if (
    normalized.password.length < 8 ||
    normalized.password.length > 72
  ) {
    throw new Error(
      'Password must contain between 8 and 72 characters.',
    );
  }

  return normalized;
}

function normalizeUpdatePayload(payload) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error('Faculty update information is required.');
  }

  const allowedFields = [
    'institutionalId',
    'fullName',
    'email',
  ];

  const normalized = {};

  for (const [key, value] of Object.entries(payload)) {
    if (!allowedFields.includes(key)) {
      throw new Error(
        `The field "${key}" cannot be updated through this operation.`,
      );
    }

    if (key === 'institutionalId') {
      const institutionalId = String(value).trim().toUpperCase();

      if (
        institutionalId.length < 2 ||
        institutionalId.length > 50
      ) {
        throw new Error('Invalid institutional ID.');
      }

      normalized.institutionalId = institutionalId;
    }

    if (key === 'fullName') {
      const fullName = String(value).trim();

      if (
        fullName.length < 2 ||
        fullName.length > 100
      ) {
        throw new Error('Invalid faculty name.');
      }

      normalized.fullName = fullName;
    }

    if (key === 'email') {
      const email = String(value).trim().toLowerCase();

      if (
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        throw new Error('Invalid email address.');
      }

      normalized.email = email;
    }
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error(
      'Provide at least one valid field to update.',
    );
  }

  return normalized;
}

const facultyManagementService = {
  /**
   * Retrieve faculty and mentor accounts.
   *
   * Supported filters:
   * page, limit, search, role, status.
   */
  async listFaculty(filters = {}, options = {}) {
    const response = await api.get(FACULTY_BASE_PATH, {
      params: normalizeListFilters(filters),
      signal: options.signal,
    });

    return normalizeFacultyList(
      unwrapResponse(response),
    );
  },

  /**
   * Retrieve one faculty or mentor account.
   */
  async getFaculty(facultyId) {
    const id = requireIdentifier(
      facultyId,
      'Faculty ID',
    );

    const response = await api.get(
      `${FACULTY_BASE_PATH}/${encodeURIComponent(id)}`,
    );

    return normalizeFacultyResponse(
      unwrapResponse(response),
    );
  },

  /**
   * Create a faculty account.
   */
  async createFaculty(payload) {
    const requestBody = normalizeCreatePayload(payload);

    const response = await api.post(
      FACULTY_BASE_PATH,
      requestBody,
    );

    return normalizeFacultyResponse(
      unwrapResponse(response),
    );
  },

  /**
   * Update editable faculty information.
   */
  async updateFaculty(facultyId, payload) {
    const id = requireIdentifier(
      facultyId,
      'Faculty ID',
    );

    const requestBody = normalizeUpdatePayload(payload);

    const response = await api.patch(
      `${FACULTY_BASE_PATH}/${encodeURIComponent(id)}`,
      requestBody,
    );

    return normalizeFacultyResponse(
      unwrapResponse(response),
    );
  },

  /**
   * Update account lifecycle status.
   *
   * Supported:
   * ACTIVE
   * SUSPENDED
   * DISABLED
   *
   * The backend revokes existing sessions whenever
   * the account status changes.
   */
  async updateFacultyStatus(facultyId, status) {
    const id = requireIdentifier(
      facultyId,
      'Faculty ID',
    );

    if (!VALID_STATUSES.has(status)) {
      throw new Error('Invalid faculty account status.');
    }

    const response = await api.patch(
      `${FACULTY_BASE_PATH}/${encodeURIComponent(id)}/status`,
      {
        status,
      },
    );

    return normalizeFacultyResponse(
      unwrapResponse(response),
    );
  },

  async activateFaculty(facultyId) {
    return this.updateFacultyStatus(
      facultyId,
      FACULTY_STATUSES.ACTIVE,
    );
  },

  async suspendFaculty(facultyId) {
    return this.updateFacultyStatus(
      facultyId,
      FACULTY_STATUSES.SUSPENDED,
    );
  },

  async disableFaculty(facultyId) {
    return this.updateFacultyStatus(
      facultyId,
      FACULTY_STATUSES.DISABLED,
    );
  },
};

export default facultyManagementService;