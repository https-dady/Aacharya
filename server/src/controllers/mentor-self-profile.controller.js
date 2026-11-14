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

function normalizeRoles(user) {
  const roles = new Set(
    Array.isArray(user.roles) ? user.roles : [],
  );

  if (user.role) {
    roles.add(user.role);
  }

  return [...roles];
}

function normalizeProfile(user, department) {
  return {
    id: String(user._id),
    institutionalId: user.institutionalId,
    fullName: user.fullName,
    email: user.email ?? null,
    role: user.role,
    roles: normalizeRoles(user),
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    department: department
      ? {
          id: String(department._id),
          name: department.name,
          code: department.code,
          status: department.status,
        }
      : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function getAuthenticatedMentor(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createError(
      401,
      'UNAUTHORIZED',
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

  if (!mentor) {
    throw createError(
      403,
      'MENTOR_ACCESS_REQUIRED',
      'An active Mentor account is required.',
    );
  }

  let department = null;

  if (mentor.department) {
    department = await Department.findById(mentor.department)
      .select('name code status')
      .lean()
      .exec();

    if (!department) {
      throw createError(
        409,
        'MENTOR_DEPARTMENT_NOT_FOUND',
        'Your assigned department could not be found.',
      );
    }
  }

  return { mentor, department };
}

export async function getMentorSelfProfileController(
  req,
  res,
  next,
) {
  try {
    const { mentor, department } = await getAuthenticatedMentor(
      req.user?.id,
    );

    return res.status(200).json({
      success: true,
      message: 'Mentor profile retrieved successfully.',
      data: {
        profile: normalizeProfile(mentor, department),
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateMentorSelfProfileController(
  req,
  res,
  next,
) {
  try {
    const { mentor } = await getAuthenticatedMentor(req.user?.id);

    const allowedFields = ['fullName', 'email'];
    const submittedFields = Object.keys(req.body ?? {});

    const unsupportedFields = submittedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (unsupportedFields.length > 0) {
      throw createError(
        400,
        'PROFILE_FIELD_NOT_EDITABLE',
        'Only full name and email can be updated.',
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

      if (mentor.fullName !== fullName) {
        mentor.fullName = fullName;
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

      if ((mentor.email ?? '') !== email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: mentor._id },
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

        mentor.email = email;
        mentor.isEmailVerified = false;
        mentor.emailVerifiedAt = null;

        profileChanged = true;
        emailChanged = true;
      }
    }

    if (profileChanged) {
      try {
        await mentor.save();
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
    }

    const { department } = await getAuthenticatedMentor(
      mentor._id.toString(),
    );

    return res.status(200).json({
      success: true,
      message: emailChanged
        ? 'Profile updated. Verify your new email address.'
        : profileChanged
          ? 'Mentor profile updated successfully.'
          : 'No profile changes were necessary.',
      data: {
        profile: normalizeProfile(mentor, department),
      },
    });
  } catch (error) {
    return next(error);
  }
}