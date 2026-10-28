import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function getStudentSelfProfileController(
  req,
  res,
  next,
) {
  try {
    const userId = req.user?.id;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      throw createError(
        401,
        'UNAUTHORIZED',
        'A valid authenticated account is required.',
      );
    }

    const student = await User.findOne({
      _id: userId,
      role: USER_ROLES.STUDENT,
    })
      .select(
        'institutionalId fullName email role status isAccountActivated isEmailVerified emailVerifiedAt department assignedBatches assignedSections createdAt updatedAt',
      )
      .populate({
        path: 'department',
        select: 'name code',
      })
      .populate({
        path: 'assignedBatches',
        select: 'name code academicYear status',
      })
      .populate({
        path: 'assignedSections',
        select: 'name code status batch',
        populate: {
          path: 'batch',
          select: 'name code academicYear',
        },
      })
      .lean();

    if (!student) {
      throw createError(
        404,
        'STUDENT_NOT_FOUND',
        'The student account could not be found.',
      );
    }

    if (student.status !== ACCOUNT_STATUSES.ACTIVE) {
      throw createError(
        403,
        'STUDENT_ACCOUNT_INACTIVE',
        'Your student account is not active.',
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Student profile retrieved successfully.',
      data: {
        profile: {
          id: student._id.toString(),
          institutionalId: student.institutionalId,
          fullName: student.fullName,
          email: student.email ?? null,
          role: student.role,
          status: student.status,
          isAccountActivated: student.isAccountActivated,
          isEmailVerified: student.isEmailVerified,
          emailVerifiedAt: student.emailVerifiedAt ?? null,
          department: student.department
            ? {
                id: student.department._id.toString(),
                name: student.department.name,
                code: student.department.code,
              }
            : null,
          batches: (student.assignedBatches || []).map((batch) => ({
            id: batch._id.toString(),
            name: batch.name,
            code: batch.code,
            academicYear: batch.academicYear,
            status: batch.status,
          })),
          sections: (student.assignedSections || []).map((section) => ({
            id: section._id.toString(),
            name: section.name,
            code: section.code,
            status: section.status,
            batch: section.batch
              ? {
                  id: section.batch._id.toString(),
                  name: section.batch.name,
                  code: section.batch.code,
                  academicYear: section.batch.academicYear,
                }
              : null,
          })),
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}