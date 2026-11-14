import api from '../../auth/services/api/axios.js';

const ENDPOINT = '/v1/provisioning/mentor/students';

function unwrapResponse(response) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message
        || payload?.message
        || 'Unable to retrieve assigned students.',
    );
  }

  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error(
      'The server returned an invalid assigned students response.',
    );
  }

  return payload.data;
}

function normalizeBatch(batch) {
  if (!batch || typeof batch !== 'object') {
    return null;
  }

  return {
    id: String(batch.id ?? batch._id ?? ''),
    name: batch.name ?? '',
    code: batch.code ?? '',
    academicYear: batch.academicYear ?? '',
  };
}

function normalizeSection(section) {
  if (!section || typeof section !== 'object') {
    return null;
  }

  return {
    id: String(section.id ?? section._id ?? ''),
    name: section.name ?? '',
    code: section.code ?? '',
    batch: normalizeBatch(section.batch),
  };
}

function normalizeStudent(student) {
  if (!student || typeof student !== 'object') {
    throw new Error(
      'The server returned an invalid student record.',
    );
  }

  return {
    id: String(student.id ?? student._id ?? ''),
    institutionalId: student.institutionalId ?? '',
    fullName: student.fullName ?? '',
    email: student.email ?? null,
    status: student.status ?? 'UNKNOWN',

    isAccountActivated: Boolean(
      student.isAccountActivated,
    ),

    isEmailVerified: Boolean(
      student.isEmailVerified,
    ),

    sections: Array.isArray(student.sections)
      ? student.sections.map(normalizeSection).filter(Boolean)
      : [],

    batches: Array.isArray(student.batches)
      ? student.batches.map(normalizeBatch).filter(Boolean)
      : [],

    createdAt: student.createdAt ?? null,
    updatedAt: student.updatedAt ?? null,
  };
}

function normalizeSummary(summary) {
  return {
    total: Number(summary?.total ?? 0),
    active: Number(summary?.active ?? 0),
    suspended: Number(summary?.suspended ?? 0),
    disabled: Number(summary?.disabled ?? 0),
  };
}

function normalizePagination(pagination) {
  return {
    page: Number(pagination?.page ?? 1),
    limit: Number(pagination?.limit ?? 20),
    total: Number(pagination?.total ?? 0),
    totalPages: Number(pagination?.totalPages ?? 0),
    hasNextPage: Boolean(pagination?.hasNextPage),
    hasPreviousPage: Boolean(
      pagination?.hasPreviousPage,
    ),
  };
}

function normalizeResponse(data) {
  if (!Array.isArray(data.students)) {
    throw new Error(
      'The server returned an invalid students collection.',
    );
  }

  if (!Array.isArray(data.sections)) {
    throw new Error(
      'The server returned an invalid sections collection.',
    );
  }

  return {
    students: data.students.map(normalizeStudent),

    sections: data.sections
      .map(normalizeSection)
      .filter(Boolean),

    summary: normalizeSummary(data.summary),

    pagination: normalizePagination(data.pagination),
  };
}

const mentorAssignedStudentsService = {
  async getStudents({
    page = 1,
    limit = 20,
    search = '',
    status = '',
    signal,
  } = {}) {
    const params = {
      page,
      limit,
    };

    if (search.trim()) {
      params.search = search.trim();
    }

    if (status) {
      params.status = status;
    }

    const response = await api.get(
      ENDPOINT,
      {
        params,
        ...(signal ? { signal } : {}),
      },
    );

    return normalizeResponse(
      unwrapResponse(response),
    );
  },
};

export default mentorAssignedStudentsService;