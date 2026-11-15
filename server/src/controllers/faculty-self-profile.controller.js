import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';

import {
  buildRoleQuery,
} from '../utils/role-access.util.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeFacultyProfile(faculty, department) {
  return {
    id: String(faculty._id),
    institutionalId: faculty.institutionalId,
    fullName: faculty.fullName,
    email: faculty.email ?? null,

    // Always preserve the actual primary role.
    role: faculty.role,

    status: faculty.status,
    isEmailVerified: faculty.isEmailVerified,
    emailVerifiedAt: faculty.emailVerifiedAt ?? null,

    department: department
      ? {
          id: String(department._id),
          name: department.name,
          code: department.code,
          status: department.status,
        }
      : null,

    createdAt: faculty.createdAt,
    updatedAt: faculty.updatedAt,
  };
}

async function getAuthenticatedFaculty(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createError(
      401,
      'UNAUTHORIZED',
      'A valid authenticated account is required.',
    );
  }

  const faculty = await User.findOne({
    _id: userId,

    // Supports Faculty, Mentor and HOD.
    // Also supports legacy HOD/Mentor accounts.
    ...buildRoleQuery(USER_ROLES.FACULTY),

    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select(
      [
        'institutionalId',
        'fullName',
        'email',
        'role',
        'roles',
        'status',
        'isEmailVerified',
        'emailVerifiedAt',
        'department',
        'createdAt',
        'updatedAt',
      ].join(' '),
    )
    .exec();

  if (!faculty) {
    throw createError(
      404,
      'FACULTY_CAPABILITY_NOT_FOUND',
      'The authenticated account does not have an active Faculty teaching capability.',
    );
  }

  if (faculty.status !== ACCOUNT_STATUSES.ACTIVE) {
    throw createError(
      403,
      'FACULTY_ACCOUNT_INACTIVE',
      'Your teaching account is not active.',
    );
  }

  let department = null;

  if (faculty.department) {
    department = await Department.findById(faculty.department)
      .select('name code status')
      .lean()
      .exec();

    if (!department) {
      throw createError(
        409,
        'FACULTY_DEPARTMENT_NOT_FOUND',
        'Your assigned department could not be found.',
      );
    }
  }

  return {
    faculty,
    department,
  };
}

/**
 * GET /api/v1/faculty-profile/me
 *
 * Shared teaching profile.
 */
export async function getFacultySelfProfileController(req, res, next) {
  try {
    const { faculty, department } = await getAuthenticatedFaculty(
      req.user?.id,
    );

    return res.status(200).json({
      success: true,
      message: 'Teaching profile retrieved successfully.',
      data: {
        profile: normalizeFacultyProfile(faculty, department),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/v1/faculty-profile/me
 *
 * Updates permitted profile fields on the authenticated account.
 */
export async function updateFacultySelfProfileController(req, res, next) {
  try {
    const { faculty } = await getAuthenticatedFaculty(req.user?.id);

    const allowedFields = ['fullName', 'email'];

    const submittedFields = Object.keys(req.body ?? {});

    const unsupportedFields = submittedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (unsupportedFields.length > 0) {
      throw createError(
        400,
        'PROFILE_FIELD_NOT_EDITABLE',
        'Only fullName and email can be updated through the teaching profile.',
      );
    }

    if (submittedFields.length === 0) {
      throw createError(
        400,
        'EMPTY_PROFILE_UPDATE',
        'Provide at least one profile field to update.',
      );
    }

    let profileChanged = false;
    let emailChanged = false;

    if (Object.hasOwn(req.body, 'fullName')) {
      if (typeof req.body.fullName !== 'string') {
        throw createError(
          400,
          'INVALID_FULL_NAME',
          'Full name must be a string.',
        );
      }

      const fullName = req.body.fullName.trim();

      if (fullName.length < 2 || fullName.length > 100) {
        throw createError(
          400,
          'INVALID_FULL_NAME',
          'Full name must contain between 2 and 100 characters.',
        );
      }

      if (faculty.fullName !== fullName) {
        faculty.fullName = fullName;
        profileChanged = true;
      }
    }

    if (Object.hasOwn(req.body, 'email')) {
      if (typeof req.body.email !== 'string') {
        throw createError(
          400,
          'INVALID_EMAIL',
          'Email address must be a string.',
        );
      }

      const email = req.body.email.trim().toLowerCase();

      if (
        email.length > 254
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        throw createError(
          400,
          'INVALID_EMAIL',
          'Provide a valid email address.',
        );
      }

      if ((faculty.email ?? '') !== email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: faculty._id },
        })
          .select('_id')
          .lean()
          .exec();

        if (existingUser) {
          throw createError(
            409,
            'EMAIL_ALREADY_IN_USE',
            'This email address is already associated with another account.',
          );
        }

        faculty.email = email;
        faculty.isEmailVerified = false;
        faculty.emailVerifiedAt = null;

        profileChanged = true;
        emailChanged = true;
      }
    }

    if (!profileChanged) {
      const { department } = await getAuthenticatedFaculty(
        faculty._id.toString(),
      );

      return res.status(200).json({
        success: true,
        message: 'No profile changes were necessary.',
        data: {
          profile: normalizeFacultyProfile(faculty, department),
        },
      });
    }

    try {
      await faculty.save();
    } catch (error) {
      if (error?.code === 11000) {
        throw createError(
          409,
          'EMAIL_ALREADY_IN_USE',
          'This email address is already associated with another account.',
        );
      }

      throw error;
    }

    const { department } = await getAuthenticatedFaculty(
      faculty._id.toString(),
    );

    return res.status(200).json({
      success: true,
      message: emailChanged
        ? 'Teaching profile updated. Verify your new email address where required.'
        : 'Teaching profile updated successfully.',
      data: {
        profile: normalizeFacultyProfile(faculty, department),
      },
    });
  } catch (error) {
    return next(error);
  }
}