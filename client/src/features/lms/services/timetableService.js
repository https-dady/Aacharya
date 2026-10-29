import api from '../../auth/services/api/axios.js';

const TIMETABLE_BASE_PATH = '/v1/timetable/manage';

const WEEKDAYS = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]);

function getResponseData(response) {
  const body = response?.data;

  if (!body?.success) {
    throw new Error(
      body?.message || 'The timetable request could not be completed.',
    );
  }

  return body.data;
}

function normalizeId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return String(value._id ?? value.id ?? '');
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
    value.institutionalId ||
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
    id: normalizeId(entry._id ?? entry.id),

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
    limit: Number(pagination?.limit ?? 20),
    total: Number(pagination?.total ?? 0),
    totalPages: Number(pagination?.totalPages ?? 0),
  };
}

function normalizeListResponse(data) {
  const entries =
    data?.entries ??
    data?.timetable ??
    data?.items ??
    data?.records;

  if (!Array.isArray(entries)) {
    throw new Error(
      'The server returned an invalid timetable list response.',
    );
  }

  return {
    entries: entries.map(normalizeTimetableEntry),
    pagination: normalizePagination(data.pagination),
  };
}

function normalizeMutationResponse(data) {
  const entry =
    data?.entry ??
    data?.timetable ??
    data?.item ??
    data?.record ??
    data;

  if (!entry || typeof entry !== 'object') {
    throw new Error(
      'The server returned an invalid timetable response.',
    );
  }

  return normalizeTimetableEntry(entry);
}

function normalizeFilters(filters = {}) {
  const query = {};

  const allowedFilters = [
    'page',
    'limit',
    'day',
    'status',
    'courseId',
    'facultyId',
    'batchId',
    'sectionId',
  ];

  for (const key of allowedFilters) {
    const value = filters[key];

    if (value !== undefined && value !== null && value !== '') {
      query[key] = value;
    }
  }

  return query;
}

function normalizeTimetablePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Timetable information is required.');
  }

  const normalized = {
    courseId: normalizeId(payload.courseId),
    facultyId: normalizeId(payload.facultyId),
    batchId: normalizeId(payload.batchId),
    sectionId: normalizeId(payload.sectionId),
    day: String(payload.day ?? '').trim(),
    startTime: String(payload.startTime ?? '').trim(),
    endTime: String(payload.endTime ?? '').trim(),
    room: String(payload.room ?? '').trim(),
  };

  if (!WEEKDAYS.includes(normalized.day)) {
    throw new Error('Please select a valid weekday.');
  }

  for (const field of [
    'courseId',
    'facultyId',
    'batchId',
    'sectionId',
  ]) {
    if (!/^[a-f\d]{24}$/i.test(normalized[field])) {
      throw new Error(`A valid ${field} is required.`);
    }
  }

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (!timePattern.test(normalized.startTime)) {
    throw new Error('Start time must use HH:mm format.');
  }

  if (!timePattern.test(normalized.endTime)) {
    throw new Error('End time must use HH:mm format.');
  }

  if (normalized.startTime >= normalized.endTime) {
    throw new Error('End time must be later than start time.');
  }

  if (!normalized.room || normalized.room.length > 100) {
    throw new Error(
      'Room is required and cannot exceed 100 characters.',
    );
  }

  return normalized;
}

function normalizeUpdatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('At least one field is required to update.');
  }

  const normalized = {};

  const idFields = [
    'courseId',
    'facultyId',
    'batchId',
    'sectionId',
  ];

  for (const field of idFields) {
    if (payload[field] !== undefined) {
      const id = normalizeId(payload[field]);

      if (!/^[a-f\d]{24}$/i.test(id)) {
        throw new Error(`A valid ${field} is required.`);
      }

      normalized[field] = id;
    }
  }

  if (payload.day !== undefined) {
    const day = String(payload.day).trim();

    if (!WEEKDAYS.includes(day)) {
      throw new Error('Please select a valid weekday.');
    }

    normalized.day = day;
  }

  for (const field of ['startTime', 'endTime']) {
    if (payload[field] !== undefined) {
      const time = String(payload[field]).trim();

      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        throw new Error(`${field} must use HH:mm format.`);
      }

      normalized[field] = time;
    }
  }

  if (
    normalized.startTime &&
    normalized.endTime &&
    normalized.startTime >= normalized.endTime
  ) {
    throw new Error('End time must be later than start time.');
  }

  if (payload.room !== undefined) {
    const room = String(payload.room).trim();

    if (!room || room.length > 100) {
      throw new Error(
        'Room is required and cannot exceed 100 characters.',
      );
    }

    normalized.room = room;
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error('Provide at least one field to update.');
  }

  return normalized;
}

const timetableService = {
  /**
   * Fetch timetable entries with optional filters and pagination.
   */
  async getTimetable(filters = {}) {
    const response = await api.get(TIMETABLE_BASE_PATH, {
      params: normalizeFilters(filters),
    });

    return normalizeListResponse(getResponseData(response));
  },

  /**
   * Fetch active timetable entries for a particular weekday.
   */
  async getTimetableByDay(day, filters = {}) {
    if (!WEEKDAYS.includes(day)) {
      throw new Error('Please select a valid weekday.');
    }

    return this.getTimetable({
      ...filters,
      day,
      status: 'ACTIVE',
    });
  },

  /**
   * Create a timetable entry.
   */
  async createTimetable(payload) {
    const requestBody = normalizeTimetablePayload(payload);

    const response = await api.post(
      TIMETABLE_BASE_PATH,
      requestBody,
    );

    return normalizeMutationResponse(getResponseData(response));
  },

  /**
   * Update an existing timetable entry.
   */
  async updateTimetable(timetableId, payload) {
    if (!/^[a-f\d]{24}$/i.test(String(timetableId ?? ''))) {
      throw new Error('A valid timetable ID is required.');
    }

    const requestBody = normalizeUpdatePayload(payload);

    const response = await api.patch(
      `${TIMETABLE_BASE_PATH}/${timetableId}`,
      requestBody,
    );

    return normalizeMutationResponse(getResponseData(response));
  },

  /**
   * Delete a timetable entry.
   */
  async deleteTimetable(timetableId) {
    if (!/^[a-f\d]{24}$/i.test(String(timetableId ?? ''))) {
      throw new Error('A valid timetable ID is required.');
    }

    const response = await api.delete(
      `${TIMETABLE_BASE_PATH}/${timetableId}`,
    );

    return getResponseData(response);
  },
};

export default timetableService;