import api from '../../auth/services/api/axios.js';

const ENDPOINTS = {
  faculty: '/v1/provisioning/faculty',
  batches: '/v1/provisioning/batches',
  mentors: '/v1/provisioning/mentors',
  assignMentor: (facultyId) =>
    `/v1/provisioning/faculty/${encodeURIComponent(facultyId)}/mentor`,
  sections: (batchId) =>
    `/v1/provisioning/batches/${encodeURIComponent(batchId)}/sections`,
  clearDepartmentAssignments:
    '/v1/provisioning/mentors/assignments/clear-department',
};

const CLEAR_CONFIRMATION =
  'CLEAR_DEPARTMENT_MENTOR_ASSIGNMENTS';

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

function requireIdentifier(value, label) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function normalizePagination(pagination = {}, fallback = {}) {
  return {
    page: Number(pagination.page) || fallback.page || 1,
    limit: Number(pagination.limit) || fallback.limit || 20,
    total: Number(pagination.total) || 0,
    totalPages: Number(pagination.totalPages) || 0,
    hasNextPage: Boolean(pagination.hasNextPage),
    hasPreviousPage: Boolean(pagination.hasPreviousPage),
  };
}

function normalizeList(data, key, label, fallback = {}) {
  const records = data?.[key];

  if (!Array.isArray(records)) {
    throw new Error(
      `The server returned an invalid ${label} response.`,
    );
  }

  return {
    items: records,
    department: data.department ?? null,
    pagination: normalizePagination(
      data.pagination,
      fallback,
    ),
  };
}

function normalizeMentor(mentor) {
  if (!mentor || typeof mentor !== 'object') {
    return null;
  }

  const assignedBatches = Array.isArray(mentor.assignedBatches)
    ? mentor.assignedBatches
    : [];

  const assignedSections = Array.isArray(mentor.assignedSections)
    ? mentor.assignedSections
    : [];

  return {
    ...mentor,
    id: String(mentor.id ?? mentor._id ?? ''),
    institutionalId: mentor.institutionalId ?? '',
    fullName: mentor.fullName ?? '',
    email: mentor.email ?? '',
    role: mentor.role ?? '',
    status: mentor.status ?? '',
    assignedBatches,
    assignedSections,
  };
}

const mentorManagementService = {
  /**
   * Retrieves active faculty members from the authenticated
   * HOD's department.
   */
  async listFaculty(filters = {}, options = {}) {
    const response = await api.get(ENDPOINTS.faculty, {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 100,
        status: filters.status ?? 'ACTIVE',
        ...(filters.search
          ? { search: filters.search }
          : {}),
      },
      ...(options.signal
        ? { signal: options.signal }
        : {}),
    });

    const data = unwrapResponse(
      response,
      'Unable to retrieve faculty members.',
    );

    return normalizeList(
      data,
      'faculty',
      'faculty list',
      filters,
    );
  },

  /**
   * Retrieves active batches belonging to the HOD's department.
   */
  async listBatches(filters = {}, options = {}) {
    const response = await api.get(ENDPOINTS.batches, {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 100,
        status: filters.status ?? 'ACTIVE',
        ...(filters.search
          ? { search: filters.search }
          : {}),
      },
      ...(options.signal
        ? { signal: options.signal }
        : {}),
    });

    const data = unwrapResponse(
      response,
      'Unable to retrieve department batches.',
    );

    return normalizeList(
      data,
      'batches',
      'batch list',
      filters,
    );
  },

  /**
   * Retrieves sections belonging to a specific batch.
   */
  async listSections(batchId, filters = {}, options = {}) {
    const safeBatchId = requireIdentifier(
      batchId,
      'Batch ID',
    );

    const response = await api.get(
      ENDPOINTS.sections(safeBatchId),
      {
        params: {
          page: filters.page ?? 1,
          limit: filters.limit ?? 100,
          status: filters.status ?? 'ACTIVE',
          ...(filters.search
            ? { search: filters.search }
            : {}),
        },
        ...(options.signal
          ? { signal: options.signal }
          : {}),
      },
    );

    const data = unwrapResponse(
      response,
      'Unable to retrieve batch sections.',
    );

    return normalizeList(
      data,
      'sections',
      'section list',
      filters,
    );
  },

  /**
   * Retrieves the mentor directory for the authenticated HOD.
   */
  async listMentors(filters = {}, options = {}) {
    const response = await api.get(ENDPOINTS.mentors, {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        ...(filters.search
          ? { search: filters.search }
          : {}),
        ...(filters.status
          ? { status: filters.status }
          : {}),
      },
      ...(options.signal
        ? { signal: options.signal }
        : {}),
    });

    const data = unwrapResponse(
      response,
      'Unable to retrieve mentor assignments.',
    );

    const result = normalizeList(
      data,
      'mentors',
      'mentor list',
      filters,
    );

    return {
      ...result,
      items: result.items
        .map(normalizeMentor)
        .filter((mentor) => mentor?.id),
    };
  },

  /**
   * Grants the Mentor role to an eligible faculty member
   * and saves the complete batch/section assignment selection.
   *
   * The backend treats submitted arrays as authoritative.
   */
  async assignMentor(facultyId, assignments = {}) {
    const safeFacultyId = requireIdentifier(
      facultyId,
      'Faculty ID',
    );

    const { batchIds, sectionIds } = assignments;

    if (
      !Array.isArray(batchIds) ||
      !Array.isArray(sectionIds)
    ) {
      throw new Error(
        'Batch IDs and section IDs must both be arrays.',
      );
    }

    const normalizedBatchIds = [
      ...new Set(
        batchIds.map((id) =>
          requireIdentifier(id, 'Batch ID'),
        ),
      ),
    ];

    const normalizedSectionIds = [
      ...new Set(
        sectionIds.map((id) =>
          requireIdentifier(id, 'Section ID'),
        ),
      ),
    ];

    if (
      normalizedSectionIds.length > 0 &&
      normalizedBatchIds.length === 0
    ) {
      throw new Error(
        'Select at least one batch before assigning sections.',
      );
    }

    if (normalizedBatchIds.length > 100) {
      throw new Error(
        'You cannot assign more than 100 batches at once.',
      );
    }

    if (normalizedSectionIds.length > 500) {
      throw new Error(
        'You cannot assign more than 500 sections at once.',
      );
    }

    const response = await api.patch(
      ENDPOINTS.assignMentor(safeFacultyId),
      {
        batchIds: normalizedBatchIds,
        sectionIds: normalizedSectionIds,
      },
    );

    const data = unwrapResponse(
      response,
      'Unable to save mentor assignments.',
    );

    const mentor = normalizeMentor(data?.mentor);

    if (!mentor?.id) {
      throw new Error(
        'The server did not return a valid saved mentor record.',
      );
    }

    return {
      mentor,
    };
  },

  /**
   * Explicitly clears all mentor-to-section assignments
   * within the authenticated HOD's department.
   *
   * This does not delete faculty accounts or remove
   * their Mentor role.
   */
  async clearDepartmentAssignments() {
    const response = await api.post(
      ENDPOINTS.clearDepartmentAssignments,
      {
        confirmation: CLEAR_CONFIRMATION,
      },
    );

    return unwrapResponse(
      response,
      'Unable to clear department mentor assignments.',
    );
  },
};

export default mentorManagementService;