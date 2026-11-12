import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeFaculty(faculty, department) {
  return {
    id: faculty._id.toString(),
    institutionalId: faculty.institutionalId,
    fullName: faculty.fullName,
    email: faculty.email ?? null,
    role: faculty.role,
    status: faculty.status,

    department: {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
    },

    assignedBatches: (faculty.assignedBatches || []).map(
      (id) => id.toString(),
    ),

    assignedSections: (faculty.assignedSections || []).map(
      (id) => id.toString(),
    ),

    isEmailVerified: faculty.isEmailVerified,
    lastLoginAt: faculty.lastLoginAt ?? null,
    createdAt: faculty.createdAt,
    updatedAt: faculty.updatedAt,
  };
}

async function getActiveHodDepartment(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createError(
      401,
      'UNAUTHORIZED',
      'A valid authenticated account is required.',
    );
  }

  const hod = await User.findById(userId)
    .select('_id role status department')
    .lean()
    .exec();

  if (!hod) {
    throw createError(
      401,
      'ACCOUNT_NOT_FOUND',
      'The authenticated account was not found.',
    );
  }

  if (
    hod.role !== USER_ROLES.HOD
    || hod.status !== ACCOUNT_STATUSES.ACTIVE
  ) {
    throw createError(
      403,
      'FORBIDDEN',
      'Only an active HOD can manage faculty accounts.',
    );
  }

  if (!hod.department) {
    throw createError(
      409,
      'DEPARTMENT_NOT_ASSIGNED',
      'The HOD is not assigned to a department.',
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
    throw createError(
      409,
      'DEPARTMENT_ASSIGNMENT_INVALID',
      'The HOD does not have a valid active department assignment.',
    );
  }

  return department;
}

export async function updateFacultyStatusController(
  req,
  res,
  next,
) {
  try {
    const department = await getActiveHodDepartment(
      req.user?.id,
    );

    const { facultyId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(facultyId)) {
      throw createError(
        400,
        'INVALID_FACULTY_ID',
        'A valid faculty account ID is required.',
      );
    }

    if (!Object.values(ACCOUNT_STATUSES).includes(status)) {
      throw createError(
        422,
        'INVALID_ACCOUNT_STATUS',
        'The requested account status is invalid.',
      );
    }

    const facultyFilter = {
      _id: facultyId,
      department: department._id,
      role: {
        $in: [
          USER_ROLES.FACULTY,
          USER_ROLES.MENTOR,
        ],
      },
    };

    const existingFaculty = await User.findOne(facultyFilter)
      .select('_id status')
      .lean()
      .exec();

    if (!existingFaculty) {
      throw createError(
        404,
        'FACULTY_NOT_FOUND',
        'The requested faculty account was not found in your department.',
      );
    }

    if (existingFaculty.status === status) {
      const unchangedFaculty = await User.findOne(facultyFilter)
        .select(
          [
            'institutionalId',
            'fullName',
            'email',
            'role',
            'status',
            'assignedBatches',
            'assignedSections',
            'isEmailVerified',
            'lastLoginAt',
            'createdAt',
            'updatedAt',
          ].join(' '),
        )
        .lean()
        .exec();

      return res.status(200).json({
        success: true,
        message: 'Faculty account already has the requested status.',
        data: {
          faculty: normalizeFaculty(
            unchangedFaculty,
            department,
          ),
        },
      });
    }

    /*
     * Atomic status update.
     *
     * Incrementing tokenVersion invalidates existing access
     * and refresh tokens without requiring individual session
     * deletion operations.
     *
     * The status condition protects against concurrent updates
     * based on a stale account state.
     */

    const updatedFaculty = await User.findOneAndUpdate(
      {
        ...facultyFilter,
        status: existingFaculty.status,
      },
      {
        $set: {
          status,
        },
        $inc: {
          tokenVersion: 1,
        },
      },
      {
        new: true,
        runValidators: true,
        projection: [
          'institutionalId',
          'fullName',
          'email',
          'role',
          'status',
          'assignedBatches',
          'assignedSections',
          'isEmailVerified',
          'lastLoginAt',
          'createdAt',
          'updatedAt',
        ].join(' '),
      },
    )
      .lean()
      .exec();

    if (!updatedFaculty) {
      throw createError(
        409,
        'FACULTY_STATUS_CONFLICT',
        'The faculty account changed during this operation. Refresh and try again.',
      );
    }

    const messages = {
      ACTIVE: 'Faculty account activated successfully. Previous sessions have been revoked.',
      SUSPENDED: 'Faculty account suspended successfully. Previous sessions have been revoked.',
      DISABLED: 'Faculty account disabled successfully. Previous sessions have been revoked.',
    };

    return res.status(200).json({
      success: true,
      message: messages[status],
      data: {
        faculty: normalizeFaculty(
          updatedFaculty,
          department,
        ),
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      error.statusCode = 422;
      error.code = 'VALIDATION_ERROR';
    }

    return next(error);
  }
}