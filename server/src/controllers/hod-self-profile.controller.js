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

function normalizeUserRoles(user) {
  const roles = new Set(
    Array.isArray(user.roles) ? user.roles : [],
  );

  if (user.role) {
    roles.add(user.role);
  }

  return [...roles];
}

function normalizeFacultyProfile(faculty, department) {
  return {
    id: String(faculty._id),

    institutionalId: faculty.institutionalId,

    fullName: faculty.fullName,

    email: faculty.email ?? null,

    role: faculty.role,

    roles: normalizeUserRoles(faculty),

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

    $or: [
      {
        role: {
          $in: [
            USER_ROLES.FACULTY,
            USER_ROLES.MENTOR,
          ],
        },
      },
      {
        roles: {
          $in: [
            USER_ROLES.FACULTY,
            USER_ROLES.MENTOR,
          ],
        },
      },
    ],
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
      'FACULTY_OR_MENTOR_NOT_FOUND',
      'The authenticated Faculty or Mentor account could not be found.',
    );
  }

  if (faculty.status !== ACCOUNT_STATUSES.ACTIVE) {
    throw createError(
      403,
      'ACCOUNT_INACTIVE',
      'Your account is not active.',
    );
  }

  const userRoles = normalizeUserRoles(faculty);

  const hasFacultyAccess = userRoles.some(
    (role) => [
      USER_ROLES.FACULTY,
      USER_ROLES.MENTOR,
    ].includes(role),
  );

  if (!hasFacultyAccess) {
    throw createError(
      403,
      'FORBIDDEN',
      'Your account does not have Faculty or Mentor access.',
    );
  }

  let department = null;

  if (faculty.department) {
    department = await Department.findById(
      faculty.department,
    )
      .select('name code status')
      .lean()
      .exec();

    if (!department) {
      throw createError(
        409,
        'DEPARTMENT_NOT_FOUND',
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
 * Retrieves the authenticated Faculty or Mentor profile.
 */
export async function getFacultySelfProfileController(
  req,
  res,
  next,
) {
  try {
    const { faculty, department } =
      await getAuthenticatedFaculty(req.user?.id);

    return res.status(200).json({
      success: true,

      message: 'Profile retrieved successfully.',

      data: {
        profile: normalizeFacultyProfile(
          faculty,
          department,
        ),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/v1/faculty-profile/me
 *
 * Allows Faculty and Mentor to update their own
 * permitted profile fields.
 */
export async function updateFacultySelfProfileController(
  req,
  res,
  next,
) {
  try {
    const { faculty } = await getAuthenticatedFaculty(
      req.user?.id,
    );

    const allowedFields = [
      'fullName',
      'email',
    ];

    const submittedFields = Object.keys(req.body ?? {});

    const unsupportedFields = submittedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (unsupportedFields.length > 0) {
      throw createError(
        400,
        'PROFILE_FIELD_NOT_EDITABLE',
        'Only fullName and email can be updated.',
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
      const fullName = req.body.fullName.trim();

      if (
        fullName.length < 2
        || fullName.length > 100
      ) {
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

          _id: {
            $ne: faculty._id,
          },
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
          profile: normalizeFacultyProfile(
            faculty,
            department,
          ),
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
        ? 'Profile updated. Verify your new email address where required.'
        : 'Profile updated successfully.',

      data: {
        profile: normalizeFacultyProfile(
          faculty,
          department,
        ),
      },
    });
  } catch (error) {
    return next(error);
  }
}