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

export async function assignMentorController(req, res, next) {
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
          'Only an active HOD can assign mentors.',
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

    const { facultyId } = req.params;
    const { batchIds, sectionIds } = req.body;

    if (!mongoose.isValidObjectId(facultyId)) {
      return next(
        createError(
          400,
          'INVALID_FACULTY_ID',
          'A valid faculty ID is required.',
        ),
      );
    }

    const uniqueBatchIds = [...new Set(batchIds)];
    const uniqueSectionIds = [...new Set(sectionIds)];

    if (
      uniqueBatchIds.some((id) => !mongoose.isValidObjectId(id))
      || uniqueSectionIds.some((id) => !mongoose.isValidObjectId(id))
    ) {
      return next(
        createError(
          400,
          'INVALID_ASSIGNMENT_ID',
          'All batch and section IDs must be valid.',
        ),
      );
    }

    const faculty = await User.findOne({
      _id: facultyId,
      department: department._id,
      role: {
        $in: [USER_ROLES.FACULTY, USER_ROLES.MENTOR],
      },
      status: ACCOUNT_STATUSES.ACTIVE,
    }).select(
      'institutionalId fullName email role status department assignedBatches assignedSections',
    );

    if (!faculty) {
      return next(
        createError(
          404,
          'FACULTY_NOT_FOUND',
          'No active Faculty member was found in your department.',
        ),
      );
    }

    const batches = await Batch.find({
      _id: { $in: uniqueBatchIds },
      department: department._id,
      status: 'ACTIVE',
    }).select('_id name code academicYear');

    if (batches.length !== uniqueBatchIds.length) {
      return next(
        createError(
          422,
          'INVALID_BATCH_ASSIGNMENT',
          'Every assigned batch must be active and belong to your department.',
        ),
      );
    }

    const sections = await Section.find({
      _id: { $in: uniqueSectionIds },
      department: department._id,
      batch: { $in: uniqueBatchIds },
      status: 'ACTIVE',
    }).select('_id name code batch');

    if (sections.length !== uniqueSectionIds.length) {
      return next(
        createError(
          422,
          'INVALID_SECTION_ASSIGNMENT',
          'Every assigned section must be active, belong to your department, and belong to an assigned batch.',
        ),
      );
    }

    faculty.role = USER_ROLES.MENTOR;
    faculty.assignedBatches = batches.map((batch) => batch._id);
    faculty.assignedSections = sections.map((section) => section._id);

    await faculty.save();

    return res.status(200).json({
      success: true,
      message: 'Mentor role and assignments updated successfully.',
      data: {
        mentor: {
          id: faculty.id,
          institutionalId: faculty.institutionalId,
          fullName: faculty.fullName,
          email: faculty.email,
          role: faculty.role,
          status: faculty.status,
          department: {
            id: department.id,
            name: department.name,
            code: department.code,
          },
          assignedBatches: batches.map((batch) => ({
            id: batch.id,
            name: batch.name,
            code: batch.code,
            academicYear: batch.academicYear,
          })),
          assignedSections: sections.map((section) => ({
            id: section.id,
            name: section.name,
            code: section.code,
            batch: section.batch.toString(),
          })),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}