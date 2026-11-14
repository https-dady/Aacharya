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
  return value ? String(value._id ?? value) : null;
}

export async function getMentorStudentDetailsController(
  req,
  res,
  next,
) {
  try {
    const mentorId = req.user?.id;
    const { studentId } = req.params;

    if (
      !mongoose.isValidObjectId(mentorId)
      || !mongoose.isValidObjectId(studentId)
    ) {
      throw createError(
        400,
        'INVALID_REFERENCE',
        'A valid mentor and student reference are required.',
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
        'Your account is not assigned to a department.',
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

    // Canonical ownership: only sections assigned through Section.mentor.
    const ownedSections = await Section.find({
      department: department._id,
      mentor: mentor._id,
      status: 'ACTIVE',
    })
      .select('_id name code batch')
      .lean()
      .exec();

    const ownedSectionIds = ownedSections.map(
      (section) => section._id,
    );

    if (ownedSectionIds.length === 0) {
      throw createError(
        404,
        'STUDENT_NOT_FOUND',
        'The requested student is not available in your assigned sections.',
      );
    }

    // A student must belong to at least one canonically owned section.
    const student = await User.findOne({
      _id: studentId,
      role: USER_ROLES.STUDENT,
      department: department._id,
      assignedSections: {
        $in: ownedSectionIds,
      },
    })
      .select(
        [
          'institutionalId',
          'fullName',
          'email',
          'role',
          'status',
          'isAccountActivated',
          'isEmailVerified',
          'emailVerifiedAt',
          'department',
          'assignedBatches',
          'assignedSections',
          'createdAt',
          'updatedAt',
        ].join(' '),
      )
      .lean()
      .exec();

    if (!student) {
      throw createError(
        404,
        'STUDENT_NOT_FOUND',
        'The requested student is not available in your assigned sections.',
      );
    }

    const ownedSectionMap = new Map(
      ownedSections.map((section) => [
        String(section._id),
        section,
      ]),
    );

    const studentSectionIds = (
      student.assignedSections ?? []
    )
      .map(normalizeId)
      .filter((id) => ownedSectionMap.has(id));

    const studentSections = studentSectionIds.map(
      (id) => ownedSectionMap.get(id),
    );

    const studentBatchIds = [
      ...new Set(
        studentSections
          .map((section) => normalizeId(section.batch))
          .filter(Boolean),
      ),
    ];

    const [batches, attendanceRecords] = await Promise.all([
      studentBatchIds.length
        ? Batch.find({
            _id: { $in: studentBatchIds },
            department: department._id,
          })
            .select('_id name code academicYear status')
            .lean()
            .exec()
        : [],

      Attendance.aggregate([
        {
          $match: {
            student: student._id,
            section: {
              $in: studentSectionIds.map(
                (id) => new mongoose.Types.ObjectId(id),
              ),
            },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const batchMap = new Map(
      batches.map((batch) => [
        String(batch._id),
        batch,
      ]),
    );

    const attendance = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      percentage: 0,
    };

    for (const record of attendanceRecords) {
      attendance.total += record.count;

      if (record._id === ATTENDANCE_STATUSES.PRESENT) {
        attendance.present = record.count;
      } else if (record._id === ATTENDANCE_STATUSES.ABSENT) {
        attendance.absent = record.count;
      } else if (record._id === ATTENDANCE_STATUSES.LATE) {
        attendance.late = record.count;
      }
    }

    if (attendance.total > 0) {
      attendance.percentage = Number(
        (
          (attendance.present / attendance.total) * 100
        ).toFixed(2),
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Student details retrieved successfully.',
      data: {
        student: {
          id: String(student._id),
          institutionalId: student.institutionalId,
          fullName: student.fullName,
          email: student.email ?? null,
          role: student.role,
          status: student.status,
          isAccountActivated: student.isAccountActivated,
          isEmailVerified: student.isEmailVerified,
          emailVerifiedAt: student.emailVerifiedAt ?? null,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },

        department: {
          id: String(department._id),
          name: department.name,
          code: department.code,
        },

        sections: studentSections.map((section) => ({
          id: String(section._id),
          name: section.name,
          code: section.code,
          batch: batchMap.has(normalizeId(section.batch))
            ? {
                id: String(batchMap.get(
                  normalizeId(section.batch),
                )._id),
                name: batchMap.get(
                  normalizeId(section.batch),
                ).name,
                code: batchMap.get(
                  normalizeId(section.batch),
                ).code,
                academicYear: batchMap.get(
                  normalizeId(section.batch),
                ).academicYear,
              }
            : null,
        })),

        attendance,

        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
}