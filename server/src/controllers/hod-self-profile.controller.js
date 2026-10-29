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

function normalizeHodProfile(hod, department) {
  return {
    id: String(hod._id),
    institutionalId: hod.institutionalId,
    fullName: hod.fullName,
    email: hod.email ?? null,
    role: hod.role,
    status: hod.status,
    isEmailVerified: hod.isEmailVerified,
    emailVerifiedAt: hod.emailVerifiedAt ?? null,
    department: department
      ? {
          id: String(department._id),
          name: department.name,
          code: department.code,
          status: department.status,
        }
      : null,
    createdAt: hod.createdAt,
    updatedAt: hod.updatedAt,
  };
}

async function getAuthenticatedHod(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createError(
      401,
      'UNAUTHORIZED',
      'A valid authenticated account is required.',
    );
  }

  const hod = await User.findOne({
    _id: userId,
    role: USER_ROLES.HOD,
  })
    .select(
      [
        'institutionalId',
        'fullName',
        'email',
        'role',
        'status',
        'isEmailVerified',
        'emailVerifiedAt',
        'department',
        'createdAt',
        'updatedAt',
      ].join(' '),
    )
    .exec();

  if (!hod) {
    throw createError(
      404,
      'HOD_NOT_FOUND',
      'The authenticated HOD account could not be found.',
    );
  }

  if (hod.status !== ACCOUNT_STATUSES.ACTIVE) {
    throw createError(
      403,
      'HOD_ACCOUNT_INACTIVE',
      'Your HOD account is not active.',
    );
  }

  if (!hod.department) {
    throw createError(
      409,
      'HOD_DEPARTMENT_NOT_ASSIGNED',
      'Your account is not assigned to a department.',
    );
  }

  const department = await Department.findOne({
    _id: hod.department,
    hod: hod._id,
  })
    .select('name code status')
    .lean()
    .exec();

  if (!department) {
    throw createError(
      409,
      'HOD_DEPARTMENT_MISMATCH',
      'Your department assignment could not be verified.',
    );
  }

  return {
    hod,
    department,
  };
}

/**
 * GET /api/v1/hod-profile/me
 *
 * Retrieves the authenticated HOD's own profile.
 */
export async function getHodSelfProfileController(req, res, next) {
  try {
    const { hod, department } = await getAuthenticatedHod(
      req.user?.id,
    );

    return res.status(200).json({
      success: true,
      message: 'HOD profile retrieved successfully.',
      data: {
        profile: normalizeHodProfile(hod, department),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/v1/hod-profile/me
 *
 * Allows an authenticated HOD to update only their own full name
 * and email address.
 *
 * Institutional ID, role, department, account status and account
 * creation date are not editable through this endpoint.
 */
export async function updateHodSelfProfileController(req, res, next) {
  try {
    const { hod } = await getAuthenticatedHod(req.user?.id);

    const allowedFields = ['fullName', 'email'];

    const submittedFields = Object.keys(req.body ?? {});

    const unsupportedFields = submittedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (unsupportedFields.length > 0) {
      throw createError(
        400,
        'PROFILE_FIELD_NOT_EDITABLE',
        'Only fullName and email can be updated through the HOD profile.',
      );
    }

    if (submittedFields.length === 0) {
      throw createError(
        400,
        'EMPTY_PROFILE_UPDATE',
        'Provide a full name or email address to update.',
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

      if (hod.fullName !== fullName) {
        hod.fullName = fullName;
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

      if ((hod.email ?? '') !== email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: hod._id },
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

        hod.email = email;

        // Changing the email invalidates the previous verification.
        hod.isEmailVerified = false;
        hod.emailVerifiedAt = null;

        profileChanged = true;
        emailChanged = true;
      }
    }

    if (!profileChanged) {
      const { department } = await getAuthenticatedHod(
        hod._id.toString(),
      );

      return res.status(200).json({
        success: true,
        message: 'No profile changes were necessary.',
        data: {
          profile: normalizeHodProfile(hod, department),
        },
      });
    }

    try {
      await hod.save();
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

    const { department } = await getAuthenticatedHod(
      hod._id.toString(),
    );

    return res.status(200).json({
      success: true,
      message: emailChanged
        ? 'HOD profile updated. Verify your new email address where required.'
        : 'HOD profile updated successfully.',
      data: {
        profile: normalizeHodProfile(hod, department),
      },
    });
  } catch (error) {
    return next(error);
  }
}