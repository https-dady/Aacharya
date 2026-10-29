import mongoose from 'mongoose';

import { Attendance, ATTENDANCE_STATUSES } from '../models/attendance.model.js';
import { Department } from '../models/department.model.js';
import { User, USER_ROLES, ACCOUNT_STATUSES } from '../models/user.model.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ATTENDANCE_THRESHOLD = 75;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getAuthenticatedUserId(req) {
  const userId = req.user?.id || req.user?._id;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(userId);
}

function normalizeDate(value, fieldName) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw createHttpError(
      400,
      `${fieldName} must use YYYY-MM-DD format.`,
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createHttpError(400, `${fieldName} is not a valid date.`);
  }

  return date;
}

function normalizeObjectId(value, fieldName) {
  if (!value) {
    return null;
  }

  if (!mongoose.isValidObjectId(value)) {
    throw createHttpError(400, `${fieldName} must be a valid ID.`);
  }

  return new mongoose.Types.ObjectId(value);
}

function normalizeSearch(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, 100);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPagination(query) {
  const page = Number(query.page ?? DEFAULT_PAGE);
  const limit = Number(query.limit ?? DEFAULT_LIMIT);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIMIT
  ) {
    throw createHttpError(
      400,
      `Pagination must use a positive page and a limit between 1 and ${MAX_LIMIT}.`,
    );
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

async function getHodDepartment(req) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    throw createHttpError(
      401,
      'A valid authenticated HOD account is required.',
    );
  }

  const hod = await User.findOne({
    _id: userId,
    role: USER_ROLES.HOD,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id department')
    .lean()
    .exec();

  if (!hod || !hod.department) {
    throw createHttpError(
      403,
      'An active HOD account with a department assignment is required.',
    );
  }

  const department = await Department.findOne({
    _id: hod.department,
    hod: hod._id,
    status: 'ACTIVE',
  })
    .select('_id name code')
    .lean()
    .exec();

  if (!department) {
    throw createHttpError(
      403,
      'You are not authorized to access this department.',
    );
  }

  return {
    hod,
    department,
  };
}

async function getDepartmentStudentIds(departmentId) {
  const students = await User.find({
    department: departmentId,
    role: USER_ROLES.STUDENT,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id')
    .lean()
    .exec();

  return students.map((student) => student._id);
}

function buildAttendanceQuery({
  studentIds,
  query,
}) {
  const filter = {
    student: {
      $in: studentIds,
    },
  };

  const startDate = normalizeDate(query.startDate, 'startDate');
  const endDate = normalizeDate(query.endDate, 'endDate');

  if (startDate && endDate && startDate > endDate) {
    throw createHttpError(
      400,
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
      exclusiveEndDate.setUTCDate(exclusiveEndDate.getUTCDate() + 1);

      filter.sessionDate.$lt = exclusiveEndDate;
    }
  }

  const courseId = normalizeObjectId(query.courseId, 'courseId');
  const batchId = normalizeObjectId(query.batchId, 'batchId');
  const sectionId = normalizeObjectId(query.sectionId, 'sectionId');

  if (courseId) {
    filter.course = courseId;
  }

  if (batchId) {
    filter.batch = batchId;
  }

  if (sectionId) {
    filter.section = sectionId;
  }

  if (query.status) {
    const allowedStatuses = Object.values(ATTENDANCE_STATUSES);

    if (!allowedStatuses.includes(query.status)) {
      throw createHttpError(
        400,
        `status must be one of: ${allowedStatuses.join(', ')}.`,
      );
    }

    filter.status = query.status;
  }

  return filter;
}

function getAttendancePercentage(totalSessions, attendedSessions) {
  if (!totalSessions) {
    return 0;
  }

  return Number(
    ((attendedSessions / totalSessions) * 100).toFixed(1),
  );
}

function normalizeAttendanceRecord(record, percentage = null) {
  const student = record.student || {};
  const course = record.course || {};
  const batch = record.batch || {};
  const section = record.section || {};
  const markedBy = record.markedBy || {};

  return {
    id: String(record._id),

    studentId: student.institutionalId || '',
    studentName: student.fullName || 'Unknown student',

    batchId: batch._id ? String(batch._id) : null,
    batchName: batch.name || '',

    sectionId: section._id ? String(section._id) : null,
    sectionName: section.name || '',

    courseId: course._id ? String(course._id) : null,
    courseName: course.title || course.name || '',
    courseCode: course.code || '',

    date: record.sessionDate
      ? new Date(record.sessionDate).toISOString().slice(0, 10)
      : null,

    sessionKey: record.sessionKey,
    status: record.status,

    attendancePercentage: percentage,

    facultyName: markedBy.fullName || '',
    remarks: record.remarks || '',

    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function populateAttendanceQuery(query) {
  return query
    .populate({
      path: 'student',
      select: 'institutionalId fullName department role status',
    })
    .populate({
      path: 'course',
      select: 'title name code courseCode',
    })
    .populate({
      path: 'batch',
      select: 'name code academicYear',
    })
    .populate({
      path: 'section',
      select: 'name code',
    })
    .populate({
      path: 'markedBy',
      select: 'fullName institutionalId',
    });
}

function calculateStudentAttendance(records) {
  const studentMap = new Map();

  for (const record of records) {
    const student = record.student;

    if (!student?._id) {
      continue;
    }

    const studentId = String(student._id);

    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        student,
        batch: record.batch || null,
        section: record.section || null,
        totalSessions: 0,
        attendedSessions: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        courseIds: new Set(),
        latestAttendanceDate: null,
      });
    }

    const summary = studentMap.get(studentId);

    summary.totalSessions += 1;
    summary.courseIds.add(
      record.course?._id ? String(record.course._id) : '',
    );

    if (
      !summary.latestAttendanceDate ||
      new Date(record.sessionDate) > new Date(summary.latestAttendanceDate)
    ) {
      summary.latestAttendanceDate = record.sessionDate;
    }

    if (record.status === ATTENDANCE_STATUSES.PRESENT) {
      summary.presentCount += 1;
      summary.attendedSessions += 1;
    } else if (record.status === ATTENDANCE_STATUSES.LATE) {
      summary.lateCount += 1;
      summary.attendedSessions += 1;
    } else if (record.status === ATTENDANCE_STATUSES.ABSENT) {
      summary.absentCount += 1;
    }
  }

  return [...studentMap.values()].map((summary) => {
    const attendancePercentage = getAttendancePercentage(
      summary.totalSessions,
      summary.attendedSessions,
    );

    return {
      id: String(summary.student._id),

      studentId: summary.student.institutionalId || '',
      studentName: summary.student.fullName || 'Unknown student',

      batchId: summary.batch?._id
        ? String(summary.batch._id)
        : null,

      batchName: summary.batch?.name || '',

      sectionId: summary.section?._id
        ? String(summary.section._id)
        : null,

      sectionName: summary.section?.name || '',

      totalSessions: summary.totalSessions,
      attendedSessions: summary.attendedSessions,

      presentCount: summary.presentCount,
      absentCount: summary.absentCount,
      lateCount: summary.lateCount,

      courseCount: summary.courseIds.size,

      attendancePercentage,

      attendanceStatus:
        attendancePercentage < ATTENDANCE_THRESHOLD
          ? 'BELOW_THRESHOLD'
          : 'AT_OR_ABOVE_THRESHOLD',

      latestAttendanceDate: summary.latestAttendanceDate,
    };
  });
}

/**
 * GET /api/v1/attendance/manage
 *
 * Department-scoped student attendance overview.
 */
export async function listHodAttendanceController(req, res, next) {
  try {
    const { department } = await getHodDepartment(req);
    const { page, limit, skip } = getPagination(req.query);

    const studentIds = await getDepartmentStudentIds(department._id);

    if (studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          department: {
            id: String(department._id),
            name: department.name,
            code: department.code,
          },
          summary: {
            totalStudents: 0,
            averageAttendance: 0,
            lowAttendanceCount: 0,
          },
          students: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    }

    const attendanceFilter = buildAttendanceQuery({
      studentIds,
      query: req.query,
    });

    const records = await populateAttendanceQuery(
      Attendance.find(attendanceFilter),
    )
      .sort({
        sessionDate: -1,
        createdAt: -1,
      })
      .lean()
      .exec();

    const studentSummaries = calculateStudentAttendance(records);

    const search = normalizeSearch(req.query.search);

    const filteredSummaries = search
      ? studentSummaries.filter((student) => {
          const searchableValues = [
            student.studentName,
            student.studentId,
            student.batchName,
            student.sectionName,
          ];

          return searchableValues.some((value) =>
            String(value || '')
              .toLowerCase()
              .includes(search.toLowerCase()),
          );
        })
      : studentSummaries;

    filteredSummaries.sort((a, b) =>
      a.studentName.localeCompare(b.studentName),
    );

    const total = filteredSummaries.length;
    const students = filteredSummaries.slice(skip, skip + limit);

    const averageAttendance = total
      ? Number(
          (
            filteredSummaries.reduce(
              (sum, student) => sum + student.attendancePercentage,
              0,
            ) / total
          ).toFixed(1),
        )
      : 0;

    const lowAttendanceCount = filteredSummaries.filter(
      (student) =>
        student.attendancePercentage < ATTENDANCE_THRESHOLD,
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        department: {
          id: String(department._id),
          name: department.name,
          code: department.code,
        },

        summary: {
          totalStudents: total,
          averageAttendance,
          lowAttendanceCount,
          attendanceThreshold: ATTENDANCE_THRESHOLD,
        },

        students,

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
 * GET /api/v1/attendance/manage/reports
 *
 * Detailed department attendance report.
 */
export async function listHodAttendanceReportsController(
  req,
  res,
  next,
) {
  try {
    const { department } = await getHodDepartment(req);
    const { page, limit, skip } = getPagination(req.query);

    const studentIds = await getDepartmentStudentIds(department._id);

    if (studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          department: {
            id: String(department._id),
            name: department.name,
            code: department.code,
          },
          summary: {
            totalRecords: 0,
            averageAttendance: 0,
            belowThreshold: 0,
          },
          records: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    }

    const attendanceFilter = buildAttendanceQuery({
      studentIds,
      query: req.query,
    });

    const allRecords = await populateAttendanceQuery(
      Attendance.find(attendanceFilter),
    )
      .sort({
        sessionDate: -1,
        createdAt: -1,
      })
      .lean()
      .exec();

    const studentSummaries = calculateStudentAttendance(allRecords);
    const studentSummaryById = new Map(
      studentSummaries.map((student) => [
        student.id,
        student,
      ]),
    );

    const sectionFilter = normalizeSearch(req.query.section);

    const filteredRecords = allRecords.filter((record) => {
      if (!sectionFilter) {
        return true;
      }

      const sectionName = record.section?.name || '';
      const sectionCode = record.section?.code || '';

      return (
        sectionName.toLowerCase() === sectionFilter.toLowerCase() ||
        sectionCode.toLowerCase() === sectionFilter.toLowerCase()
      );
    });

    const records = filteredRecords.map((record) => {
      const studentId = record.student?._id
        ? String(record.student._id)
        : '';

      const studentSummary = studentSummaryById.get(studentId);

      return normalizeAttendanceRecord(
        record,
        studentSummary?.attendancePercentage ?? 0,
      );
    });

    const total = records.length;
    const pageRecords = records.slice(skip, skip + limit);

    const averageAttendance = studentSummaries.length
      ? Number(
          (
            studentSummaries.reduce(
              (sum, student) => sum + student.attendancePercentage,
              0,
            ) / studentSummaries.length
          ).toFixed(1),
        )
      : 0;

    const belowThreshold = studentSummaries.filter(
      (student) =>
        student.attendancePercentage < ATTENDANCE_THRESHOLD,
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        department: {
          id: String(department._id),
          name: department.name,
          code: department.code,
        },

        summary: {
          totalRecords: total,
          averageAttendance,
          belowThreshold,
          attendanceThreshold: ATTENDANCE_THRESHOLD,
        },

        records: pageRecords,

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