import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';
import { hashPassword } from '../services/auth/password.service.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

export async function createStudentController(req, res, next) {
  try {
    const mentor = await User.findById(req.user?.id)
      .select('role status department assignedBatches assignedSections');

    if (
      !mentor
      || mentor.status !== ACCOUNT_STATUSES.ACTIVE
      || mentor.role !== USER_ROLES.MENTOR
    ) {
      return next(
        createError(
          mentor ? 403 : 401,
          mentor ? 'FORBIDDEN' : 'UNAUTHORIZED',
          'Only an active Mentor can create student accounts.',
        ),
      );
    }

    const { sectionId } = req.params;

    if (!mongoose.isValidObjectId(sectionId)) {
      return next(
        createError(
          400,
          'INVALID_SECTION_ID',
          'A valid section ID is required.',
        ),
      );
    }

    const section = await Section.findOne({
      _id: sectionId,
      department: mentor.department,
      status: 'ACTIVE',
    }).select('_id name code batch department');

    if (!section) {
      return next(
        createError(
          404,
          'SECTION_NOT_FOUND',
          'The requested active section was not found in your department.',
        ),
      );
    }

    const isAssignedSection = mentor.assignedSections.some(
      (assignedSectionId) => assignedSectionId.toString() === section.id,
    );

    if (!isAssignedSection) {
      return next(
        createError(
          403,
          'SECTION_NOT_ASSIGNED',
          'You can only create students in your assigned sections.',
        ),
      );
    }

    const isAssignedBatch = mentor.assignedBatches.some(
      (assignedBatchId) => assignedBatchId.toString() === section.batch.toString(),
    );

    if (!isAssignedBatch) {
      return next(
        createError(
          403,
          'BATCH_NOT_ASSIGNED',
          'The section belongs to a batch that is not assigned to you.',
        ),
      );
    }

    const batch = await Batch.findOne({
      _id: section.batch,
      department: mentor.department,
      status: 'ACTIVE',
    }).select('_id name code academicYear');

    if (!batch) {
      return next(
        createError(
          409,
          'BATCH_INACTIVE',
          'The section batch is unavailable or inactive.',
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

    const normalizedEmail = email
      ? email.trim().toLowerCase()
      : undefined;

    const duplicateConditions = [
      { institutionalId: normalizedInstitutionalId },
    ];

    if (normalizedEmail) {
      duplicateConditions.push({ email: normalizedEmail });
    }

    const existingUser = await User.findOne({
      $or: duplicateConditions,
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

    const student = await User.create({
      institutionalId: normalizedInstitutionalId,
      fullName: fullName.trim(),
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      passwordHash,
      role: USER_ROLES.STUDENT,
      status: ACCOUNT_STATUSES.ACTIVE,
      department: mentor.department,
      assignedBatches: [batch._id],
      assignedSections: [section._id],
      createdBy: mentor._id,
      isEmailVerified: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      data: {
        student: {
          id: student.id,
          institutionalId: student.institutionalId,
          fullName: student.fullName,
          email: student.email ?? null,
          role: student.role,
          status: student.status,
          department: mentor.department.toString(),
          batch: {
            id: batch.id,
            name: batch.name,
            code: batch.code,
            academicYear: batch.academicYear,
          },
          section: {
            id: section.id,
            name: section.name,
            code: section.code,
          },
          isEmailVerified: student.isEmailVerified,
          createdAt: student.createdAt,
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
      error.code = 'ACCOUNT_ALREADY_EXISTS';
      error.message =
        'An account with this institutional ID or email already exists.';
    }

    return next(error);
  }
}