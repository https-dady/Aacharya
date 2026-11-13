import api from '../../auth/services/api/axios.js';

const ATTENDANCE_ENDPOINT = '/v1/attendance';

function normalizeId(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    return String(value._id || value.id || '');
  }

  return '';
}

function normalizeAttendanceRecord(record = {}) {
  const student = record.student || {};
  const course = record.course || {};
  const batch = record.batch || {};
  const section = record.section || {};
  const markedBy = record.markedBy || {};

  return {
    id: normalizeId(record.id || record._id),

    student: {
      id: normalizeId(student.id || student._id),
      institutionalId: student.institutionalId || '',
      fullName: student.fullName || 'Unknown student',
    },

    course: {
      id: normalizeId(course.id || course._id),
      title: course.title || '',
      code: course.code || '',
    },

    batch: batch.id || batch._id
      ? {
          id: normalizeId(batch.id || batch._id),
          name: batch.name || '',
          code: batch.code || '',
        }
      : null,

    section: section.id || section._id
      ? {
          id: normalizeId(section.id || section._id),
          name: section.name || '',
          code: section.code || '',
        }
      : null,

    sessionDate: record.sessionDate || null,
    sessionKey: record.sessionKey || '',
    status: record.status || '',
    remarks: record.remarks || '',

    markedBy: markedBy.id || markedBy._id
      ? {
          id: normalizeId(markedBy.id || markedBy._id),
          fullName: markedBy.fullName || '',
        }
      : null,

    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  };
}

function normalizePagination(pagination = {}) {
  return {
    page: Number(pagination.page) || 1,
    limit: Number(pagination.limit) || 20,
    total: Number(pagination.total) || 0,
    totalPages: Number(pagination.totalPages) || 0,
  };
}

function normalizeCourse(course = {}) {
  return {
    id: normalizeId(course.id || course._id),
    title: course.title || '',
    code: course.code || '',
  };
}

function getCourseId(courseId) {
  const id = normalizeId(courseId);

  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new Error('A valid course ID is required.');
  }

  return id;
}

function normalizeDate(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function normalizeAttendanceEntries(records = []) {
  if (!Array.isArray(records)) {
    throw new Error('Attendance records must be an array.');
  }

  return records.map((record) => ({
    studentId: normalizeId(
      record.studentId || record.student?.id || record.student?._id,
    ),

    status: String(record.status || '').toUpperCase(),

    remarks: String(record.remarks || '').trim(),
  }));
}

const facultyAttendanceService = {
  /**
   * Fetch attendance records for an assigned course.
   *
   * GET /v1/attendance/faculty/:courseId
   */
  async listAttendance(courseId, filters = {}) {
    const id = getCourseId(courseId);

    const params = {};

    if (filters.page != null) {
      params.page = filters.page;
    }

    if (filters.limit != null) {
      params.limit = filters.limit;
    }

    if (filters.startDate) {
      params.startDate = normalizeDate(filters.startDate);
    }

    if (filters.endDate) {
      params.endDate = normalizeDate(filters.endDate);
    }

    if (filters.batchId) {
      params.batchId = normalizeId(filters.batchId);
    }

    if (filters.sectionId) {
      params.sectionId = normalizeId(filters.sectionId);
    }

    if (filters.status) {
      params.status = String(filters.status).toUpperCase();
    }

    const response = await api.get(
      `${ATTENDANCE_ENDPOINT}/faculty/${id}`,
      { params },
    );

    const data = response.data?.data || {};

    return {
      course: normalizeCourse(data.course),

      items: Array.isArray(data.items)
        ? data.items.map(normalizeAttendanceRecord)
        : [],

      pagination: normalizePagination(data.pagination),
    };
  },

  /**
   * Save or update attendance for a course session.
   *
   * POST /v1/attendance/faculty/:courseId
   */
  async markAttendance(courseId, payload = {}) {
    const id = getCourseId(courseId);

    const sessionDate = normalizeDate(payload.sessionDate);

    if (!sessionDate) {
      throw new Error('A valid session date is required.');
    }

    const sessionKey = String(payload.sessionKey || '').trim();

    if (!sessionKey || sessionKey.length > 100) {
      throw new Error('A valid session key is required.');
    }

    const records = normalizeAttendanceEntries(payload.records);

    if (records.length === 0 || records.length > 200) {
      throw new Error(
        'Attendance must contain between 1 and 200 student records.',
      );
    }

    const seenStudents = new Set();

    for (const record of records) {
      if (!/^[a-f\d]{24}$/i.test(record.studentId)) {
        throw new Error('Every attendance record needs a valid student ID.');
      }

      if (seenStudents.has(record.studentId)) {
        throw new Error('Duplicate student entries are not allowed.');
      }

      seenStudents.add(record.studentId);

      if (!record.status) {
        throw new Error('Every student must have an attendance status.');
      }
    }

    const response = await api.post(
      `${ATTENDANCE_ENDPOINT}/faculty/${id}`,
      {
        sessionDate,
        sessionKey,
        records,
      },
    );

    const data = response.data?.data || {};

    return {
      course: normalizeCourse(data.course),

      session: data.session || {
        sessionDate,
        sessionKey,
      },

      summary: {
        submitted: Number(data.summary?.submitted) || records.length,
        inserted: Number(data.summary?.inserted) || 0,
        updated: Number(data.summary?.updated) || 0,
      },

      items: Array.isArray(data.items)
        ? data.items.map(normalizeAttendanceRecord)
        : [],

      message:
        response.data?.message
        || 'Attendance saved successfully.',
    };
  },
};

export default facultyAttendanceService;