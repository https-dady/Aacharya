import mongoose from 'mongoose';

import { Timetable, TIMETABLE_STATUSES } from '../models/timetable.model.js';
import { User, USER_ROLES, ACCOUNT_STATUSES } from '../models/user.model.js';
import { Department } from '../models/department.model.js';
import { Course, COURSE_STATUSES } from '../models/course.model.js';
import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeId(value) {
  if (!value) {
    return null;
  }

  return String(value._id ?? value);
}

function getAuthenticatedUserId(req) {
  return req.user?.id ?? req.user?._id;
}

async function getHodContext(req) {
  const userId = getAuthenticatedUserId(req);

  if (!mongoose.isValidObjectId(userId)) {
    throw createError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'A valid authenticated account is required.',
    );
  }

  const user = await User.findOne({
    _id: userId,
    role: USER_ROLES.HOD,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id role department status')
    .lean()
    .exec();

  if (!user) {
    throw createError(
      403,
      'HOD_ACCESS_REQUIRED',
      'Only an active HOD can manage the department timetable.',
    );
  }

  if (!user.department) {
    throw createError(
      403,
      'DEPARTMENT_NOT_ASSIGNED',
      'Your account is not assigned to a department.',
    );
  }

  const department = await Department.findOne({
    _id: user.department,
    hod: user._id,
    status: 'ACTIVE',
  })
    .select('_id name code hod status')
    .lean()
    .exec();

  if (!department) {
    throw createError(
      403,
      'DEPARTMENT_ACCESS_DENIED',
      'Your HOD department assignment could not be verified.',
    );
  }

  return { user, department };
}

function normalizeTime(value, fieldName) {
  if (
    typeof value !== 'string'
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  ) {
    throw createError(
      400,
      'INVALID_TIME',
      `${fieldName} must use 24-hour HH:mm format.`,
    );
  }

  return value;
}

function normalizeRoom(value) {
  if (typeof value !== 'string') {
    throw createError(
      400,
      'INVALID_ROOM',
      'A classroom or room name is required.',
    );
  }

  const room = value.trim();

  if (!room || room.length > 100) {
    throw createError(
      400,
      'INVALID_ROOM',
      'Room name must contain between 1 and 100 characters.',
    );
  }

  return room;
}

function validateObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) {
    throw createError(
      400,
      'INVALID_REFERENCE_ID',
      `A valid ${fieldName} ID is required.`,
    );
  }

  return new mongoose.Types.ObjectId(value);
}

