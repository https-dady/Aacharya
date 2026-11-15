import api from '../../auth/services/api/axios.js';

const ENDPOINT = '/v1/provisioning/mentor/attendance-overview';

function unwrapResponse(response) {
  const payload = response?.data;

  if (payload?.success !== true) {
    throw new Error(
      payload?.error?.message
        || payload?.message
        || 'Unable to retrieve attendance overview.',
    );
  }

  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error(
      'The server returned an invalid attendance response.',
    );
  }

  return payload.data;
}

function normalizeAttendance(attendance = {}) {
  return {
    totalRecords: Number(attendance.totalRecords ?? 0),
    present: Number(attendance.present ?? 0),
    absent: Number(attendance.absent ?? 0),
    late: Number(attendance.late ?? 0),

    averagePercentage:
      attendance.averagePercentage === null
      || attendance.averagePercentage === undefined
        ? null
        : Number(attendance.averagePercentage),

    belowThresholdCount: Number(
      attendance.belowThresholdCount ?? 0,
    ),

    threshold: Number(attendance.threshold ?? 75),
  };
}

function normalizeStudents(students = {}) {
  return {
    totalAssigned: Number(students.totalAssigned ?? 0),

    withAttendanceRecords: Number(
      students.withAttendanceRecords ?? 0,
    ),

    withoutAttendanceRecords: Number(
      students.withoutAttendanceRecords ?? 0,
    ),
  };
}

function normalizeAtRiskStudent(student) {
  return {
    id: String(student.id ?? ''),
    institutionalId: student.institutionalId ?? '',
    fullName: student.fullName ?? '',
    email: student.email ?? null,

    totalRecords: Number(student.totalRecords ?? 0),
    present: Number(student.present ?? 0),
    absent: Number(student.absent ?? 0),
    late: Number(student.late ?? 0),

    percentage:
      student.percentage === null
      || student.percentage === undefined
        ? null
        : Number(student.percentage),

    requiresAttention: Boolean(student.requiresAttention),
  };
}

function normalizeSection(section) {
  return {
    id: String(section.id ?? ''),
    name: section.name ?? '',
    code: section.code ?? '',
  };
}

function normalizeResponse(data) {
  if (!Array.isArray(data.atRiskStudents)) {
    throw new Error(
      'The server returned an invalid at-risk students collection.',
    );
  }

  if (!Array.isArray(data.sections)) {
    throw new Error(
      'The server returned an invalid sections collection.',
    );
  }

  return {
    attendance: normalizeAttendance(data.attendance),
    students: normalizeStudents(data.students),

    atRiskStudents: data.atRiskStudents.map(
      normalizeAtRiskStudent,
    ),

    sections: data.sections.map(normalizeSection),

    filters: {
      startDate: data.filters?.startDate ?? null,
      endDate: data.filters?.endDate ?? null,
      sectionId: data.filters?.sectionId ?? null,
    },

    generatedAt: data.generatedAt ?? null,
  };
}

function normalizeFilters(filters = {}) {
  const params = {};

  if (filters.startDate) {
    params.startDate = filters.startDate;
  }

  if (filters.endDate) {
    params.endDate = filters.endDate;
  }

  if (filters.sectionId) {
    params.sectionId = filters.sectionId;
  }

  return params;
}

const mentorAttendanceService = {
  async getOverview(filters = {}, options = {}) {
    const response = await api.get(
      ENDPOINT,
      {
        params: normalizeFilters(filters),

        ...(options.signal
          ? { signal: options.signal }
          : {}),
      },
    );

    return normalizeResponse(
      unwrapResponse(response),
    );
  },
};

export default mentorAttendanceService;