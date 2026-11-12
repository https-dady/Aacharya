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
  QuizAttempt,
  QUIZ_ATTEMPT_STATUSES,
} from '../models/quiz-attempt.model.js';

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

function getAuthenticatedUserId(req) {
  const userId = req.user?._id ?? req.user?.id;

  if (!mongoose.isValidObjectId(userId)) {
    throw createControllerError(
      'A valid authenticated student account is required.',
      'AUTHENTICATION_REQUIRED',
      401,
    );
  }

  return userId;
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

function studentMatchesQuizAssignment(student, quiz) {
  const studentBatches = normalizeIds(student.assignedBatches);
  const studentSections = normalizeIds(student.assignedSections);

  const quizBatches = normalizeIds(quiz.batches);
  const quizSections = normalizeIds(quiz.sections);

  if (
    quizBatches.length > 0
    && !hasIntersection(studentBatches, quizBatches)
  ) {
    return false;
  }

  if (
    quizSections.length > 0
    && !hasIntersection(studentSections, quizSections)
  ) {
    return false;
  }

  return true;
}

function studentCanAccessQuiz(student, quiz) {
  const course = quiz?.course;

  if (!course || !student.department) {
    return false;
  }

  if (
    String(student.department) !== String(quiz.department)
    || String(student.department) !== String(course.department)
  ) {
    return false;
  }

  if (course.status !== COURSE_STATUSES.ACTIVE) {
    return false;
  }

  return (
    studentMatchesCourseAllocation(student, course)
    && studentMatchesQuizAssignment(student, quiz)
  );
}

async function getActiveStudent(studentId) {
  const student = await User.findOne({
    _id: studentId,
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

/**
 * GET /api/v1/quiz-results/me
 *
 * Returns submitted quiz results belonging to the authenticated
 * student, provided the student still has access to the quiz's
 * department, course, batch, and section.
 */
export async function listMyQuizResultsController(req, res, next) {
  try {
    const studentId = getAuthenticatedUserId(req);

    const student = await getActiveStudent(studentId);

    if (!student.department) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const attempts = await QuizAttempt.find({
      student: student._id,
      status: QUIZ_ATTEMPT_STATUSES.SUBMITTED,
      submittedAt: { $ne: null },
    })
      .select(
        'quiz student startedAt submittedAt score totalMarks status createdAt updatedAt',
      )
      .populate({
        path: 'quiz',
        select: [
          'title',
          'course',
          'department',
          'batches',
          'sections',
          'totalMarks',
          'status',
        ].join(' '),
        populate: {
          path: 'course',
          model: Course,
          select: [
            'title',
            'name',
            'code',
            'courseCode',
            'department',
            'batches',
            'sections',
            'status',
            'semester',
          ].join(' '),
        },
      })
      .sort({ submittedAt: -1 })
      .lean()
      .exec();

    const results = attempts
      .filter((attempt) => {
        if (!attempt.quiz) {
          return false;
        }

        return studentCanAccessQuiz(student, attempt.quiz);
      })
      .map((attempt) => {
        const quiz = attempt.quiz;
        const course = quiz.course;

        const obtainedMarks = (
          typeof attempt.score === 'number'
        )
          ? attempt.score
          : null;

        const totalMarks = (
          typeof attempt.totalMarks === 'number'
        )
          ? attempt.totalMarks
          : (
            typeof quiz.totalMarks === 'number'
              ? quiz.totalMarks
              : null
          );

        const percentage = (
          obtainedMarks !== null
          && totalMarks !== null
          && totalMarks > 0
        )
          ? Number(
            ((obtainedMarks / totalMarks) * 100).toFixed(2),
          )
          : null;

        return {
          id: String(attempt._id),
          attemptId: String(attempt._id),
          quizId: String(quiz._id),

          title: quiz.title || 'Quiz',

          courseName:
            course.title
            || course.name
            || 'Course unavailable',

          courseCode:
            course.code
            || course.courseCode
            || '',

          semester: course.semester || '',

          obtainedMarks,
          totalMarks,
          percentage,

          status: 'published',

          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
        };
      });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    return next(error);
  }
}