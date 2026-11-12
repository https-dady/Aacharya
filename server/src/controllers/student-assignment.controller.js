import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import {
  Course,
  COURSE_STATUSES,
} from '../models/course.model.js';

import {
  Assignment,
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_CONTENT_TYPES,
} from '../models/assignment.model.js';

function createControllerError(
  message,
  code,
  statusCode = 400,
) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter(Boolean)
    .map((value) => String(value._id ?? value));
}

function hasIntersection(first, second) {
  if (first.length === 0 || second.length === 0) {
    return false;
  }

  const allowedIds = new Set(second);

  return first.some((id) => allowedIds.has(id));
}

/**
 * Course allocation is the primary source of truth.
 *
 * If a course has batch restrictions, the student must match
 * at least one of those batches.
 *
 * If a course has section restrictions, the student must match
 * at least one of those sections.
 *
 * When both restrictions exist, both must be satisfied.
 */
function studentMatchesCourseAllocation(student, course) {
  const studentBatches = normalizeIds(student.assignedBatches);
  const studentSections = normalizeIds(student.assignedSections);

  const courseBatches = normalizeIds(course.batches);
  const courseSections = normalizeIds(course.sections);

  if (
    courseBatches.length > 0
    && !hasIntersection(studentBatches, courseBatches)
  ) {
    return false;
  }

  if (
    courseSections.length > 0
    && !hasIntersection(studentSections, courseSections)
  ) {
    return false;
  }

  return true;
}

/**
 * Assignment-specific restrictions can narrow access further,
 * but cannot override the course's allocation.
 *
 * An empty assignment batch/section list means that the assignment
 * adds no restriction for that dimension; course allocation still
 * applies.
 */
function studentMatchesAssignmentTarget(student, assignment) {
  const studentBatches = normalizeIds(student.assignedBatches);
  const studentSections = normalizeIds(student.assignedSections);

  const assignmentBatches = normalizeIds(assignment.batches);
  const assignmentSections = normalizeIds(assignment.sections);

  if (
    assignmentBatches.length > 0
    && !hasIntersection(studentBatches, assignmentBatches)
  ) {
    return false;
  }

  if (
    assignmentSections.length > 0
    && !hasIntersection(studentSections, assignmentSections)
  ) {
    return false;
  }

  return true;
}

function studentCanAccessAssignment(student, assignment) {
  const course = assignment.course;

  if (!course || !student.department) {
    return false;
  }

  if (
    String(assignment.department) !== String(student.department)
    || String(course.department) !== String(student.department)
  ) {
    return false;
  }

  if (course.status !== COURSE_STATUSES.ACTIVE) {
    return false;
  }

  if (!studentMatchesCourseAllocation(student, course)) {
    return false;
  }

  if (!studentMatchesAssignmentTarget(student, assignment)) {
    return false;
  }

  return true;
}

function normalizeAssignment(assignment) {
  const course = assignment.course;

  return {
    id: String(assignment._id),

    title: assignment.title,

    contentType:
      assignment.contentType
      || ASSIGNMENT_CONTENT_TYPES.ASSIGNMENT,

    description: assignment.description,

    course: {
      id: String(course._id),
      title: course.title,
      code: course.code,
    },

    courseName: course.title || '',
    courseCode: course.code || '',

    dueDate: assignment.dueDate,
    totalMarks: assignment.totalMarks,

    attachments: (assignment.attachments || []).map(
      (attachment) => ({
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType || '',
        size: attachment.size ?? 0,
      }),
    ),

    status: assignment.status.toLowerCase(),

    isOverdue: (
      assignment.dueDate
      && new Date(assignment.dueDate) < new Date()
    ),

    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

/**
 * GET /api/v1/assignments/me
 *
 * Returns published assignments and practicals accessible to the
 * authenticated student based on department, course, batch and
 * section allocations.
 */
export async function listMyAssignmentsController(req, res, next) {
  try {
    const authenticatedUserId = req.user?._id ?? req.user?.id;

    if (!mongoose.isValidObjectId(authenticatedUserId)) {
      throw createControllerError(
        'Authentication is required.',
        'AUTHENTICATION_REQUIRED',
        401,
      );
    }

    const student = await User.findOne({
      _id: authenticatedUserId,
      role: USER_ROLES.STUDENT,
      status: ACCOUNT_STATUSES.ACTIVE,
    })
      .select(
        '_id department assignedBatches assignedSections status',
      )
      .lean()
      .exec();

    if (!student) {
      throw createControllerError(
        'The active student account could not be found.',
        'STUDENT_NOT_FOUND',
        404,
      );
    }

    if (!student.department) {
      return res.status(200).json({
        success: true,
        data: {
          assignments: [],
          total: 0,
        },
      });
    }

    const assignments = await Assignment.find({
      department: student.department,
      status: ASSIGNMENT_STATUSES.PUBLISHED,
    })
      .populate({
        path: 'course',
        model: Course,
        select: [
          'title',
          'code',
          'department',
          'batches',
          'sections',
          'status',
        ].join(' '),
      })
      .sort({
        dueDate: 1,
        createdAt: -1,
        _id: 1,
      })
      .lean()
      .exec();

    const visibleAssignments = assignments
      .filter((assignment) => (
        studentCanAccessAssignment(student, assignment)
      ))
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