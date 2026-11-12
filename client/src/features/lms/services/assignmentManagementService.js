import api from '../../auth/services/api/axios.js';

const ASSIGNMENT_BASE_PATH = '/v1/assignments/manage';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
]);

export const ASSIGNMENT_CONTENT_TYPES = Object.freeze({
  ASSIGNMENT: 'ASSIGNMENT',
  PRACTICAL: 'PRACTICAL',
});

export const ASSIGNMENT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
});

const VALID_CONTENT_TYPES = new Set(
  Object.values(ASSIGNMENT_CONTENT_TYPES),
);

const VALID_STATUSES = new Set(
  Object.values(ASSIGNMENT_STATUSES),
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
      reference.title ??
      reference.fullName ??
      '',
    code: reference.code ?? '',
  };
}

function normalizeAssignment(item) {
  if (!item || typeof item !== 'object') {
    throw new Error(
      'The server returned an invalid assignment record.',
    );
  }

  const id = normalizeId(item.id ?? item._id);

  if (!id) {
    throw new Error(
      'The assignment record does not contain a valid ID.',
    );
  }

  return {
    ...item,

    id,

    title: item.title ?? '',

    contentType: String(
      item.contentType ??
        ASSIGNMENT_CONTENT_TYPES.ASSIGNMENT,
    ).toUpperCase(),

    description: item.description ?? '',

    course: normalizeReference(item.course),

    department: normalizeReference(item.department),

    batches: Array.isArray(item.batches)
      ? item.batches.map(normalizeReference).filter(Boolean)
      : [],

    sections: Array.isArray(item.sections)
      ? item.sections.map(normalizeReference).filter(Boolean)
      : [],

    dueDate: item.dueDate ?? null,

    totalMarks: Number(item.totalMarks ?? 0),

    attachments: Array.isArray(item.attachments)
      ? item.attachments.map((attachment) => ({
          name: attachment.name ?? '',
          url: attachment.url ?? '',
          mimeType: attachment.mimeType ?? '',
          size: Number(attachment.size ?? 0),
          publicId: attachment.publicId ?? '',
          resourceType: attachment.resourceType ?? '',
        }))
      : [],

    status: String(
      item.status ?? ASSIGNMENT_STATUSES.DRAFT,
    ).toUpperCase(),

    createdBy: normalizeReference(item.createdBy),

    publishedAt: item.publishedAt ?? null,

    closedAt: item.closedAt ?? null,

    createdAt: item.createdAt ?? null,

    updatedAt: item.updatedAt ?? null,
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
  const limit = Number(filters.limit ?? DEFAULT_LIMIT);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Page must be a positive integer.');
  }

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

  if (filters.search) {
    const search = String(filters.search).trim();

    if (search.length > 100) {
      throw new Error(
        'Search cannot exceed 100 characters.',
      );
    }

    if (search) {
      params.search = search;
    }
  }

  if (filters.contentType) {
    const contentType = String(
      filters.contentType,
    ).toUpperCase();

    if (!VALID_CONTENT_TYPES.has(contentType)) {
      throw new Error('Invalid assignment content type.');
    }

    params.contentType = contentType;
  }

  if (filters.status) {
    const status = String(filters.status).toUpperCase();

    if (!VALID_STATUSES.has(status)) {
      throw new Error('Invalid assignment status.');
    }

    params.status = status;
  }

  if (filters.courseId) {
    const courseId = normalizeId(filters.courseId);

    if (!/^[a-f\d]{24}$/i.test(courseId)) {
      throw new Error('A valid course ID is required.');
    }

    params.courseId = courseId;
  }

  return params;
}

function validateObjectIdList(values, fieldName, maximum) {
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
    const id = normalizeId(value);

    if (!/^[a-f\d]{24}$/i.test(id)) {
      throw new Error(
        `${fieldName} contains an invalid ID.`,
      );
    }

    return id;
  });

  return [...new Set(normalized)];
}

function normalizeAttachments(attachments = []) {
  if (!Array.isArray(attachments)) {
    throw new Error('Attachments must be an array.');
  }

  if (attachments.length > 10) {
    throw new Error(
      'An assignment can contain at most 10 attachments.',
    );
  }

  return attachments.map((attachment) => {
    const name = String(attachment?.name ?? '').trim();
    const url = String(attachment?.url ?? '').trim();

    if (!name || name.length > 255) {
      throw new Error(
        'Attachment names must contain 1–255 characters.',
      );
    }

    try {
      const parsedUrl = new URL(url);

      if (
        !['http:', 'https:'].includes(parsedUrl.protocol)
      ) {
        throw new Error();
      }
    } catch {
      throw new Error(
        `Attachment "${name}" must have a valid HTTP or HTTPS URL.`,
      );
    }

    return {
      name,
      url,
      ...(attachment.mimeType
        ? { mimeType: String(attachment.mimeType) }
        : {}),
      ...(attachment.size !== undefined
        ? { size: Number(attachment.size) }
        : {}),
      ...(attachment.publicId
        ? { publicId: String(attachment.publicId) }
        : {}),
      ...(attachment.resourceType
        ? { resourceType: attachment.resourceType }
        : {}),
    };
  });
}

