import api from '../../auth/services/api/axios.js';

const ATTENDANCE_ENDPOINT = '/v1/attendance';

function normalizeStudent(student = {}) {
  return {
    id: student.id || student._id || '',
    institutionalId: student.institutionalId || '',
    fullName: student.fullName || 'Unknown Student',
    batchId: student.batchId || null,
    sectionId: student.sectionId || null,
  };
}

function normalizeCourse(course = {}) {
  return {
    id: course.id || course._id || '',
    title: course.title || '',
    code: course.code || '',
  };
}

export const facultyAttendanceRosterService = {
  async listStudents(courseId) {
    if (!courseId) {
      throw new Error('Course ID is required to fetch students.');
    }

    const response = await api.get(
      `${ATTENDANCE_ENDPOINT}/faculty/${courseId}/students`,
    );

    const data = response?.data?.data || {};

    return {
      course: normalizeCourse(data.course),
      items: Array.isArray(data.items)
        ? data.items.map(normalizeStudent)
        : [],
      total: Number(data.total) || 0,
    };
  },
};

export default facultyAttendanceRosterService;