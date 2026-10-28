import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import {
  Assignment,
  ASSIGNMENT_STATUSES,
} from '../models/assignment.model.js';

function createControllerError(message, code, statusCode = 400) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeAssignment(assignment) {
  const course = assignment.course;

  return {
    id: assignment._id.toString(),
    title: assignment.title,
    description: assignment.description,

    course: course
      ? {
          id: course._id.toString(),
          title: course.title,
          code: course.code,
        }
      : null,

    courseName: course?.title || '',
    courseCode: course?.code || '',

    dueDate: assignment.dueDate,
    totalMarks: assignment.totalMarks,

    attachments: (assignment.attachments || []).map((attachment) => ({
      name: attachment.name,
      url: attachment.url,
      mimeType: attachment.mimeType || '',
      size: attachment.size ?? 0,
    })),

    status: assignment.status.toLowerCase(),

    isOverdue: assignment.dueDate < new Date(),

    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

/**
 * GET /api/v1/assignments/me
 *
 * Returns published assignments targeted to the authenticated student's
 * department, assigned batches, or assigned sections.
 */
export async function listMyAssignmentsController(req, res, next) {
  try {
    const authenticatedUserId = req.user?.id ?? req.user?._id;

    if (!mongoose.isValidObjectId(authenticatedUserId)) {
      return next(
        createControllerError(
          'Authentication is required.',
          'AUTHENTICATION_REQUIRED',
          401,
        ),
      );
    }

    const student = await User.findOne({
      _id: authenticatedUserId,
      role: USER_ROLES.STUDENT,
      status: ACCOUNT_STATUSES.ACTIVE,
    })
      .select('_id department assignedBatches assignedSections')
      .lean()
      .exec();

    if (!student) {
      return next(
        createControllerError(
          'The active student account could not be found.',
          'STUDENT_NOT_FOUND',
          404,
        ),
      );
    }

    const assignedBatches = student.assignedBatches || [];
    const assignedSections = student.assignedSections || [];

    if (
      !student.department
      || (
        assignedBatches.length === 0
        && assignedSections.length === 0
      )
    ) {
      return res.status(200).json({
        success: true,
        data: {
          assignments: [],
          total: 0,
        },
      });
    }

    const assignmentConditions = [];

    if (assignedBatches.length > 0) {
      assignmentConditions.push({
        batches: {
          $in: assignedBatches,
        },
      });
    }

    if (assignedSections.length > 0) {
      assignmentConditions.push({
        sections: {
          $in: assignedSections,
        },
      });
    }

    const assignments = await Assignment.find({
      department: student.department,
      status: ASSIGNMENT_STATUSES.PUBLISHED,
      $or: assignmentConditions,
    })
      .populate({
        path: 'course',
        match: {
          department: student.department,
          status: 'ACTIVE',
        },
        select: 'title code status department',
      })
      .sort({
        dueDate: 1,
        createdAt: -1,
        _id: 1,
      })
      .lean()
      .exec();

    const visibleAssignments = assignments
      .filter((assignment) => assignment.course)
      .map(normalizeAssignment);

    return res.status(200).json({
      success: true,
      data: {
        assignments: visibleAssignments,
        total: visibleAssignments.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}