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

/**
 * List HOD accounts for the Super Admin directory.
 *
 * Returns actual HOD user records and their associated department
 * information. Password hashes and authentication secrets are not
 * included in the selected fields.
 */
export async function listHodsController(req, res, next) {
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
          'Only an active Super Admin can view HOD accounts.',
        ),
      );
    }

    const hods = await User.find({
      role: USER_ROLES.HOD,
    })
      .select(
        [
          'institutionalId',
          'fullName',
          'email',
          'role',
          'status',
          'department',
          'isEmailVerified',
          'createdAt',
          'updatedAt',
        ].join(' '),
      )
      .populate({
        path: 'department',
        select: 'name code status',
      })
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .lean()
      .exec();

    const records = hods.map((hod) => ({
      id: String(hod._id),
      institutionalId: hod.institutionalId,
      fullName: hod.fullName,
      email: hod.email || '',
      role: hod.role,
      status: hod.status,
      department: hod.department
        ? {
            id: String(hod.department._id),
            name: hod.department.name,
            code: hod.department.code,
            status: hod.department.status,
          }
        : null,
      isEmailVerified: hod.isEmailVerified,
      createdAt: hod.createdAt,
      updatedAt: hod.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      message: 'HOD accounts retrieved successfully.',
      data: {
        hods: records,
        total: records.length,
      },
    });
  } catch (error) {
    return next(error);
  }
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

    // Assign the HOD only if the department remains active and
    // has not already received an HOD assignment.
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
      await User.deleteOne({
        _id: hod._id,
      }).exec();

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
    // Attempt cleanup if account creation succeeded but the
    // department assignment failed unexpectedly.
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
export async function getHodDetailsController(req, res, next) {
  try {
    const currentUser = await User.findById(req.user?.id)
      .select('role status')
      .exec();

    if (
      !currentUser ||
      currentUser.status !== ACCOUNT_STATUSES.ACTIVE ||
      currentUser.role !== USER_ROLES.SUPER_ADMIN
    ) {
      return next(
        createError(
          currentUser ? 403 : 401,
          currentUser ? 'FORBIDDEN' : 'UNAUTHORIZED',
          'Only an active Super Admin can view HOD account details.',
        ),
      );
    }

    const { hodId } = req.params;

    if (!mongoose.isValidObjectId(hodId)) {
      return next(
        createError(
          400,
          'INVALID_HOD_ID',
          'A valid HOD account ID is required.',
        ),
      );
    }

    const hod = await User.findOne({
      _id: hodId,
      role: USER_ROLES.HOD,
    })
      .select(
        [
          'institutionalId',
          'fullName',
          'email',
          'role',
          'status',
          'department',
          'isEmailVerified',
          'createdAt',
          'updatedAt',
        ].join(' '),
      )
      .populate({
        path: 'department',
        select: 'name code status',
      })
      .lean()
      .exec();

    if (!hod) {
      return next(
        createError(
          404,
          'HOD_NOT_FOUND',
          'The requested HOD account was not found.',
        ),
      );
    }

    return res.status(200).json({
      success: true,
      message: 'HOD account details retrieved successfully.',
      data: {
        hod: {
          id: String(hod._id),
          institutionalId: hod.institutionalId,
          fullName: hod.fullName,
          email: hod.email || '',
          role: hod.role,
          status: hod.status,
          department: hod.department
            ? {
                id: String(hod.department._id),
                name: hod.department.name,
                code: hod.department.code,
                status: hod.department.status,
              }
            : null,
          isEmailVerified: hod.isEmailVerified,
          createdAt: hod.createdAt,
          updatedAt: hod.updatedAt,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}