import mongoose from 'mongoose';

import {
  Timetable,
  TIMETABLE_STATUSES,
} from '../models/timetable.model.js';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

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

    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/**
 * GET /api/v1/timetable/my-schedule
 *
 * Returns timetable entries belonging only to the
 * authenticated Faculty account.
 */
export async function listMyFacultyTimetableController(
  req,
  res,
  next,
) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!mongoose.isValidObjectId(userId)) {
      throw createError(
        401,
        'INVALID_AUTHENTICATED_USER',
        'A valid authenticated account is required.',
      );
    }

    const faculty = await User.findOne({
      _id: userId,
      role: USER_ROLES.FACULTY,
      status: ACCOUNT_STATUSES.ACTIVE,
    })
      .select('_id department role status')
      .lean()
      .exec();

    if (!faculty) {
      throw createError(
        403,
        'FACULTY_ACCESS_REQUIRED',
        'Only an active Faculty account can access this timetable.',
      );
    }

    if (!faculty.department) {
      throw createError(
        403,
        'DEPARTMENT_NOT_ASSIGNED',
        'Your faculty account is not assigned to a department.',
      );
    }

    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 50,
      ),
    );

    const filter = {
      department: faculty.department,
      faculty: faculty._id,
      status: req.query.status || TIMETABLE_STATUSES.ACTIVE,
    };

    if (req.query.day) {
      filter.day = req.query.day;
    }

    if (req.query.courseId) {
      if (!mongoose.isValidObjectId(req.query.courseId)) {
        throw createError(
          400,
          'INVALID_COURSE_ID',
          'A valid course ID is required.',
        );
      }

      filter.course = req.query.courseId;
    }

    if (req.query.batchId) {
      if (!mongoose.isValidObjectId(req.query.batchId)) {
        throw createError(
          400,
          'INVALID_BATCH_ID',
          'A valid batch ID is required.',
        );
      }

      filter.batch = req.query.batchId;
    }

    if (req.query.sectionId) {
      if (!mongoose.isValidObjectId(req.query.sectionId)) {
        throw createError(
          400,
          'INVALID_SECTION_ID',
          'A valid section ID is required.',
        );
      }

      filter.section = req.query.sectionId;
    }

    const [entries, total] = await Promise.all([
      Timetable.find(filter)
        .populate('course', 'title code')
        .populate('faculty', 'fullName email')
        .populate('batch', 'name code')
        .populate('section', 'name code')
        .sort({
          day: 1,
          startTime: 1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),

      Timetable.countDocuments(filter).exec(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Faculty timetable retrieved successfully.',
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