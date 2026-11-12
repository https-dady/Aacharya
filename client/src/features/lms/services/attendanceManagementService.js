import api from '../../auth/services/api/axios.js';

const ATTENDANCE_BASE_PATH = '/v1/attendance/manage';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const ATTENDANCE_STATUSES = new Set([
  'PRESENT',
  'ABSENT',
  'LATE',
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

function normalizePagination(pagination = {}) {
  return {
    page: Number(pagination.page ?? DEFAULT_PAGE),
    limit: Number(pagination.limit ?? DEFAULT_LIMIT),
    total: Number(pagination.total ?? 0),
    totalPages: Number(pagination.totalPages ?? 0),
  };
}

function normalizeStudent(student) {
  if (!student || typeof student !== 'object') {
    throw new Error(
      'The server returned an invalid attendance student.',
    );
  }

  return {
    ...student,

    id: String(student.id ?? student._id ?? ''),

    studentId: student.studentId ?? '',

    studentName: student.studentName ?? '',

    batchId: student.batchId ?? null,

    batchName: student.batchName ?? '',

    sectionId: student.sectionId ?? null,

    sectionName: student.sectionName ?? '',

    totalSessions: Number(student.totalSessions ?? 0),

    attendedSessions: Number(student.attendedSessions ?? 0),

    presentCount: Number(student.presentCount ?? 0),

    absentCount: Number(student.absentCount ?? 0),

    lateCount: Number(student.lateCount ?? 0),

    courseCount: Number(student.courseCount ?? 0),

    attendancePercentage: Number(
      student.attendancePercentage ?? 0,
    ),

    attendanceStatus:
      student.attendanceStatus ?? 'AT_OR_ABOVE_THRESHOLD',

    latestAttendanceDate:
      student.latestAttendanceDate ?? null,
  };
}

function normalizeAttendanceRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new Error(
      'The server returned an invalid attendance record.',
    );
  }

  return {
    ...record,

    id: String(record.id ?? record._id ?? ''),

    studentId: record.studentId ?? '',

    studentName: record.studentName ?? '',

    batchId: record.batchId ?? null,

    batchName: record.batchName ?? '',

    sectionId: record.sectionId ?? null,

    sectionName: record.sectionName ?? '',

    courseId: record.courseId ?? null,

    courseName: record.courseName ?? '',

    courseCode: record.courseCode ?? '',

    date: record.date ?? null,

    status: record.status ?? '',

    attendancePercentage:
      record.attendancePercentage === null ||
      record.attendancePercentage === undefined
        ? null
        : Number(record.attendancePercentage),

    facultyName: record.facultyName ?? '',

    remarks: record.remarks ?? '',
  };
}

function normalizeFilters(filters = {}, includeSection = false) {
  const params = {};

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

  params.page = page;
  params.limit = limit;

  const dateFields = ['startDate', 'endDate'];

  for (const field of dateFields) {
    const value = filters[field];

    if (!value) {
      continue;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ||
      Number.isNaN(
        new Date(`${value}T00:00:00.000Z`).getTime(),
      ) ||
      new Date(`${value}T00:00:00.000Z`)
        .toISOString()
        .slice(0, 10) !== value
    ) {
      throw new Error(`${field} must be a valid YYYY-MM-DD date.`);
    }

    params[field] = value;
  }

  if (
    params.startDate &&
    params.endDate &&
    params.startDate > params.endDate
  ) {
    throw new Error(
      'End date must be on or after the start date.',
    );
  }

  const idFields = [
    'courseId',
    'batchId',
    'sectionId',
  ];

  for (const field of idFields) {
    const value = filters[field];

    if (!value) {
      continue;
    }

    if (!/^[a-f\d]{24}$/i.test(String(value))) {
      throw new Error(`${field} must be a valid ID.`);
    }

    params[field] = String(value);
  }

  if (filters.status) {
    if (!ATTENDANCE_STATUSES.has(filters.status)) {
      throw new Error('Invalid attendance status.');
    }

    params.status = filters.status;
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();

    if (search.length > 100) {
      throw new Error(
        'Search cannot exceed 100 characters.',
      );
    }

    params.search = search;
  }

  if (includeSection && filters.section?.trim()) {
    const section = filters.section.trim();

    if (section.length > 100) {
      throw new Error(
        'Section filter cannot exceed 100 characters.',
      );
    }

    params.section = section;
  }

  return params;
}

function normalizeOverviewResponse(data) {
  if (!Array.isArray(data?.students)) {
    throw new Error(
      'The server returned an invalid attendance overview.',
    );
  }

  return {
    department: data.department ?? null,

    summary: {
      totalStudents: Number(
        data.summary?.totalStudents ?? 0,
      ),

      averageAttendance: Number(
        data.summary?.averageAttendance ?? 0,
      ),

      lowAttendanceCount: Number(
        data.summary?.lowAttendanceCount ?? 0,
      ),

      attendanceThreshold: Number(
        data.summary?.attendanceThreshold ?? 75,
      ),
    },

    students: data.students.map(normalizeStudent),

    pagination: normalizePagination(data.pagination),
  };
}

function normalizeReportsResponse(data) {
  if (!Array.isArray(data?.records)) {
    throw new Error(
      'The server returned an invalid attendance report.',
    );
  }

  return {
    department: data.department ?? null,

    summary: {
      totalRecords: Number(
        data.summary?.totalRecords ?? 0,
      ),

      averageAttendance: Number(
        data.summary?.averageAttendance ?? 0,
      ),

      belowThreshold: Number(
        data.summary?.belowThreshold ?? 0,
      ),

      attendanceThreshold: Number(
        data.summary?.attendanceThreshold ?? 75,
      ),
    },

    records: data.records.map(normalizeAttendanceRecord),

    pagination: normalizePagination(data.pagination),
  };
}

const attendanceManagementService = {
  async getAttendanceOverview(filters = {}, options = {}) {
    const params = normalizeFilters(filters);

    const response = await api.get(
      ATTENDANCE_BASE_PATH,
      {
        params,
        ...(options.signal
          ? { signal: options.signal }
          : {}),
      },
    );

    const data = unwrapResponse(
      response,
      'Unable to retrieve department attendance.',
    );

    return normalizeOverviewResponse(data);
  },

  async getAttendanceReports(filters = {}, options = {}) {
    const params = normalizeFilters(filters, true);

    const response = await api.get(
      `${ATTENDANCE_BASE_PATH}/reports`,
      {
        params,
        ...(options.signal
          ? { signal: options.signal }
          : {}),
      },
    );

    const data = unwrapResponse(
      response,
      'Unable to retrieve attendance reports.',
    );

    return normalizeReportsResponse(data);
  },
};

export default attendanceManagementService;