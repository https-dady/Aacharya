import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';
import { Batch } from '../models/batch.model.js';
import {
  Section,
} from '../models/section.model.js';

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
      'Only an active HOD can manage sections.',
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

function normalizeSection(section, batch, department) {
  return {
    id: section._id.toString(),
    name: section.name,
    code: section.code,
    status: section.status,

    batch: {
      id: batch._id.toString(),
      name: batch.name,
      code: batch.code,
      academicYear: batch.academicYear,
    },

    department: {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
    },

    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

export async function createSectionController(req, res, next) {
  try {
    const { hod, department } = await getActiveHodDepartment(
      req.user?.id,
    );

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

export async function listSectionsController(req, res, next) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

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
    }).select('_id name code academicYear department status');

    if (!batch) {
      return next(
        createError(
          404,
          'BATCH_NOT_FOUND',
          'No batch was found in your department.',
        ),
      );
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = String(req.query.search ?? '').trim();

    const filter = {
      batch: batch._id,
      department: department._id,
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (search) {
      const searchRegex = new RegExp(
        escapeRegex(search),
        'i',
      );

      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [sections, total] = await Promise.all([
      Section.find(filter)
        .select(
          'name code status batch department createdAt updatedAt',
        )
        .sort({
          code: 1,
          _id: 1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Section.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Sections retrieved successfully.',

      data: {
        sections: sections.map(
          (section) => normalizeSection(
            section,
            batch,
            department,
          ),
        ),

        batch: {
          id: batch.id,
          name: batch.name,
          code: batch.code,
          academicYear: batch.academicYear,
          status: batch.status,
        },

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