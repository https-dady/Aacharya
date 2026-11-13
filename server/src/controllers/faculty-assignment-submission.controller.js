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

function normalizeId(value) {
  if (!value) {
    return '';
  }

  return String(value._id ?? value);
}

function normalizeSubmission(submission) {
  const student = submission.student;
  const course = submission.course;
  const assignment = submission.assignment;

  return {
    id: String(submission._id),

    assignment: {
      id: normalizeId(assignment),
      title: assignment?.title ?? '',
      totalMarks: assignment?.totalMarks ?? 0,
      dueDate: assignment?.dueDate ?? null,
    },

    course: {
      id: normalizeId(course),
      title: course?.title ?? '',
      code: course?.code ?? '',
    },

    student: {
      id: normalizeId(student),
      fullName: student?.fullName ?? '',
      institutionalId: student?.institutionalId ?? '',
      email: student?.email ?? '',
    },

    responseText: submission.responseText ?? '',

    attachments: (submission.attachments ?? []).map(
      (attachment) => ({
        id: String(attachment._id),
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType ?? '',
        size: attachment.size ?? 0,
      }),
    ),

    submittedAt: submission.submittedAt,
    status: submission.status,
    marksObtained: submission.marksObtained,
    feedback: submission.feedback ?? '',
    evaluatedAt: submission.evaluatedAt,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

async function getActiveFaculty(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw createControllerError(
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
      401,
    );
  }

  const faculty = await User.findOne({
    _id: userId,
    role: USER_ROLES.FACULTY,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id department role status')
    .lean()
    .exec();

  if (!faculty) {
    throw createControllerError(
      'The active faculty account could not be found.',
      'FACULTY_NOT_FOUND',
      404,
    );
  }

  return faculty;
}

async function getAssignedCourse(faculty, courseId) {
  if (!mongoose.isValidObjectId(courseId)) {
    throw createControllerError(
      'A valid course ID is required.',
      'INVALID_COURSE_ID',
      400,
    );
  }

  const course = await Course.findOne({
    _id: courseId,
    department: faculty.department,
    faculty: faculty._id,
    status: COURSE_STATUSES.ACTIVE,
  })
    .select('_id title code department faculty batches sections status')
    .lean()
    .exec();

  if (!course) {
    throw createControllerError(
      'This course is not assigned to your faculty account.',
      'COURSE_ACCESS_DENIED',
      403,
    );
  }

  return course;
}

async function getFacultyAssignment(faculty, assignmentId) {
  if (!mongoose.isValidObjectId(assignmentId)) {
    throw createControllerError(
      'A valid assignment ID is required.',
      'INVALID_ASSIGNMENT_ID',
      400,
    );
  }

  const assignment = await Assignment.findOne({
    _id: assignmentId,
    department: faculty.department,
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
      select: '_id title code department faculty status',
    })
    .lean()
    .exec();

  if (
    !assignment
    || !assignment.course
    || normalizeId(assignment.course.faculty) !== String(faculty._id)
    || assignment.course.status !== COURSE_STATUSES.ACTIVE
  ) {
    throw createControllerError(
      'The assignment was not found or is not assigned to you.',
      'ASSIGNMENT_ACCESS_DENIED',
      404,
    );
  }

  return assignment;
}

/**
 * GET /api/v1/assignments/manage/:assignmentId/submissions
 *
 * List submissions for an assignment owned by the authenticated
 * faculty member through their assigned course.
 */
export async function listFacultyAssignmentSubmissionsController(
  req,
  res,
  next,
) {
  try {
    const faculty = await getActiveFaculty(
      req.user?._id ?? req.user?.id,
    );

    const assignment = await getFacultyAssignment(
      faculty,
      req.params.assignmentId,
    );

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const filter = {
      assignment: assignment._id,
      course: assignment.course._id,
      department: faculty.department,
    };

    if (req.query.status) {
      if (
        !Object.values(SUBMISSION_STATUSES).includes(
          req.query.status,
        )
      ) {
        throw createControllerError(
          'Invalid submission status.',
          'INVALID_SUBMISSION_STATUS',
          400,
        );
      }

      filter.status = req.query.status;
    }

    const [submissions, total] = await Promise.all([
      AssignmentSubmission.find(filter)
        .populate({
          path: 'student',
          model: User,
          select: 'fullName institutionalId email',
        })
        .populate({
          path: 'course',
          model: Course,
          select: 'title code',
        })
        .populate({
          path: 'assignment',
          model: Assignment,
          select: 'title totalMarks dueDate',
        })
        .sort({
          submittedAt: -1,
          _id: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),

      AssignmentSubmission.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Assignment submissions retrieved successfully.',
      data: {
        items: submissions.map(normalizeSubmission),

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },

        assignment: {
          id: String(assignment._id),
          title: assignment.title,
          totalMarks: assignment.totalMarks,
          dueDate: assignment.dueDate,
          status: assignment.status,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/assignments/manage/:assignmentId/submissions/:submissionId
 *
 * Retrieve one student submission.
 */
export async function getFacultyAssignmentSubmissionController(
  req,
  res,
  next,
) {
  try {
    const faculty = await getActiveFaculty(
      req.user?._id ?? req.user?.id,
    );

    const assignment = await getFacultyAssignment(
      faculty,
      req.params.assignmentId,
    );

    if (!mongoose.isValidObjectId(req.params.submissionId)) {
      throw createControllerError(
        'A valid submission ID is required.',
        'INVALID_SUBMISSION_ID',
        400,
      );
    }

    const submission = await AssignmentSubmission.findOne({
      _id: req.params.submissionId,
      assignment: assignment._id,
      course: assignment.course._id,
      department: faculty.department,
    })
      .populate({
        path: 'student',
        model: User,
        select: 'fullName institutionalId email',
      })
      .populate({
        path: 'course',
        model: Course,
        select: 'title code',
      })
      .populate({
        path: 'assignment',
        model: Assignment,
        select: 'title description totalMarks dueDate',
      })
      .populate({
        path: 'evaluatedBy',
        model: User,
        select: 'fullName institutionalId',
      })
      .lean()
      .exec();

    if (!submission) {
      throw createControllerError(
        'The requested submission was not found.',
        'SUBMISSION_NOT_FOUND',
        404,
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Submission details retrieved successfully.',
      data: {
        submission: {
          ...normalizeSubmission(submission),

          assignment: {
            ...normalizeSubmission(submission).assignment,
            description: submission.assignment?.description ?? '',
          },

          evaluatedBy: submission.evaluatedBy
            ? {
                id: normalizeId(submission.evaluatedBy),
                fullName: submission.evaluatedBy.fullName,
                institutionalId:
                  submission.evaluatedBy.institutionalId,
              }
            : null,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/v1/assignments/manage/:assignmentId/submissions/:submissionId/evaluate
 *
 * Evaluate a student submission.
 */
export async function evaluateFacultyAssignmentSubmissionController(
  req,
  res,
  next,
) {
  try {
    const faculty = await getActiveFaculty(
      req.user?._id ?? req.user?.id,
    );

    const assignment = await getFacultyAssignment(
      faculty,
      req.params.assignmentId,
    );

    if (!mongoose.isValidObjectId(req.params.submissionId)) {
      throw createControllerError(
        'A valid submission ID is required.',
        'INVALID_SUBMISSION_ID',
        400,
      );
    }

    const marksObtained = Number(req.body.marksObtained);

    const feedback = String(
      req.body.feedback ?? '',
    ).trim();

    if (
      !Number.isFinite(marksObtained)
      || marksObtained < 0
      || marksObtained > assignment.totalMarks
    ) {
      throw createControllerError(
        `Marks must be between 0 and ${assignment.totalMarks}.`,
        'INVALID_MARKS',
        400,
      );
    }

    if (feedback.length > 10000) {
      throw createControllerError(
        'Feedback cannot exceed 10000 characters.',
        'FEEDBACK_TOO_LONG',
        400,
      );
    }

    const submission = await AssignmentSubmission.findOneAndUpdate(
      {
        _id: req.params.submissionId,
        assignment: assignment._id,
        course: assignment.course._id,
        department: faculty.department,
      },
      {
        $set: {
          marksObtained,
          feedback,
          status: SUBMISSION_STATUSES.GRADED,
          evaluatedBy: faculty._id,
          evaluatedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({
        path: 'student',
        model: User,
        select: 'fullName institutionalId email',
      })
      .populate({
        path: 'course',
        model: Course,
        select: 'title code',
      })
      .populate({
        path: 'assignment',
        model: Assignment,
        select: 'title totalMarks dueDate',
      })
      .lean()
      .exec();

    if (!submission) {
      throw createControllerError(
        'The requested submission was not found.',
        'SUBMISSION_NOT_FOUND',
        404,
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Submission evaluated successfully.',
      data: {
        submission: normalizeSubmission(submission),
      },
    });
  } catch (error) {
    return next(error);
  }
}