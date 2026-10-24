import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';
import { Batch } from '../models/batch.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function createBatchController(req, res, next) {
  try {
    const hod = await User.findById(req.user?.id)
      .select('role status department');

    if (
      !hod
      || hod.status !== ACCOUNT_STATUSES.ACTIVE
      || hod.role !== USER_ROLES.HOD
    ) {
      return next(
        createError(
          hod ? 403 : 401,
          hod ? 'FORBIDDEN' : 'UNAUTHORIZED',
          'Only an active HOD can create batches.',
        ),
      );
    }

    if (!hod.department) {
      return next(
        createError(
          409,
          'DEPARTMENT_NOT_ASSIGNED',
          'The HOD is not assigned to a department.',
        ),
      );
    }

    const department = await Department.findOne({
      _id: hod.department,
      hod: hod._id,
      status: 'ACTIVE',
    }).select('_id name code');

    if (!department) {
      return next(
        createError(
          409,
          'DEPARTMENT_ASSIGNMENT_INVALID',
          'The HOD does not have an active department assignment.',
        ),
      );
    }

    const { name, code, academicYear } = req.body;

    const normalizedCode = code.trim().toUpperCase();

    const existingBatch = await Batch.exists({
      department: department._id,
      code: normalizedCode,
      academicYear,
    });

    if (existingBatch) {
      return next(
        createError(
          409,
          'BATCH_ALREADY_EXISTS',
          'A batch with this code already exists for this academic year.',
        ),
      );
    }

    const batch = await Batch.create({
      name: name.trim(),
      code: normalizedCode,
      academicYear,
      department: department._id,
      createdBy: hod._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Batch created successfully.',
      data: {
        batch: {
          id: batch.id,
          name: batch.name,
          code: batch.code,
          academicYear: batch.academicYear,
          department: {
            id: department.id,
            name: department.name,
            code: department.code,
          },
          status: batch.status,
          createdAt: batch.createdAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      error.statusCode = 422;
      error.code = 'VALIDATION_ERROR';
    }

    if (error?.code === 11000) {
      error.statusCode = 409;
      error.code = 'BATCH_ALREADY_EXISTS';
      error.message =
        'A batch with this code already exists for this academic year.';
    }

    return next(error);
  }
}