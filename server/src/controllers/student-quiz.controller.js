import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import {
  Quiz,
  QUIZ_STATUSES,
} from '../models/quiz.model.js';

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
 * Checks whether a student belongs to the quiz's assigned
 * batch and section.
 *
 * A quiz with both batch and section restrictions requires
 * the student to satisfy both restrictions.
 */
function studentMatchesQuizAssignment(student, quiz) {
  const studentBatches = normalizeIds(student.assignedBatches);
  const studentSections = normalizeIds(student.assignedSections);

  const quizBatches = normalizeIds(quiz.batches);
  const quizSections = normalizeIds(quiz.sections);

  if (quizBatches.length > 0) {
    if (!hasIntersection(studentBatches, quizBatches)) {
      return false;
    }
  }

  if (quizSections.length > 0) {
    if (!hasIntersection(studentSections, quizSections)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether the student's batch and section are included
 * in the course's existing allocation.
 *
 * The Course allocation remains the source of truth.
 * This does not introduce a separate student-course assignment model.
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

function normalizeQuiz(quiz, now) {
  const course = quiz.course;

  let status = 'upcoming';

  if (
    quiz.status === QUIZ_STATUSES.CLOSED
    || now >= new Date(quiz.endAt)
  ) {
    status = 'closed';
  } else if (now < new Date(quiz.startAt)) {
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
    semester: course?.semester || '',

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
 * Returns published quizzes only when:
 *
 * 1. The authenticated account is an active student.
 * 2. The quiz belongs to the student's department.
 * 3. The quiz's course is active and belongs to that department.
 * 4. The student's assigned batch/section matches the course allocation.
 * 5. The student's assigned batch/section satisfies every quiz restriction.
 *
 * Correct answers and question contents are never returned here.
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
      .select(
        '_id department assignedBatches assignedSections',
      )
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

    if (!student.department) {
      return res.status(200).json({
        success: true,
        data: {
          quizzes: [],
          total: 0,
        },
      });
    }

    const studentBatches = normalizeIds(
      student.assignedBatches,
    );

    const studentSections = normalizeIds(
      student.assignedSections,
    );

    if (
      studentBatches.length === 0
      && studentSections.length === 0
    ) {
      return res.status(200).json({
        success: true,
        data: {
          quizzes: [],
          total: 0,
        },
      });
    }

    const quizzes = await Quiz.find({
      department: student.department,
      status: QUIZ_STATUSES.PUBLISHED,
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
        select: [
          'title',
          'code',
          'semester',
          'department',
          'batches',
          'sections',
          'status',
        ].join(' '),
      })
      .sort({
        startAt: 1,
        _id: 1,
      })
      .lean()
      .exec();

    const now = new Date();

    const visibleQuizzes = quizzes
      .filter((quiz) => {
        // Ignore quizzes whose course is missing, inactive,
        // or outside the student's department.
        if (!quiz.course) {
          return false;
        }

        // The course itself must be allocated to the student's
        // batch and section before its quizzes can be shown.
        if (
          !studentMatchesCourseAllocation(
            student,
            quiz.course,
          )
        ) {
          return false;
        }

        // Apply quiz-specific batch and section restrictions.
        if (
          !studentMatchesQuizAssignment(
            student,
            quiz,
          )
        ) {
          return false;
        }

        return true;
      })
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