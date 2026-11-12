import api from '../../auth/services/api/axios.js';

const BATCH_ENDPOINT = '/v1/provisioning/batches';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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

function normalizeBatch(batch) {
  if (!batch || typeof batch !== 'object') {
    return null;
  }

  return {
    ...batch,
    id: String(batch.id ?? batch._id ?? ''),
    name: batch.name ?? '',
    code: batch.code ?? '',
    academicYear: batch.academicYear ?? '',
    status: batch.status ?? 'UNKNOWN',
    department: batch.department ?? null,
    createdAt: batch.createdAt ?? null,
    updatedAt: batch.updatedAt ?? null,
  };
}

function normalizePagination(pagination = {}, fallback = {}) {
  const page = Number(pagination.page ?? fallback.page ?? 1);
  const limit = Number(
    pagination.limit ?? fallback.limit ?? DEFAULT_PAGE_SIZE,
  );
  const total = Number(pagination.total ?? 0);
  const totalPages = Number(
    pagination.totalPages ?? Math.ceil(total / limit),
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

function validateAcademicYear(value) {
  if (!/^\d{4}-\d{4}$/.test(value)) {
    throw new Error(
      'Academic year must use the YYYY-YYYY format.',
    );
  }

  const [startYear, endYear] = value.split('-').map(Number);

  if (endYear !== startYear + 1) {
    throw new Error(
      'Academic year must contain consecutive years.',
    );
  }
}

function validateBatchPayload(payload) {
  const name = String(payload?.name ?? '').trim();
  const code = String(payload?.code ?? '').trim();
  const academicYear = String(
    payload?.academicYear ?? '',
  ).trim();

  if (name.length < 2 || name.length > 100) {
    throw new Error(
      'Batch name must contain between 2 and 100 characters.',
    );
  }

  if (
    code.length < 2 ||
    code.length > 30 ||
    !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(code)
  ) {
    throw new Error(
      'Batch code must contain 2–30 letters, numbers, or hyphen-separated groups.',
    );
  }

  validateAcademicYear(academicYear);

  return {
    name,
    code: code.toUpperCase(),
    academicYear,
  };
}

function normalizePageSize(value) {
  const limit = Number(value ?? DEFAULT_PAGE_SIZE);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Page size must be a positive integer.');
  }

  return Math.min(limit, MAX_PAGE_SIZE);
}

const batchManagementService = {
  /**
   * Retrieves paginated batches belonging to the
   * authenticated HOD's department.
   *
   * Department filtering is enforced by the backend.
   */
  async listBatches(filters = {}, options = {}) {
    const page = Number(filters.page ?? 1);

    if (!Number.isInteger(page) || page < 1) {
      throw new Error('Page number must be a positive integer.');
    }

    const limit = normalizePageSize(filters.limit);

    const params = {
      page,
      limit,
    };

    if (filters.search?.trim()) {
      params.search = filters.search.trim();
    }

    if (filters.status && filters.status !== 'ALL') {
      if (!['ACTIVE', 'INACTIVE'].includes(filters.status)) {
        throw new Error('Invalid batch status filter.');
      }

      params.status = filters.status;
    }

    if (filters.academicYear) {
      validateAcademicYear(filters.academicYear);
      params.academicYear = filters.academicYear;
    }

    const response = await api.get(BATCH_ENDPOINT, {
      params,
      ...(options.signal
        ? { signal: options.signal }
        : {}),
    });

    const data = unwrapResponse(
      response,
      'Unable to retrieve department batches.',
    );

    if (!Array.isArray(data?.batches)) {
      throw new Error(
        'The server returned an invalid batch list.',
      );
    }

    return {
      batches: data.batches
        .map(normalizeBatch)
        .filter((batch) => batch?.id),

      department: data.department ?? null,

      pagination: normalizePagination(
        data.pagination,
        { page, limit },
      ),
    };
  },

  /**
   * Creates a batch inside the authenticated HOD's department.
   *
   * Department ID and creator ID are deliberately not accepted
   * from the frontend. The backend derives them from the
   * authenticated HOD account.
   */
  async createBatch(payload) {
    const requestBody = validateBatchPayload(payload);

    const response = await api.post(
      BATCH_ENDPOINT,
      requestBody,
    );

    const data = unwrapResponse(
      response,
      'Unable to create the batch.',
    );

    const batch = normalizeBatch(data?.batch);

    if (!batch?.id) {
      throw new Error(
        'The server did not return a valid created batch.',
      );
    }

    return {
      batch,
      message:
        response.data?.message ||
        'Batch created successfully.',
    };
  },
};

export default batchManagementService;