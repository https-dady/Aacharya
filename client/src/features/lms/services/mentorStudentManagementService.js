import api from '../../auth/services/api/axios.js';

function unwrapResponse(response, fallbackMessage) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message
      || payload?.message
      || fallbackMessage,
    );
  }

  return payload.data;
}

function requireId(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return encodeURIComponent(value.trim());
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
    status: student.status ?? '',
    isAccountActivated: Boolean(student.isAccountActivated),
    isEmailVerified: Boolean(student.isEmailVerified),
  };
}

const mentorStudentManagementService = {
  async createStudent(sectionId, studentData) {
    const safeSectionId = requireId(
      sectionId,
      'Section ID',
    );

    const response = await api.post(
      `/v1/provisioning/sections/${safeSectionId}/students`,
      studentData,
    );

    const data = unwrapResponse(
      response,
      'Unable to create the student account.',
    );

    return {
      message: response.data.message,
      student: normalizeStudent(data.student),
    };
  },

  async updateStudent(sectionId, studentId, updates) {
    const safeSectionId = requireId(
      sectionId,
      'Section ID',
    );

    const safeStudentId = requireId(
      studentId,
      'Student ID',
    );

    const response = await api.patch(
      `/v1/provisioning/sections/${safeSectionId}/students/${safeStudentId}`,
      updates,
    );

    const data = unwrapResponse(
      response,
      'Unable to update the student profile.',
    );

    return {
      message: response.data.message,
      student: normalizeStudent(data.student),
    };
  },
};

export default mentorStudentManagementService;