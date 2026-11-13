import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';
import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';
import { Attendance } from '../models/attendance.model.js';

import {
  ATTENDANCE_STATUSES,
} from '../models/attendance.model.js';

import {
  hasUserRole,
} from '../utils/role-access.util.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeId(value) {
  if (!value) return null;

  return String(value._id ?? value);
}

function normalizeStudent(student) {
  return {
    id: String(student._id),
    institutionalId: student.institutionalId,
    fullName: student.fullName,
    email: student.email ?? null,
    status: student.status,

    assignedBatches: (
      student.assignedBatches ?? []
    ).map(normalizeId),

    assignedSections: (
      student.assignedSections ?? []
    ).map(normalizeId),

    createdAt: student.createdAt,
  };
}

async function getAuthenticatedMentor(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw createError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'A valid authenticated account is required.',
    );
  }

  const mentor = await User.findOne({
    _id: userId,
    status: ACCOUNT_STATUSES.ACTIVE,

    $or: [
      {
        role: USER_ROLES.MENTOR,
      },
      {
        roles: USER_ROLES.MENTOR,
      },
    ],
  })
    .select(
      '_id institutionalId fullName email role roles status department assignedBatches assignedSections',
    )
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
    .select('_id name code status')
    .lean()
    .exec();

  if (!department) {
    throw createError(
      403,
      'DEPARTMENT_UNAVAILABLE',
      'Your assigned department is not active.',
    );
  }

  return {
    mentor,
    department,
  };
}

/**
 * GET /api/v1/provisioning/mentor/dashboard
 *
 * Returns actual dashboard information for the authenticated
 * Mentor and their assigned batches and sections.
 */
export async function getMentorDashboardController(
  req,
  res,
  next,
) {
  try {
    const { mentor, department } =
      await getAuthenticatedMentor(req.user?.id);

    const assignedBatchIds = [
      ...new Set(
        (mentor.assignedBatches ?? []).map(String),
      ),
    ];

    const assignedSectionIds = [
      ...new Set(
        (mentor.assignedSections ?? []).map(String),
      ),
    ];

    const [
      batches,
      sections,
    ] = await Promise.all([
      assignedBatchIds.length
        ? Batch.find({
            _id: {
              $in: assignedBatchIds,
            },
            department: department._id,
            status: 'ACTIVE',
          })
            .select('_id name code academicYear')
            .sort({ name: 1 })
            .lean()
            .exec()
        : [],

      assignedSectionIds.length
        ? Section.find({
            _id: {
              $in: assignedSectionIds,
            },
            department: department._id,
            mentor: mentor._id,
            status: 'ACTIVE',
          })
            .select('_id name code batch')
            .populate('batch', 'name code academicYear')
            .sort({ name: 1 })
            .lean()
            .exec()
        : [],
    ]);

    const validBatchIds = batches.map(
      (batch) => batch._id,
    );

    const validSectionIds = sections.map(
      (section) => section._id,
    );

    const studentFilter = {
      role: USER_ROLES.STUDENT,
      department: department._id,
      status: ACCOUNT_STATUSES.ACTIVE,
      assignedSections: {
        $in: validSectionIds,
      },
    };

    const [
      studentCount,
      recentStudents,
      attendanceSummary,
    ] = await Promise.all([
      validSectionIds.length
        ? User.countDocuments(studentFilter)
        : 0,

      validSectionIds.length
        ? User.find(studentFilter)
            .select(
              '_id institutionalId fullName email status assignedBatches assignedSections createdAt',
            )
            .sort({
              createdAt: -1,
              _id: -1,
            })
            .limit(5)
            .lean()
            .exec()
        : [],

      validSectionIds.length
        ? Attendance.aggregate([
            {
              $match: {
                section: {
                  $in: validSectionIds,
                },
              },
            },
            {
              $group: {
                _id: '$status',
                count: {
                  $sum: 1,
                },
              },
            },
          ])
        : [],
    ]);

    const attendance = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
    };

    for (const record of attendanceSummary) {
      attendance.total += record.count;

      if (
        record._id === ATTENDANCE_STATUSES.PRESENT
      ) {
        attendance.present = record.count;
      }

      if (
        record._id === ATTENDANCE_STATUSES.ABSENT
      ) {
        attendance.absent = record.count;
      }

      if (
        record._id === ATTENDANCE_STATUSES.LATE
      ) {
        attendance.late = record.count;
      }
    }

    const normalizedBatches = batches.map((batch) => ({
      id: String(batch._id),
      name: batch.name,
      code: batch.code,
      academicYear: batch.academicYear,
    }));

    const normalizedSections = sections.map((section) => ({
      id: String(section._id),
      name: section.name,
      code: section.code,

      batch: section.batch
        ? {
            id: normalizeId(section.batch),
            name: section.batch.name,
            code: section.batch.code,
            academicYear: section.batch.academicYear,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,

      message: 'Mentor dashboard retrieved successfully.',

      data: {
        mentor: {
          id: String(mentor._id),
          institutionalId: mentor.institutionalId,
          fullName: mentor.fullName,
          email: mentor.email ?? null,
          role: mentor.role,
          roles: mentor.roles ?? [],
        },

        department: {
          id: String(department._id),
          name: department.name,
          code: department.code,
        },

        assignments: {
          batches: normalizedBatches,
          sections: normalizedSections,
        },

        summary: {
          assignedBatches: batches.length,
          assignedSections: sections.length,
          assignedStudents: studentCount,
          attendance,
        },

        recentStudents: recentStudents.map(
          normalizeStudent,
        ),

        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
}