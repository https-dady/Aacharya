import api from '../../auth/services/api/axios.js';

const BATCHES_ENDPOINT = '/v1/provisioning/batches';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function getResponseData(response) {
  const body = response?.data;

  if (!body || body.success !== true) {
    throw new Error(
      body?.message || 'The server returned an unsuccessful response.',
    );
  }

  return body.data ?? body;
}

function normalizePagination(pagination, page, limit, total) {
  const totalPages = Math.ceil(total / limit);

  return {
    page: pagination?.page ?? page,
    limit: pagination?.limit ?? limit,
    total: pagination?.total ?? total,
    totalPages: pagination?.totalPages ?? totalPages,
    hasNextPage:
      pagination?.hasNextPage ?? page < totalPages,
    hasPreviousPage:
      pagination?.hasPreviousPage ?? page > 1,
  };
}

function normalizeSection(section) {
  if (!section || typeof section !== 'object') {
    throw new Error('The server returned an invalid section record.');
  }

  const id = section.id || section._id;

  if (!id) {
    throw new Error('The section record does not contain an ID.');
  }

  return {
    ...section,
    id,
  };
}

function normalizeBatch(batch) {
  if (!batch || typeof batch !== 'object') {
    throw new Error('The server returned an invalid batch record.');
  }

  const id = batch.id || batch._id;

  if (!id) {
    throw new Error('The batch record does not contain an ID.');
  }

  return {
    ...batch,
    id,
  };
}

function normalizeSectionPayload(section) {
  const normalized = normalizeSection(section);

  const batch = section.batch
    ? normalizeBatch(section.batch)
    : null;

  return {
    ...normalized,
    batch,
    batchId: batch?.id || section.batchId || '',
    batchName: batch?.name || section.batchName || '',
    batchCode: batch?.code || section.batchCode || '',
    academicYear:
      batch?.academicYear || section.academicYear || '',
  };
}

function validatePagination(page, limit) {
  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  if (
    !Number.isInteger(normalizedPage)
    || normalizedPage < 1
  ) {
    throw new Error('Page must be a positive integer.');
  }

  if (
    !Number.isInteger(normalizedLimit)
    || normalizedLimit < 1
    || normalizedLimit > MAX_PAGE_SIZE
  ) {
    throw new Error(
      `Page size must be between 1 and ${MAX_PAGE_SIZE}.`,
    );
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
}

function validateSectionInput(input) {
  const name = String(input?.name ?? '').trim();
  const code = String(input?.code ?? '').trim().toUpperCase();

  if (!name || name.length > 50) {
    throw new Error(
      'Section name is required and cannot exceed 50 characters.',
    );
  }

  if (
    !code
    || code.length > 20
    || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)
  ) {
    throw new Error(
      'Section code must contain letters, numbers, and single hyphens, with a maximum of 20 characters.',
    );
  }

  return {
    name,
    code,
  };
}

function validateId(id, label) {
  const normalizedId = String(id ?? '').trim();

  if (!/^[a-f\d]{24}$/i.test(normalizedId)) {
    throw new Error(`A valid ${label} ID is required.`);
  }

  return normalizedId;
}

async function listBatches({
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  search = '',
  status = '',
  academicYear = '',
  signal,
} = {}) {
  const pagination = validatePagination(page, limit);

  const response = await api.get(BATCHES_ENDPOINT, {
    params: {
      ...pagination,
      search: String(search).trim(),
      status,
      academicYear,
    },
    signal,
  });

  const data = getResponseData(response);

  if (!Array.isArray(data.batches)) {
    throw new Error(
      'The server returned an unexpected batch list response.',
    );
  }

  const batches = data.batches.map(normalizeBatch);

  const total = Number(
    data.pagination?.total ?? batches.length,
  );

  return {
    batches,
    pagination: normalizePagination(
      data.pagination,
      pagination.page,
      pagination.limit,
      total,
    ),
  };
}

async function listSections({
  batchId,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  search = '',
  status = '',
  signal,
} = {}) {
  const normalizedBatchId = validateId(batchId, 'batch');
  const pagination = validatePagination(page, limit);

  const response = await api.get(
    `${BATCHES_ENDPOINT}/${encodeURIComponent(normalizedBatchId)}/sections`,
    {
      params: {
        ...pagination,
        search: String(search).trim(),
        status,
      },
      signal,
    },
  );

  const data = getResponseData(response);

  if (!Array.isArray(data.sections)) {
    throw new Error(
      'The server returned an unexpected section list response.',
    );
  }

  const sections = data.sections.map(normalizeSectionPayload);

  const total = Number(
    data.pagination?.total ?? sections.length,
  );

  return {
    sections,
    batch: data.batch ? normalizeBatch(data.batch) : null,
    department: data.department ?? null,
    pagination: normalizePagination(
      data.pagination,
      pagination.page,
      pagination.limit,
      total,
    ),
  };
}

async function createSection(batchId, input) {
  const normalizedBatchId = validateId(batchId, 'batch');
  const payload = validateSectionInput(input);

  const response = await api.post(
    `${BATCHES_ENDPOINT}/${encodeURIComponent(normalizedBatchId)}/sections`,
    payload,
  );

  const data = getResponseData(response);

  if (!data.section) {
    throw new Error(
      'The server did not return the created section.',
    );
  }

  return normalizeSectionPayload(data.section);
}

async function updateSection(sectionId, input) {
  const normalizedSectionId = validateId(sectionId, 'section');
  const payload = validateSectionInput(input);

  const response = await api.patch(
    `/v1/provisioning/sections/${encodeURIComponent(normalizedSectionId)}`,
    payload,
  );

  const data = getResponseData(response);

  if (!data.section) {
    throw new Error(
      'The server did not return the updated section.',
    );
  }

  return normalizeSectionPayload(data.section);
}

const sectionManagementService = {
  listBatches,
  listSections,
  createSection,
  updateSection,
};

export {
  listBatches,
  listSections,
  createSection,
  updateSection,
};

export default sectionManagementService;