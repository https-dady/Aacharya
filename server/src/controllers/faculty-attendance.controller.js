import mongoose from 'mongoose';

import {
  Attendance,
  ATTENDANCE_STATUSES,
} from '../models/attendance.model.js';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import {
  Course,
  COURSE_STATUSES,
} from '../models/course.model.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function createControllerError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function getAuthenticatedFacultyId(req) {
  const userId = req.user?.id || req.user?._id;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(userId);
}

function normalizeObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) {
    throw createControllerError(
      400,
      'INVALID_OBJECT_ID',
      `${fieldName} must be a valid MongoDB ID.`,
    );
  }

  return new mongoose.Types.ObjectId(value);
}

function normalizeDate(value, fieldName) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw createControllerError(
      400,
      'INVALID_DATE_FORMAT',
      `${fieldName} must use YYYY-MM-DD format.`,
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== value
  ) {
    throw createControllerError(
      400,
      'INVALID_DATE',
      `${fieldName} is not a valid calendar date.`,
    );
  }

  return date;
}

function getPagination(query) {
  const page = Number(query.page ?? DEFAULT_PAGE);
  const limit = Number(query.limit ?? DEFAULT_LIMIT);

  if (
    !Number.isInteger(page)
    || page < 1
    || !Number.isInteger(limit)
    || limit < 1
    || limit > MAX_LIMIT
  ) {
    throw createControllerError(
      400,
      'INVALID_PAGINATION',
      `Pagination requires a positive page and a limit between 1 and ${MAX_LIMIT}.`,
    );
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

async function getAuthenticatedFaculty(req) {
  const facultyId = getAuthenticatedFacultyId(req);

  if (!facultyId) {
    throw createControllerError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'A valid authenticated Faculty account is required.',
    );
  }

  const faculty = await User.findOne({
    _id: facultyId,
    role: USER_ROLES.FACULTY,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id department role status')
    .lean()
    .exec();

  if (!faculty) {
    throw createControllerError(
      401,
      'ACTIVE_FACULTY_NOT_FOUND',
      'The active Faculty account could not be found.',
    );
  }

  if (!faculty.department) {
    throw createControllerError(
      403,
      'FACULTY_DEPARTMENT_REQUIRED',
      'Your Faculty account is not assigned to a department.',
    );
  }

  return faculty;
}

async function getFacultyAssignedCourse(faculty, courseId) {
  const courseObjectId = normalizeObjectId(
    courseId,
    'courseId',
  );

  const course = await Course.findOne({
    _id: courseObjectId,
    faculty: faculty._id,
    department: faculty.department,
    status: COURSE_STATUSES.ACTIVE,
  })
    .select(
      '_id title code department faculty batches sections status',
    )
    .lean()
    .exec();

  if (!course) {
    throw createControllerError(
      404,
      'ASSIGNED_COURSE_NOT_FOUND',
      'The requested active course was not found among your assigned courses.',
    );
  }

  if (
    !course.batches?.length
    && !course.sections?.length
  ) {
    throw createControllerError(
      409,
      'COURSE_STUDENT_SCOPE_MISSING',
      'The course has no assigned batches or sections. Student attendance cannot be managed until its student scope is configured.',
    );
  }

  return course;
}

function getCourseStudentFilter(course) {
  const filter = {
    department: course.department,
    role: USER_ROLES.STUDENT,
    status: ACCOUNT_STATUSES.ACTIVE,
  };

  if (course.batches?.length) {
    filter.assignedBatches = {
      $in: course.batches,
    };
  }

  if (course.sections?.length) {
    filter.assignedSections = {
      $in: course.sections,
    };
  }

  return filter;
}

function getStudentCoursePlacement(student, course) {
  const courseBatchIds = new Set(
    (course.batches || []).map(String),
  );

  const courseSectionIds = new Set(
    (course.sections || []).map(String),
  );

  const batchId = (student.assignedBatches || []).find(
    (id) => courseBatchIds.has(String(id)),
  );

  const sectionId = (student.assignedSections || []).find(
    (id) => courseSectionIds.has(String(id)),
  );

  return {
    batch: batchId || null,
    section: sectionId || null,
  };
}

function normalizeAttendanceRecord(record) {
  const student = record.student || {};
  const course = record.course || {};
  const batch = record.batch || {};
  const section = record.section || {};
  const markedBy = record.markedBy || {};

  return {
    id: String(record._id),

    student: {
      id: student._id ? String(student._id) : null,
      institutionalId: student.institutionalId || '',
      fullName: student.fullName || 'Unknown student',
    },

    course: {
      id: course._id ? String(course._id) : null,
      title: course.title || '',
      code: course.code || '',
    },

    batch: batch._id
      ? {
          id: String(batch._id),
          name: batch.name || '',
          code: batch.code || '',
        }
      : null,

    section: section._id
      ? {
          id: String(section._id),
          name: section.name || '',
          code: section.code || '',
        }
      : null,

    sessionDate: record.sessionDate,
    sessionKey: record.sessionKey,
    status: record.status,
    remarks: record.remarks || '',

    markedBy: markedBy._id
      ? {
          id: String(markedBy._id),
          fullName: markedBy.fullName || '',
        }
      : null,

    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function populateAttendance(query) {
  return query
    .populate({
      path: 'student',
      select: 'institutionalId fullName',
    })
    .populate({
      path: 'course',
      select: 'title code',
    })
    .populate({
      path: 'batch',
      select: 'name code',
    })
    .populate({
      path: 'section',
      select: 'name code',
    })
    .populate({
      path: 'markedBy',
      select: 'fullName',
    });
}

/**
 * GET /api/v1/attendance/faculty/:courseId
 *
 * Lists attendance records for one active course assigned
 * to the authenticated Faculty member.
 */
export async function listFacultyAttendanceController(
  req,
  res,
  next,
) {
  try {
    const faculty = await getAuthenticatedFaculty(req);

    const course = await getFacultyAssignedCourse(
      faculty,
      req.params.courseId,
    );

    const {
      page,
      limit,
      skip,
    } = getPagination(req.query);

    const filter = {
      course: course._id,
    };

    const startDate = normalizeDate(
      req.query.startDate,
      'startDate',
    );

    const endDate = normalizeDate(
      req.query.endDate,
      'endDate',
    );

    if (startDate && endDate && startDate > endDate) {
      throw createControllerError(
        400,
        'INVALID_DATE_RANGE',
        'endDate must be on or after startDate.',
      );
    }

    if (startDate || endDate) {
      filter.sessionDate = {};

      if (startDate) {
        filter.sessionDate.$gte = startDate;
      }

      if (endDate) {
        const exclusiveEndDate = new Date(endDate);

        exclusiveEndDate.setUTCDate(
          exclusiveEndDate.getUTCDate() + 1,
        );

        filter.sessionDate.$lt = exclusiveEndDate;
      }
    }

    if (req.query.status) {
      if (
        !Object.values(ATTENDANCE_STATUSES).includes(
          req.query.status,
        )
      ) {
        throw createControllerError(
          400,
          'INVALID_ATTENDANCE_STATUS',
          'The requested attendance status is invalid.',
        );
      }

      filter.status = req.query.status;
    }

    if (req.query.batchId) {
      filter.batch = normalizeObjectId(
        req.query.batchId,
        'batchId',
      );
    }

    if (req.query.sectionId) {
      filter.section = normalizeObjectId(
        req.query.sectionId,
        'sectionId',
      );
    }

    const [records, total] = await Promise.all([
      populateAttendance(
        Attendance.find(filter),
      )
        .sort({
          sessionDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      Attendance.countDocuments(filter).exec(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        course: {
          id: String(course._id),
          title: course.title,
          code: course.code,
        },

        items: records.map(normalizeAttendanceRecord),

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
 * POST /api/v1/attendance/faculty/:courseId
 *
 * Marks attendance for eligible students of an assigned course.
 *
 * Existing records are updated by their unique
 * student + course + sessionKey combination.
 */
export async function markFacultyAttendanceController(
  req,
  res,
  next,
) {
  try {
    const faculty = await getAuthenticatedFaculty(req);

    const course = await getFacultyAssignedCourse(
      faculty,
      req.params.courseId,
    );

    const sessionDate = normalizeDate(
      req.body.sessionDate,
      'sessionDate',
    );

    const sessionKey =
      typeof req.body.sessionKey === 'string'
        ? req.body.sessionKey.trim()
        : '';

    if (
      !sessionKey
      || sessionKey.length > 100
    ) {
      throw createControllerError(
        400,
        'INVALID_SESSION_KEY',
        'A sessionKey between 1 and 100 characters is required.',
      );
    }

    const entries = req.body.records;

    if (
      !Array.isArray(entries)
      || entries.length === 0
      || entries.length > 200
    ) {
      throw createControllerError(
        400,
        'INVALID_ATTENDANCE_RECORDS',
        'Attendance must contain between 1 and 200 student records.',
      );
    }

    const allowedStatuses = Object.values(
      ATTENDANCE_STATUSES,
    );

    const normalizedEntries = entries.map((entry) => {
      const studentId = normalizeObjectId(
        entry.studentId,
        'studentId',
      );

      if (!allowedStatuses.includes(entry.status)) {
        throw createControllerError(
          400,
          'INVALID_ATTENDANCE_STATUS',
          `Attendance status must be one of: ${allowedStatuses.join(', ')}.`,
        );
      }

      const remarks =
        typeof entry.remarks === 'string'
          ? entry.remarks.trim()
          : '';

      if (remarks.length > 500) {
        throw createControllerError(
          400,
          'INVALID_ATTENDANCE_REMARKS',
          'Attendance remarks cannot exceed 500 characters.',
        );
      }

      return {
        studentId,
        status: entry.status,
        remarks,
      };
    });

    const uniqueStudentIds = new Set(
      normalizedEntries.map((entry) =>
        String(entry.studentId),
      ),
    );

    if (uniqueStudentIds.size !== normalizedEntries.length) {
      throw createControllerError(
        400,
        'DUPLICATE_STUDENT_ENTRIES',
        'A student can appear only once in a single attendance submission.',
      );
    }

    const students = await User.find({
      _id: {
        $in: normalizedEntries.map(
          (entry) => entry.studentId,
        ),
      },
      ...getCourseStudentFilter(course),
    })
      .select(
        '_id institutionalId fullName assignedBatches assignedSections',
      )
      .lean()
      .exec();

    const studentsById = new Map(
      students.map((student) => [
        String(student._id),
        student,
      ]),
    );

    const unauthorizedStudentIds = normalizedEntries
      .filter(
        (entry) =>
          !studentsById.has(String(entry.studentId)),
      )
      .map((entry) => String(entry.studentId));

    if (unauthorizedStudentIds.length > 0) {
      throw createControllerError(
        403,
        'STUDENT_OUTSIDE_COURSE_SCOPE',
        'One or more students are not active members of the selected course batch or section.',
      );
    }

    const operations = normalizedEntries.map((entry) => {
      const student = studentsById.get(
        String(entry.studentId),
      );

      const placement = getStudentCoursePlacement(
        student,
        course,
      );

      return {
        updateOne: {
          filter: {
            student: entry.studentId,
            course: course._id,
            sessionKey,
          },

          update: {
            $set: {
              status: entry.status,
              remarks: entry.remarks,
              sessionDate,
              batch: placement.batch,
              section: placement.section,
            },

            $setOnInsert: {
              student: entry.studentId,
              course: course._id,
              sessionKey,
              markedBy: faculty._id,
            },
          },

          upsert: true,
        },
      };
    });

    const result = await Attendance.bulkWrite(
      operations,
      {
        ordered: true,
      },
    );

    const attendanceRecords = await populateAttendance(
      Attendance.find({
        course: course._id,
        sessionKey,
        student: {
          $in: normalizedEntries.map(
            (entry) => entry.studentId,
          ),
        },
      }),
    )
      .sort({
        createdAt: -1,
      })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: 'Attendance has been saved successfully.',

      data: {
        course: {
          id: String(course._id),
          title: course.title,
          code: course.code,
        },

        session: {
          sessionDate,
          sessionKey,
        },

        summary: {
          submitted: normalizedEntries.length,
          inserted: result.upsertedCount || 0,
          updated: result.modifiedCount || 0,
        },

        items: attendanceRecords.map(
          normalizeAttendanceRecord,
        ),
      },
    });
  } catch (error) {
    return next(error);
  }
}