function normalizePayload(payload, { partial = false } = {}) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error('Assignment information is required.');
  }

  const normalized = {};

  if (!partial || payload.title !== undefined) {
    const title = String(payload.title ?? '').trim();

    if (title.length < 2 || title.length > 200) {
      throw new Error(
        'Assignment title must contain 2–200 characters.',
      );
    }

    normalized.title = title;
  }

  if (!partial || payload.contentType !== undefined) {
    const contentType = String(
      payload.contentType ??
        ASSIGNMENT_CONTENT_TYPES.ASSIGNMENT,
    ).toUpperCase();

    if (!VALID_CONTENT_TYPES.has(contentType)) {
      throw new Error('Invalid assignment content type.');
    }

    normalized.contentType = contentType;
  }

  if (!partial || payload.description !== undefined) {
    const description = String(
      payload.description ?? '',
    ).trim();

    if (!description || description.length > 10000) {
      throw new Error(
        'Description must contain 1–10000 characters.',
      );
    }

    normalized.description = description;
  }

  if (!partial || payload.courseId !== undefined) {
    const courseId = normalizeId(payload.courseId);

    if (!/^[a-f\d]{24}$/i.test(courseId)) {
      throw new Error('A valid course ID is required.');
    }

    normalized.courseId = courseId;
  }

  if (!partial || payload.batchIds !== undefined) {
    normalized.batchIds = validateObjectIdList(
      payload.batchIds,
      'Batch assignments',
      100,
    );
  }

  if (!partial || payload.sectionIds !== undefined) {
    normalized.sectionIds = validateObjectIdList(
      payload.sectionIds,
      'Section assignments',
      500,
    );
  }

  if (!partial || payload.dueDate !== undefined) {
    const date = new Date(payload.dueDate);

    if (
      !payload.dueDate ||
      Number.isNaN(date.getTime())
    ) {
      throw new Error('A valid assignment due date is required.');
    }

    normalized.dueDate = date.toISOString();
  }

  if (!partial || payload.totalMarks !== undefined) {
    const totalMarks = Number(payload.totalMarks);

    if (
      !Number.isFinite(totalMarks) ||
      totalMarks < 1 ||
      totalMarks > 10000
    ) {
      throw new Error(
        'Total marks must be between 1 and 10000.',
      );
    }

    normalized.totalMarks = totalMarks;
  }

  if (payload.attachments !== undefined) {
    normalized.attachments = normalizeAttachments(
      payload.attachments,
    );
  } else if (!partial) {
    normalized.attachments = [];
  }

  if (!partial || payload.status !== undefined) {
    const status = String(
      payload.status ?? ASSIGNMENT_STATUSES.DRAFT,
    ).toUpperCase();

    if (!VALID_STATUSES.has(status)) {
      throw new Error('Invalid assignment status.');
    }

    normalized.status = status;
  }

  return normalized;
}

function validateFiles(files = []) {
  if (!Array.isArray(files)) {
    throw new Error('Uploaded files must be provided as an array.');
  }

  if (files.length > MAX_FILES) {
    throw new Error(
      `You can upload a maximum of ${MAX_FILES} files per request.`,
    );
  }

  for (const file of files) {
    if (!(file instanceof File)) {
      throw new Error('An uploaded attachment is invalid.');
    }

    if (file.size === 0) {
      throw new Error(`${file.name} is empty.`);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `${file.name} exceeds the 10 MB file size limit.`,
      );
    }

    const extension = file.name
      .slice(file.name.lastIndexOf('.'))
      .toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error(
        `${file.name} has an unsupported file format.`,
      );
    }
  }
}

function buildRequestBody(payload, files = []) {
  validateFiles(files);

  if (files.length === 0) {
    return payload;
  }

  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  for (const file of files) {
    formData.append('attachments', file);
  }

  return formData;
}

function normalizeListResponse(data, fallback = {}) {
  if (!Array.isArray(data?.items)) {
    throw new Error(
      'The server returned an invalid assignment list.',
    );
  }

  return {
    items: data.items.map(normalizeAssignment),

    pagination: normalizePagination(
      data.pagination,
      fallback,
    ),
  };
}

function normalizeSingleResponse(data) {
  const item = data?.item ?? data?.assignment ?? data;

  return normalizeAssignment(item);
}

const assignmentManagementService = {
  async listAssignments(filters = {}, options = {}) {
    const params = normalizeListFilters(filters);

    const response = await api.get(
      ASSIGNMENT_BASE_PATH,
      {
        params,

        ...(options.signal
          ? { signal: options.signal }
          : {}),
      },
    );

    const data = unwrapResponse(
      response,
      'Unable to retrieve department assignments.',
    );

    return normalizeListResponse(data, params);
  },

  async createAssignment(payload, files = []) {
    const normalizedPayload = normalizePayload(payload);

    const requestBody = buildRequestBody(
      normalizedPayload,
      files,
    );

    const response = await api.post(
      ASSIGNMENT_BASE_PATH,
      requestBody,
    );

    const data = unwrapResponse(
      response,
      'Unable to create the assignment.',
    );

    return {
      assignment: normalizeSingleResponse(data),

      message:
        response.data?.message ||
        'Assignment created successfully.',
    };
  },

  async updateAssignment(assignmentId, payload, files = []) {
    const id = normalizeId(assignmentId);

    if (!/^[a-f\d]{24}$/i.test(id)) {
      throw new Error('A valid assignment ID is required.');
    }

    const normalizedPayload = normalizePayload(
      payload,
      { partial: true },
    );

    if (Object.keys(normalizedPayload).length === 0) {
      throw new Error(
        'At least one assignment field must be provided.',
      );
    }

    const requestBody = buildRequestBody(
      normalizedPayload,
      files,
    );

    const response = await api.patch(
      `${ASSIGNMENT_BASE_PATH}/${encodeURIComponent(id)}`,
      requestBody,
    );

    const data = unwrapResponse(
      response,
      'Unable to update the assignment.',
    );

    return {
      assignment: normalizeSingleResponse(data),

      message:
        response.data?.message ||
        'Assignment updated successfully.',
    };
  },
};

export default assignmentManagementService;