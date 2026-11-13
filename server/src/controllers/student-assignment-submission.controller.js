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
} from '../models/assignment.model.js';

import {
  AssignmentSubmission,
  SUBMISSION_STATUSES,
} from '../models/assignment-submission.model.js';

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

  const studentBatches = normalizeIds(student.assignedBatches);
  const studentSections = normalizeIds(student.assignedSections);

  const courseBatches = normalizeIds(course.batches);
  const courseSections = normalizeIds(course.sections);

  const assignmentBatches = normalizeIds(assignment.batches);
  const assignmentSections = normalizeIds(assignment.sections);

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

async function getActiveStudent(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw createControllerError(
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
      401,
    );
  }

  const student = await User.findOne({
    _id: userId,
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

  return student;
}

async function getAccessibleAssignment(student, assignmentId) {
  if (!mongoose.isValidObjectId(assignmentId)) {
    throw createControllerError(
      'A valid assignment ID is required.',
      'INVALID_ASSIGNMENT_ID',
      400,
    );
  }

  const assignment = await Assignment.findOne({
    _id: assignmentId,
    department: student.department,
    status: {
      $in: [
        ASSIGNMENT_STATUSES.PUBLISHED,
        ASSIGNMENT_STATUSES.CLOSED,
      ],
    },
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
    .lean()
    .exec();

  if (!assignment || !studentCanAccessAssignment(student, assignment)) {
    throw createControllerError(
      'The assignment was not found or is not available to you.',
      'ASSIGNMENT_NOT_AVAILABLE',
      404,
    );
  }

  return assignment;
}

function normalizeSubmission(submission) {
  return {
    id: String(submission._id),
    assignment: String(submission.assignment),
    student: String(submission.student),
    course: String(submission.course),
    department: String(submission.department),
    responseText: submission.responseText,
    attachments: (submission.attachments || []).map(
      (attachment) => ({
        id: String(attachment._id),
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType || '',
        size: attachment.size ?? 0,
      }),
    ),
    submittedAt: submission.submittedAt,
    status: submission.status,
    marksObtained: submission.marksObtained,
    feedback: submission.feedback,
    evaluatedAt: submission.evaluatedAt,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

/**
 * GET /api/v1/assignments/:assignmentId/my-submission
 *
 * Retrieve the authenticated student's submission for an assignment.
 */
export async function getMyAssignmentSubmissionController(
  req,
  res,
  next,
) {
  try {
    const student = await getActiveStudent(
      req.user?._id ?? req.user?.id,
    );

    const assignment = await getAccessibleAssignment(
      student,
      req.params.assignmentId,
    );

    const submission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: student._id,
    })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: 'Assignment submission retrieved successfully.',
      data: {
        submission: submission
          ? normalizeSubmission(submission)
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/assignments/:assignmentId/submit
 *
 * Create or update the authenticated student's assignment submission.
 *
 * The student identity is always derived from the access token.
 */
export async function submitAssignmentController(
  req,
  res,
  next,
) {
  try {
    const student = await getActiveStudent(
      req.user?._id ?? req.user?.id,
    );

    const assignment = await getAccessibleAssignment(
      student,
      req.params.assignmentId,
    );

    if (assignment.status === ASSIGNMENT_STATUSES.CLOSED) {
      throw createControllerError(
        'This assignment is closed and no longer accepts submissions.',
        'ASSIGNMENT_CLOSED',
        409,
      );
    }

    const responseText = String(
      req.body.responseText ?? '',
    ).trim();

    if (responseText.length > 20000) {
      throw createControllerError(
        'Submission response cannot exceed 20000 characters.',
        'SUBMISSION_RESPONSE_TOO_LONG',
        400,
      );
    }

    const attachments = req.body.attachments ?? [];

    if (!Array.isArray(attachments)) {
      throw createControllerError(
        'Attachments must be provided as an array.',
        'INVALID_ATTACHMENTS',
        400,
      );
    }

    if (attachments.length > 10) {
      throw createControllerError(
        'A submission can contain at most 10 attachments.',
        'ATTACHMENT_LIMIT_EXCEEDED',
        400,
      );
    }

    if (!responseText && attachments.length === 0) {
      throw createControllerError(
        'Add a written response or at least one attachment.',
        'EMPTY_SUBMISSION',
        400,
      );
    }

    const normalizedAttachments = attachments.map(
      (attachment) => ({
        name: String(attachment.name ?? '').trim(),
        url: String(attachment.url ?? '').trim(),
        mimeType: String(attachment.mimeType ?? '').trim(),
        size: Number(attachment.size ?? 0),
        publicId: attachment.publicId || undefined,
        resourceType: attachment.resourceType || undefined,
      }),
    );

    for (const attachment of normalizedAttachments) {
      if (
        !attachment.name
        || attachment.name.length > 255
        || !/^https?:\/\//i.test(attachment.url)
        || attachment.url.length > 2048
        || !Number.isFinite(attachment.size)
        || attachment.size < 0
      ) {
        throw createControllerError(
          'One or more attachment details are invalid.',
          'INVALID_ATTACHMENT',
          400,
        );
      }
    }

    const submittedAt = new Date();

    const isLate = (
      assignment.dueDate
      && submittedAt.getTime()
        > new Date(assignment.dueDate).getTime()
    );

    const submission = await AssignmentSubmission.findOneAndUpdate(
      {
        assignment: assignment._id,
        student: student._id,
      },
      {
        $set: {
          course: assignment.course._id,
          department: student.department,
          responseText,
          attachments: normalizedAttachments,
          submittedAt,
          status: isLate
            ? SUBMISSION_STATUSES.LATE
            : SUBMISSION_STATUSES.SUBMITTED,
        },

        $setOnInsert: {
          assignment: assignment._id,
          student: student._id,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    )
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: isLate
        ? 'Assignment submitted successfully as a late submission.'
        : 'Assignment submitted successfully.',
      data: {
        submission: normalizeSubmission(submission),
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return next(
        createControllerError(
          'A submission for this assignment already exists. Please retry.',
          'SUBMISSION_CONFLICT',
          409,
        ),
      );
    }

    return next(error);
  }
}