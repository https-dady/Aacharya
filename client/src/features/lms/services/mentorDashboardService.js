import api from '../../auth/services/api/axios.js';

const MENTOR_DASHBOARD_ENDPOINT =
  '/v1/provisioning/mentor/dashboard';

function unwrapResponse(response) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message ||
      payload?.message ||
      'Unable to retrieve the mentor dashboard.',
    );
  }

  const data = payload.data;

  if (!data || typeof data !== 'object') {
    throw new Error(
      'The server returned an invalid mentor dashboard response.',
    );
  }

  return data;
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

function normalizeBatch(batch) {
  if (!batch || typeof batch !== 'object') {
    throw new Error(
      'The server returned an invalid assigned batch.',
    );
  }

  return {
    id: normalizeId(batch.id ?? batch._id),
    name: batch.name ?? '',
    code: batch.code ?? '',
    academicYear: batch.academicYear ?? '',
  };
}

function normalizeSection(section) {
  if (!section || typeof section !== 'object') {
    throw new Error(
      'The server returned an invalid assigned section.',
    );
  }

  const batch = section.batch ?? null;

  return {
    id: normalizeId(section.id ?? section._id),
    name: section.name ?? '',
    code: section.code ?? '',

    batch: batch
      ? {
          id: normalizeId(batch),
          name: batch.name ?? '',
          code: batch.code ?? '',
          academicYear: batch.academicYear ?? '',
        }
      : null,
  };
}

function normalizeStudent(student) {
  if (!student || typeof student !== 'object') {
    throw new Error(
      'The server returned an invalid student record.',
    );
  }

  return {
    id: normalizeId(student.id ?? student._id),
    institutionalId: student.institutionalId ?? '',
    fullName: student.fullName ?? '',
    email: student.email ?? null,
    status: student.status ?? '',

    assignedBatches: Array.isArray(student.assignedBatches)
      ? student.assignedBatches.map(normalizeId)
      : [],

    assignedSections: Array.isArray(student.assignedSections)
      ? student.assignedSections.map(normalizeId)
      : [],

    createdAt: student.createdAt ?? null,
  };
}

function normalizeAttendance(attendance) {
  return {
    total: Number(attendance?.total ?? 0),
    present: Number(attendance?.present ?? 0),
    absent: Number(attendance?.absent ?? 0),
    late: Number(attendance?.late ?? 0),
  };
}

function normalizeDashboard(data) {
  if (
    !data.mentor ||
    !data.department ||
    !data.summary ||
    !data.assignments
  ) {
    throw new Error(
      'The server returned an incomplete mentor dashboard.',
    );
  }

  if (
    !Array.isArray(data.assignments.batches) ||
    !Array.isArray(data.assignments.sections) ||
    !Array.isArray(data.recentStudents)
  ) {
    throw new Error(
      'The server returned invalid mentor dashboard collections.',
    );
  }

  const attendance = normalizeAttendance(
    data.summary.attendance,
  );

  return {
    mentor: {
      id: normalizeId(data.mentor.id ?? data.mentor._id),
      institutionalId: data.mentor.institutionalId ?? '',
      fullName: data.mentor.fullName ?? '',
      email: data.mentor.email ?? null,
      role: data.mentor.role ?? '',
      roles: Array.isArray(data.mentor.roles)
        ? data.mentor.roles
        : [],
    },

    department: {
      id: normalizeId(
        data.department.id ?? data.department._id,
      ),
      name: data.department.name ?? '',
      code: data.department.code ?? '',
    },

    assignments: {
      batches: data.assignments.batches.map(normalizeBatch),
      sections: data.assignments.sections.map(normalizeSection),
    },

    summary: {
      assignedBatches: Number(
        data.summary.assignedBatches ?? 0,
      ),

      assignedSections: Number(
        data.summary.assignedSections ?? 0,
      ),

      assignedStudents: Number(
        data.summary.assignedStudents ?? 0,
      ),

      attendance,
    },

    recentStudents: data.recentStudents.map(normalizeStudent),

    generatedAt: data.generatedAt ?? null,
  };
}

const mentorDashboardService = {
  /**
   * Retrieves the authenticated mentor dashboard.
   *
   * GET /api/v1/provisioning/mentor/dashboard
   */
  async getDashboard(options = {}) {
    const response = await api.get(
      MENTOR_DASHBOARD_ENDPOINT,
      options.signal
        ? {
            signal: options.signal,
          }
        : undefined,
    );

    return normalizeDashboard(
      unwrapResponse(response),
    );
  },
};

export default mentorDashboardService;