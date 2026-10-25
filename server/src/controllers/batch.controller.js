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

async function getActiveHodDepartment(userId) {
  const hod = await User.findById(userId)
    .select('role status department');

  if (
    !hod
    || hod.status !== ACCOUNT_STATUSES.ACTIVE
    || hod.role !== USER_ROLES.HOD
  ) {
    throw createError(
      hod ? 403 : 401,
      hod ? 'FORBIDDEN' : 'UNAUTHORIZED',
      'Only an active HOD can manage batches.',
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
  }).select('_id name code');

  if (!department) {
    throw createError(
      409,
      'DEPARTMENT_ASSIGNMENT_INVALID',
      'The HOD does not have an active department assignment.',
    );
  }

  return {
    hod,
    department,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeBatch(batch, department) {
  return {
    id: batch._id.toString(),
    name: batch.name,
    code: batch.code,
    academicYear: batch.academicYear,
    status: batch.status,

    department: {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
    },

    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}

export async function createBatchController(req, res, next) {
  try {
    const { hod, department } = await getActiveHodDepartment(
      req.user?.id,
    );

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

export async function listBatchesController(req, res, next) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = String(req.query.search ?? '').trim();

    const filter = {
      department: department._id,
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    if (search) {
      const searchRegex = new RegExp(
        escapeRegex(search),
        'i',
      );

      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { academicYear: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      Batch.find(filter)
        .select(
          'name code academicYear status department createdAt updatedAt',
        )
        .sort({
          academicYear: -1,
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Batch.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Batches retrieved successfully.',

      data: {
        batches: batches.map(
          (batch) => normalizeBatch(batch, department),
        ),

        department: {
          id: department.id,
          name: department.name,
          code: department.code,
        },

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}