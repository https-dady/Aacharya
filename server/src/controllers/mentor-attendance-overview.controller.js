import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';
import { Section } from '../models/section.model.js';

import {
  Attendance,
  ATTENDANCE_STATUSES,
} from '../models/attendance.model.js';

const ATTENDANCE_THRESHOLD = 75;

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeDate(value, fieldName) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError(
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
    throw createError(
      400,
      'INVALID_DATE',
      `${fieldName} is not a valid calendar date.`,
    );
  }

  return date;
}

function normalizeStudent(student, attendance) {
  const total = attendance?.total ?? 0;
  const present = attendance?.present ?? 0;
  const absent = attendance?.absent ?? 0;
  const late = attendance?.late ?? 0;

  const percentage = total > 0
    ? Number(((present / total) * 100).toFixed(2))
    : null;

  return {
    id: String(student._id),
    institutionalId: student.institutionalId ?? '',
    fullName: student.fullName ?? '',
    email: student.email ?? null,
    totalRecords: total,
    present,
    absent,
    late,
    percentage,
    requiresAttention:
      percentage !== null && percentage < ATTENDANCE_THRESHOLD,
  };
}

export async function getMentorAttendanceOverviewController(
  req,
  res,
  next,
) {
  try {
    const mentorId = req.user?.id ?? req.user?._id;

    if (!mongoose.isValidObjectId(mentorId)) {
      throw createError(
        401,
        'INVALID_AUTHENTICATED_USER',
        'A valid authenticated Mentor account is required.',
      );
    }

    const mentor = await User.findOne({
      _id: mentorId,
      status: ACCOUNT_STATUSES.ACTIVE,
      $or: [
        { role: USER_ROLES.MENTOR },
        { roles: USER_ROLES.MENTOR },
      ],
    })
      .select('_id department')
      .lean()
      .exec();

    if (!mentor) {
      throw createError(
        403,
        'MENTOR_ACCESS_REQUIRED',
        'An active Mentor account is required.',
      );
    }

    if (!mentor.department) {
      throw createError(
        403,
        'DEPARTMENT_NOT_ASSIGNED',
        'Your Mentor account is not assigned to a department.',
      );
    }

    const department = await Department.findOne({
      _id: mentor.department,
      status: 'ACTIVE',
    })
      .select('_id name code')
      .lean()
      .exec();

    if (!department) {
      throw createError(
        409,
        'DEPARTMENT_UNAVAILABLE',
        'Your assigned department is unavailable.',
      );
    }

    const startDate = normalizeDate(
      req.query.startDate,
      'startDate',
    );

    const endDate = normalizeDate(
      req.query.endDate,
      'endDate',
    );

    if (startDate && endDate && startDate > endDate) {
      throw createError(
        400,
        'INVALID_DATE_RANGE',
        'endDate must be on or after startDate.',
      );
    }

    const sections = await Section.find({
      department: department._id,
      mentor: mentor._id,
      status: 'ACTIVE',
    })
      .select('_id name code')
      .sort({ name: 1 })
      .lean()
      .exec();

    const sectionIds = sections.map(
      (section) => section._id,
    );

    if (sectionIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active sections are assigned to this mentor.',
        data: {
          attendance: {
            totalRecords: 0,
            present: 0,
            absent: 0,
            late: 0,
            averagePercentage: null,
            belowThresholdCount: 0,
            threshold: ATTENDANCE_THRESHOLD,
          },
          students: {
            totalAssigned: 0,
            withAttendanceRecords: 0,
            withoutAttendanceRecords: 0,
          },
          atRiskStudents: [],
          sections: [],
          filters: {
            startDate: req.query.startDate ?? null,
            endDate: req.query.endDate ?? null,
          },
          generatedAt: new Date().toISOString(),
        },
      });
    }

    const studentFilter = {
      department: department._id,
      role: USER_ROLES.STUDENT,
      status: ACCOUNT_STATUSES.ACTIVE,
      assignedSections: {
        $in: sectionIds,
      },
    };

    const students = await User.find(studentFilter)
      .select('_id institutionalId fullName email')
      .sort({ fullName: 1 })
      .lean()
      .exec();

    const studentIds = students.map(
      (student) => student._id,
    );

    const attendanceFilter = {
      section: {
        $in: sectionIds,
      },
      student: {
        $in: studentIds,
      },
    };

    if (startDate || endDate) {
      attendanceFilter.sessionDate = {};

      if (startDate) {
        attendanceFilter.sessionDate.$gte = startDate;
      }

      if (endDate) {
        const exclusiveEndDate = new Date(endDate);
        exclusiveEndDate.setUTCDate(
          exclusiveEndDate.getUTCDate() + 1,
        );

        attendanceFilter.sessionDate.$lt = exclusiveEndDate;
      }
    }

    const groupedAttendance = studentIds.length
      ? await Attendance.aggregate([
          {
            $match: attendanceFilter,
          },
          {
            $group: {
              _id: {
                student: '$student',
                status: '$status',
              },
              count: {
                $sum: 1,
              },
            },
          },
        ])
      : [];

    const attendanceByStudent = new Map();

    const totals = {
      totalRecords: 0,
      present: 0,
      absent: 0,
      late: 0,
    };

    for (const record of groupedAttendance) {
      const studentId = String(record._id.student);

      if (!attendanceByStudent.has(studentId)) {
        attendanceByStudent.set(studentId, {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
        });
      }

      const studentAttendance =
        attendanceByStudent.get(studentId);

      studentAttendance.total += record.count;
      totals.totalRecords += record.count;

      if (record._id.status === ATTENDANCE_STATUSES.PRESENT) {
        studentAttendance.present += record.count;
        totals.present += record.count;
      } else if (
        record._id.status === ATTENDANCE_STATUSES.ABSENT
      ) {
        studentAttendance.absent += record.count;
        totals.absent += record.count;
      } else if (
        record._id.status === ATTENDANCE_STATUSES.LATE
      ) {
        studentAttendance.late += record.count;
        totals.late += record.count;
      }
    }

    const studentAttendanceDetails = students.map(
      (student) => {
        const attendance = attendanceByStudent.get(
          String(student._id),
        );

        return normalizeStudent(
          student,
          attendance,
        );
      },
    );

    const studentsWithRecords =
      studentAttendanceDetails.filter(
        (student) => student.totalRecords > 0,
      );

    const atRiskStudents = studentAttendanceDetails
      .filter((student) => student.requiresAttention)
      .sort((first, second) => {
        return first.percentage - second.percentage;
      });

    const averagePercentage = totals.totalRecords > 0
      ? Number(
          (
            (totals.present / totals.totalRecords) * 100
          ).toFixed(2),
        )
      : null;

    return res.status(200).json({
      success: true,
      message: 'Mentor attendance overview retrieved successfully.',
      data: {
        attendance: {
          ...totals,
          averagePercentage,
          belowThresholdCount: atRiskStudents.length,
          threshold: ATTENDANCE_THRESHOLD,
        },

        students: {
          totalAssigned: students.length,
          withAttendanceRecords: studentsWithRecords.length,
          withoutAttendanceRecords:
            students.length - studentsWithRecords.length,
        },

        atRiskStudents: atRiskStudents.slice(0, 20),

        sections: sections.map((section) => ({
          id: String(section._id),
          name: section.name,
          code: section.code,
        })),

        filters: {
          startDate: req.query.startDate ?? null,
          endDate: req.query.endDate ?? null,
        },

        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
}