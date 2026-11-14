import api from '../../auth/services/api/axios.js';

const ENDPOINT = '/v1/provisioning/mentor/students';

function unwrapResponse(response) {
  const payload = response?.data;

  if (payload?.success !== true) {
    throw new Error(
      payload?.error?.message
        || payload?.message
        || 'Unable to retrieve student details.',
    );
  }

  const data = payload.data;

  if (!data || typeof data !== 'object' || !data.student) {
    throw new Error(
      'The server returned an invalid student details response.',
    );
  }

  return data;
}

function normalizeBatch(batch) {
  if (!batch) return null;

  return {
    id: String(batch.id ?? ''),
    name: batch.name ?? '',
    code: batch.code ?? '',
    academicYear: batch.academicYear ?? '',
  };
}

function normalizeSection(section) {
  return {
    id: String(section.id ?? ''),
    name: section.name ?? '',
    code: section.code ?? '',
    batch: normalizeBatch(section.batch),
  };
}

function normalizeStudent(student) {
  return {
    id: String(student.id ?? ''),
    institutionalId: student.institutionalId ?? '',
    fullName: student.fullName ?? '',
    email: student.email ?? null,
    role: student.role ?? 'STUDENT',
    status: student.status ?? 'UNKNOWN',
    isAccountActivated: Boolean(student.isAccountActivated),
    isEmailVerified: Boolean(student.isEmailVerified),
    emailVerifiedAt: student.emailVerifiedAt ?? null,
    createdAt: student.createdAt ?? null,
    updatedAt: student.updatedAt ?? null,
  };
}

function normalizeAttendance(attendance) {
  return {
    total: Number(attendance?.total ?? 0),
    present: Number(attendance?.present ?? 0),
    absent: Number(attendance?.absent ?? 0),
    late: Number(attendance?.late ?? 0),
    percentage: Number(attendance?.percentage ?? 0),
  };
}

const mentorStudentDetailsService = {
  async getStudentDetails(studentId, options = {}) {
    if (!studentId) {
      throw new Error('Student ID is required.');
    }

    const response = await api.get(
      `${ENDPOINT}/${encodeURIComponent(studentId)}`,
      options.signal
        ? { signal: options.signal }
        : undefined,
    );

    const data = unwrapResponse(response);

    return {
      student: normalizeStudent(data.student),

      department: data.department
        ? {
            id: String(data.department.id ?? ''),
            name: data.department.name ?? '',
            code: data.department.code ?? '',
          }
        : null,

      sections: Array.isArray(data.sections)
        ? data.sections.map(normalizeSection)
        : [],

      attendance: normalizeAttendance(data.attendance),

      generatedAt: data.generatedAt ?? null,
    };
  },
};

export default mentorStudentDetailsService;