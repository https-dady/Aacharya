import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';

import { hashPassword } from '../services/auth/password.service.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

export async function createHodController(req, res, next) {
  try {
    // Only an active Super Admin can provision HOD accounts.
    const currentUser = await User.findById(req.user?.id)
      .select('role status');

    if (
      !currentUser
      || currentUser.status !== ACCOUNT_STATUSES.ACTIVE
      || currentUser.role !== USER_ROLES.SUPER_ADMIN
    ) {
      return next(
        createError(
          currentUser ? 403 : 401,
          currentUser ? 'FORBIDDEN' : 'UNAUTHORIZED',
          'Only an active Super Admin can create HOD accounts.',
        ),
      );
    }

    const { departmentId } = req.params;

    if (!mongoose.isValidObjectId(departmentId)) {
      return next(
        createError(
          400,
          'INVALID_DEPARTMENT_ID',
          'A valid department ID is required.',
        ),
      );
    }

    const department = await Department.findById(departmentId);

    if (!department) {
      return next(
        createError(
          404,
          'DEPARTMENT_NOT_FOUND',
          'The requested department was not found.',
        ),
      );
    }

    if (department.status !== 'ACTIVE') {
      return next(
        createError(
          409,
          'DEPARTMENT_INACTIVE',
          'An HOD cannot be assigned to an inactive department.',
        ),
      );
    }

    if (department.hod) {
      return next(
        createError(
          409,
          'HOD_ALREADY_ASSIGNED',
          'This department already has an assigned HOD.',
        ),
      );
    }

    const {
      institutionalId,
      fullName,
      email,
      password,
    } = req.body;

    const normalizedInstitutionalId =
      institutionalId.trim().toUpperCase();

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [
        { institutionalId: normalizedInstitutionalId },
        { email: normalizedEmail },
      ],
    }).select('_id institutionalId email');

    if (existingUser) {
      const duplicateField =
        existingUser.institutionalId === normalizedInstitutionalId
          ? 'institutional ID'
          : 'email';

      return next(
        createError(
          409,
          'ACCOUNT_ALREADY_EXISTS',
          `An account with this ${duplicateField} already exists.`,
        ),
      );
    }

    const passwordHash = await hashPassword(password);

    const hod = await User.create({
      institutionalId: normalizedInstitutionalId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: USER_ROLES.HOD,
      status: ACCOUNT_STATUSES.ACTIVE,
      department: department._id,
      createdBy: currentUser._id,
      isEmailVerified: false,
    });

    try {
      department.hod = hod._id;
      await department.save();
    } catch (error) {
      // Avoid leaving an unassigned HOD account if department linking fails.
      await User.deleteOne({ _id: hod._id });
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'HOD account created and assigned successfully.',
      data: {
        user: {
          id: hod.id,
          institutionalId: hod.institutionalId,
          fullName: hod.fullName,
          email: hod.email,
          role: hod.role,
          status: hod.status,
          department: department.id,
          isEmailVerified: hod.isEmailVerified,
          createdAt: hod.createdAt,
        },
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      error.statusCode = 409;
      error.code = 'ACCOUNT_ALREADY_EXISTS';
      error.message =
        'An account with this institutional ID or email already exists.';
    }

    return next(error);
  }
}