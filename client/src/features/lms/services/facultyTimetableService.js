import api from '../../auth/services/api/axios.js';

const FACULTY_TIMETABLE_ENDPOINT = '/v1/timetable/my-schedule';

const WEEKDAYS = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]);

function unwrapResponse(response) {
  const body = response?.data;

  if (!body || body.success !== true) {
    throw new Error(
      body?.message ||
        'Unable to retrieve your timetable.',
    );
  }

  return body.data;
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

function getDisplayName(value, fallback = '') {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  return (
    value.fullName ||
    value.name ||
    value.title ||
    value.code ||
    fallback
  );
}

function normalizeTimetableEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error(
      'The server returned an invalid timetable entry.',
    );
  }

  const course = entry.course ?? null;
  const faculty = entry.faculty ?? null;
  const batch = entry.batch ?? null;
  const section = entry.section ?? null;

  return {
    id: normalizeId(entry.id ?? entry._id),

    departmentId: normalizeId(entry.department),

    courseId: normalizeId(course ?? entry.courseId),

    courseName:
      getDisplayName(course, '') ||
      entry.courseName ||
      'Course unavailable',

    courseCode:
      course?.code ||
      course?.courseCode ||
      entry.courseCode ||
      '',

    facultyId: normalizeId(faculty ?? entry.facultyId),

    facultyName:
      getDisplayName(faculty, '') ||
      entry.facultyName ||
      'Faculty unavailable',

    batchId: normalizeId(batch ?? entry.batchId),

    batchName:
      getDisplayName(batch, '') ||
      entry.batchName ||
      '',

    sectionId: normalizeId(section ?? entry.sectionId),

    sectionName:
      getDisplayName(section, '') ||
      entry.sectionName ||
      'Section unavailable',

    day: entry.day ?? '',

    startTime: entry.startTime ?? '',

    endTime: entry.endTime ?? '',

    room: entry.room ?? '',

    status: entry.status ?? 'ACTIVE',

    createdAt: entry.createdAt ?? null,

    updatedAt: entry.updatedAt ?? null,
  };
}

function normalizePagination(pagination) {
  return {
    page: Number(pagination?.page ?? 1),
    limit: Number(pagination?.limit ?? 50),
    total: Number(pagination?.total ?? 0),
    totalPages: Number(pagination?.totalPages ?? 0),
  };
}

function normalizeFilters(filters = {}) {
  const params = {};

  if (filters.page !== undefined) {
    params.page = filters.page;
  }

  if (filters.limit !== undefined) {
    params.limit = filters.limit;
  }

  if (filters.day) {
    if (!WEEKDAYS.includes(filters.day)) {
      throw new Error('Please select a valid weekday.');
    }

    params.day = filters.day;
  }

  if (filters.status) {
    params.status = filters.status;
  }

  for (const field of [
    'courseId',
    'batchId',
    'sectionId',
  ]) {
    if (filters[field]) {
      if (!/^[a-f\d]{24}$/i.test(String(filters[field]))) {
        throw new Error(`A valid ${field} is required.`);
      }

      params[field] = filters[field];
    }
  }

  return params;
}

function normalizeListResponse(data) {
  if (!data || !Array.isArray(data.items)) {
    throw new Error(
      'The server returned an invalid faculty timetable response.',
    );
  }

  return {
    entries: data.items.map(normalizeTimetableEntry),
    pagination: normalizePagination(data.pagination),
  };
}

const facultyTimetableService = {
  /**
   * Retrieve the authenticated faculty member's timetable.
   *
   * GET /api/v1/timetable/my-schedule
   *
   * Faculty identity is derived by the backend.
   */
  async getMyTimetable(filters = {}) {
    const response = await api.get(
      FACULTY_TIMETABLE_ENDPOINT,
      {
        params: normalizeFilters(filters),
      },
    );

    return normalizeListResponse(
      unwrapResponse(response),
    );
  },

  /**
   * Retrieve timetable entries for a particular weekday.
   */
  async getMyTimetableByDay(day, filters = {}) {
    if (!WEEKDAYS.includes(day)) {
      throw new Error('Please select a valid weekday.');
    }

    return this.getMyTimetable({
      ...filters,
      day,
      status: 'ACTIVE',
    });
  },
};

export default facultyTimetableService;