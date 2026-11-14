import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';
import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';
import {
  Attendance,
  ATTENDANCE_STATUSES,
} from '../models/attendance.model.js';

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
    assignedBatches: (student.assignedBatches ?? []).map(normalizeId),
    assignedSections: (student.assignedSections ?? []).map(normalizeId),
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
      { role: USER_ROLES.MENTOR },
      { roles: USER_ROLES.MENTOR },
    ],
  })
    .select(
      '_id institutionalId fullName email role roles status department assignedBatches',
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

  return { mentor, department };
}

/**
 * GET /api/v1/provisioning/mentor/dashboard
 *
 * Section.mentor is the canonical source of mentor-to-section
 * ownership. User.assignedSections is intentionally not used here
 * because it is a legacy denormalized assignment field.
 */
export async function getMentorDashboardController(req, res, next) {
  try {
    const { mentor, department } = await getAuthenticatedMentor(
      req.user?.id,
    );

    const sections = await Section.find({
      department: department._id,
      mentor: mentor._id,
      status: 'ACTIVE',
    })
      .select('_id name code batch')
      .sort({ name: 1 })
      .lean()
      .exec();

    const sectionIds = sections.map((section) => section._id);

    const assignedBatchIds = new Set(
      (mentor.assignedBatches ?? []).map(String),
    );

    // Include batches referenced by canonically assigned sections too.
    for (const section of sections) {
      if (section.batch) {
        assignedBatchIds.add(String(section.batch));
      }
    }

    const batchIds = [...assignedBatchIds];

    const studentFilter = {
      role: USER_ROLES.STUDENT,
      department: department._id,
      status: ACCOUNT_STATUSES.ACTIVE,
      assignedSections: { $in: sectionIds },
    };

    const [
      batches,
      studentCount,
      recentStudents,
      attendanceSummary,
    ] = await Promise.all([
      batchIds.length
        ? Batch.find({
            _id: { $in: batchIds },
            department: department._id,
            status: 'ACTIVE',
          })
            .select('_id name code academicYear')
            .sort({ name: 1 })
            .lean()
            .exec()
        : [],

      sectionIds.length
        ? User.countDocuments(studentFilter)
        : 0,

      sectionIds.length
        ? User.find(studentFilter)
            .select(
              '_id institutionalId fullName email status assignedBatches assignedSections createdAt',
            )
            .sort({ createdAt: -1, _id: -1 })
            .limit(5)
            .lean()
            .exec()
        : [],

      sectionIds.length
        ? Attendance.aggregate([
            {
              $match: {
                section: { $in: sectionIds },
              },
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
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

      if (record._id === ATTENDANCE_STATUSES.PRESENT) {
        attendance.present = record.count;
      } else if (record._id === ATTENDANCE_STATUSES.ABSENT) {
        attendance.absent = record.count;
      } else if (record._id === ATTENDANCE_STATUSES.LATE) {
        attendance.late = record.count;
      }
    }

    const normalizedBatches = batches.map((batch) => ({
      id: String(batch._id),
      name: batch.name,
      code: batch.code,
      academicYear: batch.academicYear,
    }));

    const batchById = new Map(
      normalizedBatches.map((batch) => [batch.id, batch]),
    );

    const normalizedSections = sections.map((section) => {
      const batchId = normalizeId(section.batch);
      const batch = batchId ? batchById.get(batchId) : null;

      return {
        id: String(section._id),
        name: section.name,
        code: section.code,
        batch: batch
          ? {
              id: batch.id,
              name: batch.name,
              code: batch.code,
              academicYear: batch.academicYear,
            }
          : null,
      };
    });

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
          assignedBatches: normalizedBatches.length,
          assignedSections: sections.length,
          assignedStudents: studentCount,
          attendance,
        },
        recentStudents: recentStudents.map(normalizeStudent),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
}