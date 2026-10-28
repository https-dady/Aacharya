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
  let createdHodId = null;

  try {
    const currentUser = await User.findById(req.user?.id)
      .select('role status')
      .exec();

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

    const department = await Department.findById(departmentId).exec();

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
    })
      .select('_id institutionalId email')
      .exec();

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

    createdHodId = hod._id;

    // Atomically assign the HOD only if the department is still
    // active and does not already have an assigned HOD.
    const assignedDepartment = await Department.findOneAndUpdate(
      {
        _id: department._id,
        status: 'ACTIVE',
        hod: null,
      },
      {
        $set: {
          hod: hod._id,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).exec();

    if (!assignedDepartment) {
      await User.deleteOne({ _id: hod._id }).exec();
      createdHodId = null;

      const latestDepartment = await Department.findById(
        department._id,
      )
        .select('status hod')
        .lean()
        .exec();

      if (!latestDepartment) {
        return next(
          createError(
            404,
            'DEPARTMENT_NOT_FOUND',
            'The requested department was not found.',
          ),
        );
      }

      if (latestDepartment.status !== 'ACTIVE') {
        return next(
          createError(
            409,
            'DEPARTMENT_INACTIVE',
            'An HOD cannot be assigned to an inactive department.',
          ),
        );
      }

      return next(
        createError(
          409,
          'HOD_ALREADY_ASSIGNED',
          'This department already has an assigned HOD.',
        ),
      );
    }

    createdHodId = null;

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
          department: assignedDepartment.id,
          isEmailVerified: hod.isEmailVerified,
          createdAt: hod.createdAt,
        },
      },
    });
  } catch (error) {
    // Compensating cleanup if account creation succeeded but
    // the department assignment failed unexpectedly.
    if (createdHodId) {
      try {
        await User.deleteOne({
          _id: createdHodId,
        }).exec();
      } catch (cleanupError) {
        error.cleanupError = cleanupError;
      }
    }

    if (error?.code === 11000) {
      error.statusCode = 409;
      error.code = 'ACCOUNT_ALREADY_EXISTS';
      error.message =
        'An account with this institutional ID or email already exists.';
    }

    return next(error);
  }
}