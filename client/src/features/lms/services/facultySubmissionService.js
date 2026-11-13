import api from '../../auth/services/api/axios.js';

const BASE_PATH = '/v1/assignments/manage';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const SUBMISSION_STATUSES = new Set([
  'SUBMITTED',
  'LATE',
  'GRADED',
]);

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

function normalizePagination(pagination = {}) {
  const page = Number(pagination.page ?? DEFAULT_PAGE);
  const limit = Number(pagination.limit ?? DEFAULT_LIMIT);
  const total = Number(pagination.total ?? 0);

  return {
    page,
    limit,
    total,
    totalPages: Number(
      pagination.totalPages ??
        Math.ceil(total / Math.max(limit, 1)),
    ),
  };
}

function normalizeSubmission(item) {
  if (!item || typeof item !== 'object') {
    throw new Error(
      'The server returned an invalid submission record.',
    );
  }

  const student = item.student ?? {};
  const assignment = item.assignment ?? {};
  const course = item.course ?? {};

  return {
    id: normalizeId(item.id ?? item._id),

    assignment: {
      id: normalizeId(assignment),
      title: assignment.title ?? '',
      totalMarks: Number(assignment.totalMarks ?? 0),
      dueDate: assignment.dueDate ?? null,
    },

    course: {
      id: normalizeId(course),
      title: course.title ?? '',
      code: course.code ?? '',
    },

    student: {
      id: normalizeId(student),
      fullName: student.fullName ?? '',
      institutionalId: student.institutionalId ?? '',
      email: student.email ?? '',
    },

    responseText: item.responseText ?? '',

    attachments: Array.isArray(item.attachments)
      ? item.attachments.map((attachment) => ({
          id: normalizeId(attachment),
          name: attachment.name ?? '',
          url: attachment.url ?? '',
          mimeType: attachment.mimeType ?? '',
          size: Number(attachment.size ?? 0),
        }))
      : [],

    submittedAt: item.submittedAt ?? null,

    status: String(item.status ?? 'SUBMITTED').toUpperCase(),

    marksObtained:
      item.marksObtained === null ||
      item.marksObtained === undefined
        ? null
        : Number(item.marksObtained),

    feedback: item.feedback ?? '',

    evaluatedAt: item.evaluatedAt ?? null,

    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  };
}

function validateAssignmentId(assignmentId) {
  const id = normalizeId(assignmentId);

  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new Error('A valid assignment ID is required.');
  }

  return id;
}

function validateSubmissionId(submissionId) {
  const id = normalizeId(submissionId);

  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new Error('A valid submission ID is required.');
  }

  return id;
}

function normalizeListFilters(filters = {}) {
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

  const params = { page, limit };

  if (filters.status) {
    const status = String(filters.status).toUpperCase();

    if (!SUBMISSION_STATUSES.has(status)) {
      throw new Error('Invalid submission status.');
    }

    params.status = status;
  }

  return params;
}

async function listSubmissions(assignmentId, filters = {}) {
  const id = validateAssignmentId(assignmentId);
  const params = normalizeListFilters(filters);

  const response = await api.get(
    `${BASE_PATH}/${id}/submissions`,
    { params },
  );

  const data = unwrapResponse(
    response,
    'Unable to load assignment submissions.',
  );

  return {
    items: Array.isArray(data.items)
      ? data.items.map(normalizeSubmission)
      : [],

    pagination: normalizePagination(data.pagination),

    assignment: data.assignment ?? null,
  };
}

async function getSubmission(assignmentId, submissionId) {
  const assignment = validateAssignmentId(assignmentId);
  const submission = validateSubmissionId(submissionId);

  const response = await api.get(
    `${BASE_PATH}/${assignment}/submissions/${submission}`,
  );

  const data = unwrapResponse(
    response,
    'Unable to load submission details.',
  );

  if (!data.submission) {
    throw new Error(
      'The server did not return submission details.',
    );
  }

  return normalizeSubmission(data.submission);
}

async function evaluateSubmission(
  assignmentId,
  submissionId,
  evaluation,
) {
  const assignment = validateAssignmentId(assignmentId);
  const submission = validateSubmissionId(submissionId);

  const marksObtained = Number(evaluation?.marksObtained);
  const feedback = String(evaluation?.feedback ?? '').trim();

  if (!Number.isFinite(marksObtained) || marksObtained < 0) {
    throw new Error('Enter valid marks.');
  }

  if (feedback.length > 10000) {
    throw new Error('Feedback cannot exceed 10000 characters.');
  }

  const response = await api.patch(
    `${BASE_PATH}/${assignment}/submissions/${submission}/evaluate`,
    {
      marksObtained,
      feedback,
    },
  );

  const data = unwrapResponse(
    response,
    'Unable to evaluate this submission.',
  );

  if (!data.submission) {
    throw new Error(
      'The server did not return the updated submission.',
    );
  }

  return normalizeSubmission(data.submission);
}

const facultySubmissionService = {
  listSubmissions,
  getSubmission,
  evaluateSubmission,
};

export default facultySubmissionService;