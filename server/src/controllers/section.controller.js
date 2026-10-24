import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';
import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function createSectionController(req, res, next) {
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
          'Only an active HOD can create sections.',
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

    const { batchId } = req.params;

    if (!mongoose.isValidObjectId(batchId)) {
      return next(
        createError(
          400,
          'INVALID_BATCH_ID',
          'A valid batch ID is required.',
        ),
      );
    }

    const batch = await Batch.findOne({
      _id: batchId,
      department: department._id,
      status: 'ACTIVE',
    }).select('_id name code academicYear department');

    if (!batch) {
      return next(
        createError(
          404,
          'BATCH_NOT_FOUND',
          'No active batch was found in your department.',
        ),
      );
    }

    const { name, code } = req.body;
    const normalizedCode = code.trim().toUpperCase();

    const existingSection = await Section.exists({
      batch: batch._id,
      code: normalizedCode,
    });

    if (existingSection) {
      return next(
        createError(
          409,
          'SECTION_ALREADY_EXISTS',
          'A section with this code already exists in this batch.',
        ),
      );
    }

    const section = await Section.create({
      name: name.trim(),
      code: normalizedCode,
      batch: batch._id,
      department: department._id,
      createdBy: hod._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Section created successfully.',
      data: {
        section: {
          id: section.id,
          name: section.name,
          code: section.code,
          batch: {
            id: batch.id,
            name: batch.name,
            code: batch.code,
            academicYear: batch.academicYear,
          },
          department: {
            id: department.id,
            name: department.name,
            code: department.code,
          },
          status: section.status,
          createdAt: section.createdAt,
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
      error.code = 'SECTION_ALREADY_EXISTS';
      error.message =
        'A section with this code already exists in this batch.';
    }

    return next(error);
  }
}