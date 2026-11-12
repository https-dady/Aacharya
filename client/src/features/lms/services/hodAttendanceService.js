import api from "../../auth/services/api/axios.js";

const ATTENDANCE_ENDPOINT = "/v1/attendance/manage";

const ALLOWED_FILTERS = [
  "page",
  "limit",
  "search",
  "startDate",
  "endDate",
  "courseId",
  "batchId",
  "sectionId",
  "status",
];

function unwrapResponse(response) {
  const payload = response?.data;

  if (payload?.success !== true || !payload.data) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        "The attendance request could not be completed.",
    );
  }

  return payload.data;
}

function normalizePagination(pagination = {}) {
  return {
    page: Number(pagination.page ?? 1),
    limit: Number(pagination.limit ?? 20),
    total: Number(pagination.total ?? 0),
    totalPages: Number(pagination.totalPages ?? 0),
  };
}

function normalizeStudentSummary(student) {
  return {
    id: String(student.id ?? ""),
    studentId: student.studentId ?? "",
    studentName: student.studentName ?? "Unknown student",

    batchId: student.batchId ? String(student.batchId) : null,
    batchName: student.batchName ?? "",

    sectionId: student.sectionId ? String(student.sectionId) : null,
    sectionName: student.sectionName ?? "",

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
      student.attendanceStatus ?? "AT_OR_ABOVE_THRESHOLD",

    latestAttendanceDate: student.latestAttendanceDate ?? null,
  };
}

function normalizeAttendanceRecord(record) {
  return {
    id: String(record.id ?? ""),
    studentId: record.studentId ?? "",
    studentName: record.studentName ?? "Unknown student",

    batchId: record.batchId ? String(record.batchId) : null,
    batchName: record.batchName ?? "",

    sectionId: record.sectionId ? String(record.sectionId) : null,
    sectionName: record.sectionName ?? "",

    courseId: record.courseId ? String(record.courseId) : null,
    courseName: record.courseName ?? "",
    courseCode: record.courseCode ?? "",

    date: record.date ?? null,
    sessionKey: record.sessionKey ?? "",
    status: record.status ?? "",

    attendancePercentage:
      record.attendancePercentage === null ||
      record.attendancePercentage === undefined
        ? null
        : Number(record.attendancePercentage),

    facultyName: record.facultyName ?? "",
    remarks: record.remarks ?? "",

    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}

function buildQueryParams(filters = {}, includeSection = false) {
  const params = {};

  for (const key of ALLOWED_FILTERS) {
    const value = filters[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      params[key] = value;
    }
  }

  if (
    includeSection &&
    filters.section !== undefined &&
    filters.section !== null &&
    filters.section !== ""
  ) {
    params.section = filters.section;
  }

  return params;
}

function normalizeDepartment(department) {
  if (!department || typeof department !== "object") {
    return null;
  }

  return {
    id: String(department.id ?? ""),
    name: department.name ?? "",
    code: department.code ?? "",
  };
}

function normalizeOverviewResponse(data) {
  if (!Array.isArray(data.students)) {
    throw new Error(
      "The server returned an invalid attendance overview.",
    );
  }

  const summary = data.summary ?? {};

  return {
    department: normalizeDepartment(data.department),

    summary: {
      totalStudents: Number(summary.totalStudents ?? 0),
      averageAttendance: Number(summary.averageAttendance ?? 0),
      lowAttendanceCount: Number(summary.lowAttendanceCount ?? 0),
      attendanceThreshold: Number(
        summary.attendanceThreshold ?? 75,
      ),
    },

    students: data.students.map(normalizeStudentSummary),
    pagination: normalizePagination(data.pagination),
  };
}

function normalizeReportsResponse(data) {
  if (!Array.isArray(data.records)) {
    throw new Error(
      "The server returned an invalid attendance report.",
    );
  }

  const summary = data.summary ?? {};

  return {
    department: normalizeDepartment(data.department),

    summary: {
      totalRecords: Number(summary.totalRecords ?? 0),
      averageAttendance: Number(summary.averageAttendance ?? 0),
      belowThreshold: Number(summary.belowThreshold ?? 0),
      attendanceThreshold: Number(
        summary.attendanceThreshold ?? 75,
      ),
    },

    records: data.records.map(normalizeAttendanceRecord),
    pagination: normalizePagination(data.pagination),
  };
}

const hodAttendanceService = {
  /**
   * Retrieve student-wise attendance summaries for the
   * authenticated HOD's department.
   */
  async getAttendanceOverview(filters = {}) {
    const response = await api.get(ATTENDANCE_ENDPOINT, {
      params: buildQueryParams(filters),
    });

    return normalizeOverviewResponse(unwrapResponse(response));
  },

  /**
   * Retrieve detailed attendance records for the
   * authenticated HOD's department.
   */
  async getAttendanceReports(filters = {}) {
    const response = await api.get(
      `${ATTENDANCE_ENDPOINT}/reports`,
      {
        params: buildQueryParams(filters, true),
      },
    );

    return normalizeReportsResponse(unwrapResponse(response));
  },
};

export default hodAttendanceService;