function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function normalizeTimetableEntry(entry) {
  return {
    id: normalizeId(entry._id),

    department: entry.department
      ? {
          id: normalizeId(entry.department._id),
          name: entry.department.name,
          code: entry.department.code,
        }
      : normalizeId(entry.department),

    course: entry.course
      ? {
          id: normalizeId(entry.course._id),
          title: entry.course.title,
          code: entry.course.code,
        }
      : normalizeId(entry.course),

    faculty: entry.faculty
      ? {
          id: normalizeId(entry.faculty._id),
          fullName: entry.faculty.fullName,
          email: entry.faculty.email,
        }
      : normalizeId(entry.faculty),

    batch: entry.batch
      ? {
          id: normalizeId(entry.batch._id),
          name: entry.batch.name,
          code: entry.batch.code,
        }
      : normalizeId(entry.batch),

    section: entry.section
      ? {
          id: normalizeId(entry.section._id),
          name: entry.section.name,
          code: entry.section.code,
        }
      : normalizeId(entry.section),

    day: entry.day,
    startTime: entry.startTime,
    endTime: entry.endTime,
    room: entry.room,
    status: entry.status,

    createdBy: normalizeId(entry.createdBy),
    updatedBy: normalizeId(entry.updatedBy),

    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

async function populateTimetableEntry(id) {
  return Timetable.findById(id)
    .populate('department', 'name code')
    .populate('course', 'title code')
    .populate('faculty', 'fullName email')
    .populate('batch', 'name code')
    .populate('section', 'name code')
    .lean()
    .exec();
}

async function validateScheduleReferences({
  departmentId,
  courseId,
  facultyId,
  batchId,
  sectionId,
}) {
  const [course, faculty, batch, section] = await Promise.all([
    Course.findOne({
      _id: courseId,
      department: departmentId,
      status: COURSE_STATUSES.ACTIVE,
    })
      .select('_id title code department batches sections')
      .lean()
      .exec(),

    User.findOne({
  _id: facultyId,
  department: departmentId,
  role: {
    $in: [
      USER_ROLES.FACULTY,
      USER_ROLES.MENTOR,
    ],
  },
  status: ACCOUNT_STATUSES.ACTIVE,
})
      .select('_id fullName email department role status')
      .lean()
      .exec(),

    Batch.findOne({
      _id: batchId,
      department: departmentId,
      status: 'ACTIVE',
    })
      .select('_id name code department')
      .lean()
      .exec(),

    Section.findOne({
      _id: sectionId,
      department: departmentId,
      batch: batchId,
      status: 'ACTIVE',
    })
      .select('_id name code department batch')
      .lean()
      .exec(),
  ]);

  if (!course) {
    throw createError(
      404,
      'COURSE_NOT_FOUND',
      'The active course was not found in your department.',
    );
  }

  if (!faculty) {
    throw createError(
      404,
      'FACULTY_NOT_FOUND',
      'The active faculty member was not found in your department.',
    );
  }

  if (!batch) {
    throw createError(
      404,
      'BATCH_NOT_FOUND',
      'The active batch was not found in your department.',
    );
  }

  if (!section) {
    throw createError(
      404,
      'SECTION_NOT_FOUND',
      'The active section does not belong to the selected batch.',
    );
  }

  if (
    Array.isArray(course.batches)
    && course.batches.length > 0
    && !course.batches.some(
      (id) => normalizeId(id) === batchId.toString(),
    )
  ) {
    throw createError(
      400,
      'COURSE_BATCH_MISMATCH',
      'The selected batch is not assigned to this course.',
    );
  }

  if (
    Array.isArray(course.sections)
    && course.sections.length > 0
    && !course.sections.some(
      (id) => normalizeId(id) === sectionId.toString(),
    )
  ) {
    throw createError(
      400,
      'COURSE_SECTION_MISMATCH',
      'The selected section is not assigned to this course.',
    );
  }

  return { course, faculty, batch, section };
}

async function ensureNoScheduleConflict({
  departmentId,
  facultyId,
  batchId,
  sectionId,
  day,
  startTime,
  endTime,
  room,
  excludeId = null,
}) {
  const query = {
    department: departmentId,
    day,
    status: TIMETABLE_STATUSES.ACTIVE,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const sameDayEntries = await Timetable.find(query)
    .select(
      '_id faculty batch section day startTime endTime room course',
    )
    .lean()
    .exec();

  const conflictingEntries = sameDayEntries.filter((entry) => {
    if (
      !timesOverlap(
        startTime,
        endTime,
        entry.startTime,
        entry.endTime,
      )
    ) {
      return false;
    }

    const sameFaculty =
      normalizeId(entry.faculty) === facultyId.toString();

    const sameRoom =
      entry.room.trim().toLowerCase() === room.trim().toLowerCase();

    const sameClass =
      normalizeId(entry.batch) === batchId.toString()
      && normalizeId(entry.section) === sectionId.toString();

    return sameFaculty || sameRoom || sameClass;
  });

  if (conflictingEntries.length === 0) {
    return;
  }

  const firstConflict = conflictingEntries[0];

  const sameFaculty =
    normalizeId(firstConflict.faculty) === facultyId.toString();

  const sameRoom =
    firstConflict.room.trim().toLowerCase() === room.trim().toLowerCase();

  let message = 'The selected time conflicts with an existing timetable entry.';

  let code = 'TIMETABLE_CONFLICT';

  if (sameFaculty) {
    message = 'This faculty member already has a class during the selected time.';
    code = 'FACULTY_SCHEDULE_CONFLICT';
  } else if (sameRoom) {
    message = 'This classroom is already booked during the selected time.';
    code = 'ROOM_SCHEDULE_CONFLICT';
  } else {
    message = 'This batch and section already have a class during the selected time.';
    code = 'CLASS_SCHEDULE_CONFLICT';
  }

  throw createError(409, code, message);
}

function getScheduleValues(body, existing = null) {
  const day = body.day ?? existing?.day;

  const startTime = normalizeTime(
    body.startTime ?? existing?.startTime,
    'startTime',
  );

  const endTime = normalizeTime(
    body.endTime ?? existing?.endTime,
    'endTime',
  );

  if (!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(day)) {
    throw createError(
      400,
      'INVALID_TIMETABLE_DAY',
      'Select a valid weekday from Monday to Saturday.',
    );
  }

  if (endTime <= startTime) {
    throw createError(
      400,
      'INVALID_TIME_RANGE',
      'End time must be later than start time.',
    );
  }

  return {
    day,
    startTime,
    endTime,
    room: normalizeRoom(body.room ?? existing?.room),
  };
}

/**
 * GET /api/v1/timetable/manage
 *
 * Supports optional day, batch, section, faculty and course filters.
 */
export async function listTimetableController(req, res, next) {
  try {
    const { department } = await getHodContext(req);

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 50),
    );

    const filter = {
      department: department._id,
    };

    if (req.query.day) {
      filter.day = req.query.day;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    for (const field of ['courseId', 'facultyId', 'batchId', 'sectionId']) {
      if (req.query[field]) {
        filter[
          {
            courseId: 'course',
            facultyId: 'faculty',
            batchId: 'batch',
            sectionId: 'section',
          }[field]
        ] = validateObjectId(req.query[field], field);
      }
    }

    const [entries, total] = await Promise.all([
      Timetable.find(filter)
        .populate('course', 'title code')
        .populate('faculty', 'fullName email')
        .populate('batch', 'name code')
        .populate('section', 'name code')
        .sort({ day: 1, startTime: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),

      Timetable.countDocuments(filter).exec(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: entries.map(normalizeTimetableEntry),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/timetable/manage
 */
export async function createTimetableController(req, res, next) {
  try {
    const { user, department } = await getHodContext(req);

    const courseId = validateObjectId(req.body.courseId, 'course');
    const facultyId = validateObjectId(req.body.facultyId, 'faculty');
    const batchId = validateObjectId(req.body.batchId, 'batch');
    const sectionId = validateObjectId(req.body.sectionId, 'section');

    const schedule = getScheduleValues(req.body);

    await validateScheduleReferences({
      departmentId: department._id,
      courseId,
      facultyId,
      batchId,
      sectionId,
    });

    await ensureNoScheduleConflict({
      departmentId: department._id,
      facultyId,
      batchId,
      sectionId,
      ...schedule,
    });

    const entry = await Timetable.create({
      department: department._id,
      course: courseId,
      faculty: facultyId,
      batch: batchId,
      section: sectionId,
      ...schedule,
      status: TIMETABLE_STATUSES.ACTIVE,
      createdBy: user._id,
      updatedBy: user._id,
    });

    const populated = await populateTimetableEntry(entry._id);

    return res.status(201).json({
      success: true,
      message: 'Timetable entry created successfully.',
      data: {
        item: normalizeTimetableEntry(populated),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/v1/timetable/manage/:timetableId
 */
export async function updateTimetableController(req, res, next) {
  try {
    const { user, department } = await getHodContext(req);

    const timetableId = validateObjectId(
      req.params.timetableId,
      'timetable entry',
    );

    const entry = await Timetable.findOne({
      _id: timetableId,
      department: department._id,
    }).exec();

    if (!entry) {
      throw createError(
        404,
        'TIMETABLE_ENTRY_NOT_FOUND',
        'The timetable entry was not found in your department.',
      );
    }

    const courseId = validateObjectId(
      req.body.courseId ?? entry.course,
      'course',
    );

    const facultyId = validateObjectId(
      req.body.facultyId ?? entry.faculty,
      'faculty',
    );

    const batchId = validateObjectId(
      req.body.batchId ?? entry.batch,
      'batch',
    );

    const sectionId = validateObjectId(
      req.body.sectionId ?? entry.section,
      'section',
    );

    const schedule = getScheduleValues(req.body, entry);

    await validateScheduleReferences({
      departmentId: department._id,
      courseId,
      facultyId,
      batchId,
      sectionId,
    });

    await ensureNoScheduleConflict({
      departmentId: department._id,
      facultyId,
      batchId,
      sectionId,
      ...schedule,
      excludeId: entry._id,
    });

    entry.course = courseId;
    entry.faculty = facultyId;
    entry.batch = batchId;
    entry.section = sectionId;
    entry.day = schedule.day;
    entry.startTime = schedule.startTime;
    entry.endTime = schedule.endTime;
    entry.room = schedule.room;
    entry.updatedBy = user._id;

    await entry.save();

    const populated = await populateTimetableEntry(entry._id);

    return res.status(200).json({
      success: true,
      message: 'Timetable entry updated successfully.',
      data: {
        item: normalizeTimetableEntry(populated),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/v1/timetable/manage/:timetableId
 *
 * Permanently removes the entry from the timetable.
 * The request is restricted to the authenticated HOD's department.
 */
export async function deleteTimetableController(req, res, next) {
  try {
    const { department } = await getHodContext(req);

    const timetableId = validateObjectId(
      req.params.timetableId,
      'timetable entry',
    );

    const deletedEntry = await Timetable.findOneAndDelete({
      _id: timetableId,
      department: department._id,
    }).exec();

    if (!deletedEntry) {
      throw createError(
        404,
        'TIMETABLE_ENTRY_NOT_FOUND',
        'The timetable entry was not found in your department.',
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Timetable entry deleted successfully.',
      data: {
        id: deletedEntry._id.toString(),
      },
    });
  } catch (error) {
    return next(error);
  }
}