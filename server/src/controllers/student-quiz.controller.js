import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Quiz, QUIZ_STATUSES } from '../models/quiz.model.js';

function createControllerError(message, code, statusCode = 400) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeQuiz(quiz, now) {
  const course = quiz.course;

  let status = 'upcoming';

  if (quiz.status === QUIZ_STATUSES.CLOSED || now >= quiz.endAt) {
    status = 'closed';
  } else if (now < quiz.startAt) {
    status = 'upcoming';
  } else {
    status = 'available';
  }

  return {
    id: quiz._id.toString(),
    title: quiz.title,
    description: quiz.description || '',

    courseName: course?.title || '',
    courseCode: course?.code || '',

    startAt: quiz.startAt,
    endAt: quiz.endAt,
    durationMinutes: quiz.durationMinutes,
    totalMarks: quiz.totalMarks,

    status,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  };
}

/**
 * GET /api/v1/quizzes/me
 *
 * Returns published quizzes assigned to the authenticated student's
 * department, batch, or section.
 *
 * Correct answers and question contents are intentionally excluded.
 */
export async function listMyQuizzesController(req, res, next) {
  try {
    const userId = req.user?._id ?? req.user?.id;

    if (!mongoose.isValidObjectId(userId)) {
      return next(
        createControllerError(
          'Authentication is required.',
          'AUTHENTICATION_REQUIRED',
          401,
        ),
      );
    }

    const student = await User.findOne({
      _id: userId,
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
          quizzes: [],
          total: 0,
        },
      });
    }

    const assignmentConditions = [];

    if (assignedBatches.length > 0) {
      assignmentConditions.push({
        batches: { $in: assignedBatches },
      });
    }

    if (assignedSections.length > 0) {
      assignmentConditions.push({
        sections: { $in: assignedSections },
      });
    }

    const quizzes = await Quiz.find({
      department: student.department,
      status: QUIZ_STATUSES.PUBLISHED,
      $or: assignmentConditions,
    })
      .select([
        'title',
        'description',
        'course',
        'department',
        'batches',
        'sections',
        'startAt',
        'endAt',
        'durationMinutes',
        'totalMarks',
        'status',
        'createdAt',
        'updatedAt',
      ].join(' '))
      .populate({
        path: 'course',
        match: {
          department: student.department,
          status: 'ACTIVE',
        },
        select: 'title code status department',
      })
      .sort({
        startAt: 1,
        _id: 1,
      })
      .lean()
      .exec();

    const now = new Date();

    const visibleQuizzes = quizzes
      .filter((quiz) => Boolean(quiz.course))
      .map((quiz) => normalizeQuiz(quiz, now));

    return res.status(200).json({
      success: true,
      data: {
        quizzes: visibleQuizzes,
        total: visibleQuizzes.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}