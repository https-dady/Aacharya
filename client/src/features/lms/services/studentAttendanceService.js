import api from '../../auth/services/api/axios.js';

function normalizeAttendanceRecord(record) {
  return {
    id: String(record.id ?? ''),
    subjectName: record.subjectName ?? 'Course unavailable',
    subjectCode: record.subjectCode ?? '',
    date: record.date ?? null,
    status: String(record.status ?? '').toLowerCase(),
    facultyName: record.facultyName ?? '',
    sessionKey: record.sessionKey ?? '',
    remarks: record.remarks ?? '',
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

const studentAttendanceService = {
  async getMyAttendance() {
    const response = await api.get('/v1/attendance/me');
    const body = response?.data;

    if (!body?.success || !Array.isArray(body.data)) {
      throw new Error(
        'The server returned an invalid attendance response.',
      );
    }

    return body.data.map(normalizeAttendanceRecord);
  },
};

export default studentAttendanceService;