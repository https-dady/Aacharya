import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Section } from '../models/section.model.js';
import { Batch } from '../models/batch.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeId(value) {
  return value ? String(value._id ?? value) : null;
}

function normalizeStudent(student, sectionMap, batchMap) {
  const assignedSections = (student.assignedSections ?? [])
    .map(normalizeId)
    .filter((id) => sectionMap.has(id));

  const assignedBatches = (student.assignedBatches ?? [])
    .map(normalizeId)
    .filter((id) => batchMap.has(id));

  return {
    id: String(student._id),
    institutionalId: student.institutionalId,
    fullName: student.fullName,
    email: student.email ?? null,
    status: student.status,
    isAccountActivated: Boolean(student.isAccountActivated),
    isEmailVerified: Boolean(student.isEmailVerified),

    sections: assignedSections.map((id) => {
      const section = sectionMap.get(id);

      return {
        id: section.id,
        name: section.name,
        code: section.code,
        batch: section.batchId
          ? batchMap.get(section.batchId) ?? null
          : null,
      };
    }),

    batches: assignedBatches
      .map((id) => batchMap.get(id))
      .filter(Boolean),

    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}

export async function getMentorAssignedStudentsController(
  req,
  res,
  next,
) {
  try {
    const mentorId = req.user?.id;

    if (!mongoose.isValidObjectId(mentorId)) {
      throw createError(
        401,
        'UNAUTHORIZED',
        'A valid authenticated account is required.',
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
      .select('_id department status')
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
        409,
        'DEPARTMENT_NOT_ASSIGNED',
        'Your account is not assigned to a department.',
      );
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = String(req.query.search ?? '').trim();
    const status = req.query.status;

    const sections = await Section.find({
      department: mentor.department,
      mentor: mentor._id,
      status: 'ACTIVE',
    })
      .select('_id name code batch')
      .sort({ name: 1 })
      .lean()
      .exec();

    const sectionIds = sections.map((section) => section._id);

    const sectionMap = new Map(
      sections.map((section) => [
        String(section._id),
        {
          id: String(section._id),
          name: section.name,
          code: section.code,
          batchId: normalizeId(section.batch),
        },
      ]),
    );

    if (sectionIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No students are currently assigned to this mentor.',
        data: {
          students: [],
          sections: [],
          summary: {
            total: 0,
            active: 0,
            suspended: 0,
            disabled: 0,
          },
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });
    }

    const studentFilter = {
      role: USER_ROLES.STUDENT,
      department: mentor.department,
      assignedSections: { $in: sectionIds },
    };

    if (status) {
      studentFilter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');

      studentFilter.$or = [
        { fullName: searchRegex },
        { institutionalId: searchRegex },
        { email: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [students, total, statusCounts, batches] = await Promise.all([
      User.find(studentFilter)
        .select(
          [
            'institutionalId',
            'fullName',
            'email',
            'status',
            'isAccountActivated',
            'isEmailVerified',
            'assignedSections',
            'assignedBatches',
            'createdAt',
            'updatedAt',
          ].join(' '),
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      User.countDocuments(studentFilter),

      User.aggregate([
        {
          $match: {
            role: USER_ROLES.STUDENT,
            department: mentor.department,
            assignedSections: { $in: sectionIds },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      Batch.find({
        _id: {
          $in: sections
            .map((section) => section.batch)
            .filter(Boolean),
        },
        department: mentor.department,
      })
        .select('_id name code academicYear')
        .lean()
        .exec(),
    ]);

    const batchMap = new Map(
      batches.map((batch) => [
        String(batch._id),
        {
          id: String(batch._id),
          name: batch.name,
          code: batch.code,
          academicYear: batch.academicYear,
        },
      ]),
    );

    const summary = {
      total: 0,
      active: 0,
      suspended: 0,
      disabled: 0,
    };

    for (const record of statusCounts) {
      summary.total += record.count;

      if (record._id === ACCOUNT_STATUSES.ACTIVE) {
        summary.active = record.count;
      } else if (record._id === ACCOUNT_STATUSES.SUSPENDED) {
        summary.suspended = record.count;
      } else if (record._id === ACCOUNT_STATUSES.DISABLED) {
        summary.disabled = record.count;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Assigned students retrieved successfully.',
      data: {
        students: students.map((student) =>
          normalizeStudent(student, sectionMap, batchMap),
        ),

        sections: sections.map((section) => ({
          id: String(section._id),
          name: section.name,
          code: section.code,
          batch: batchMap.get(normalizeId(section.batch)) ?? null,
        })),

        summary,

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}