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
  Quiz,
  QUIZ_STATUSES,
} from '../models/quiz.model.js';

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
      'Authentication is required.',
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

/**
 * Course allocation is the source of truth.
 *
 * If a course restricts batches or sections, the student must
 * satisfy each configured restriction.
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
 * The quiz can impose additional restrictions within its course.
 * Both batch and section restrictions must pass when configured.
 */
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
  if (!quiz.course || !student.department) {
    return false;
  }

  if (
    String(quiz.department) !== String(student.department)
    || String(quiz.course.department) !== String(student.department)
  ) {
    return false;
  }

  if (quiz.course.status !== COURSE_STATUSES.ACTIVE) {
    return false;
  }

  return (
    studentMatchesCourseAllocation(student, quiz.course)
    && studentMatchesQuizAssignment(student, quiz)
  );
}

function serializeQuestion(question) {
  return {
    id: question._id.toString(),
    questionText: question.question,
    options: question.options.map((option, index) => ({
      label: String.fromCharCode(65 + index),
      text: option,
    })),
    marks: question.marks,
  };
}

function serializeAttempt(
  attempt,
  quiz,
  includeQuestions = false,
) {
  const result = {
    id: attempt._id.toString(),
    quizId: attempt.quiz.toString(),
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    totalMarks: attempt.totalMarks,
    score: attempt.score,
    answers: attempt.answers.map((answer) => ({
      questionId: answer.questionId.toString(),
      selectedOptionIndex: answer.selectedOptionIndex,
      answeredAt: answer.answeredAt,
    })),
  };

  if (includeQuestions && quiz) {
    result.quiz = {
      title: quiz.title,
      description: quiz.description,
      durationMinutes: quiz.durationMinutes,
      totalMarks: quiz.totalMarks,
    };

    // Never send correctOptionIndex to the student.
    result.questions = quiz.questions.map(serializeQuestion);
  }

  return result;
}

function isWithinQuizWindow(quiz, now) {
  const startsAt = quiz.startAt
    ? new Date(quiz.startAt).getTime()
    : null;

  const endsAt = quiz.endAt
    ? new Date(quiz.endAt).getTime()
    : null;

  if (startsAt !== null && now < startsAt) {
    return {
      allowed: false,
      message: 'This quiz is not available yet.',
      code: 'QUIZ_NOT_STARTED',
    };
  }

  if (endsAt !== null && now >= endsAt) {
    return {
      allowed: false,
      message: 'The quiz availability window has ended.',
      code: 'QUIZ_WINDOW_CLOSED',
    };
  }

  return { allowed: true };
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

async function getAccessiblePublishedQuiz(student, quizId) {
  const quiz = await Quiz.findOne({
    _id: quizId,
    status: QUIZ_STATUSES.PUBLISHED,
  })
    .populate({
      path: 'course',
      model: Course,
      select: 'title code semester department batches sections status',
    })
    .exec();

  if (!quiz) {
    throw createControllerError(
      'The quiz was not found or is not published.',
      'QUIZ_NOT_AVAILABLE',
      404,
    );
  }

  if (!studentCanAccessQuiz(student, quiz)) {
    throw createControllerError(
      'You do not have access to this quiz.',
      'QUIZ_ACCESS_DENIED',
      403,
    );
  }

  return quiz;
}

/**
 * POST /api/v1/quizzes/:quizId/attempts
 *
 * Starts a quiz attempt or resumes the student's existing
 * in-progress attempt for the same quiz.
 */
export async function startStudentQuizAttemptController(
  req,
  res,
  next,
) {
  try {
    const studentId = getAuthenticatedUserId(req);
    const { quizId } = req.params;

    if (!mongoose.isValidObjectId(quizId)) {
      throw createControllerError(
        'The quiz ID is invalid.',
        'INVALID_QUIZ_ID',
        400,
      );
    }

    const student = await getActiveStudent(studentId);

    const quiz = await getAccessiblePublishedQuiz(
      student,
      quizId,
    );

    if (
      !Array.isArray(quiz.questions)
      || quiz.questions.length === 0
    ) {
      throw createControllerError(
        'This quiz does not contain any questions.',
        'QUIZ_HAS_NO_QUESTIONS',
        409,
      );
    }

    const now = new Date();

    const windowCheck = isWithinQuizWindow(quiz, now);

    if (!windowCheck.allowed) {
      throw createControllerError(
        windowCheck.message,
        windowCheck.code,
        409,
      );
    }

    const existingAttempt = await QuizAttempt.findOne({
      quiz: quiz._id,
      student: student._id,
      status: QUIZ_ATTEMPT_STATUSES.IN_PROGRESS,
    }).exec();

    if (existingAttempt) {
      if (now >= existingAttempt.expiresAt) {
        existingAttempt.status = QUIZ_ATTEMPT_STATUSES.EXPIRED;
        await existingAttempt.save();

        throw createControllerError(
          'Your previous attempt has expired.',
          'QUIZ_ATTEMPT_EXPIRED',
          409,
        );
      }

      return res.status(200).json({
        success: true,
        data: serializeAttempt(existingAttempt, quiz, true),
        message: 'Resumed your existing quiz attempt.',
      });
    }

    const durationMinutes = Number(quiz.durationMinutes);

    if (
      !Number.isFinite(durationMinutes)
      || durationMinutes <= 0
    ) {
      throw createControllerError(
        'The quiz duration is not configured correctly.',
        'INVALID_QUIZ_DURATION',
        409,
      );
    }

    const attemptExpiry = new Date(
      now.getTime() + durationMinutes * 60 * 1000,
    );

    const quizWindowEnd = quiz.endAt
      ? new Date(quiz.endAt)
      : null;

    const expiresAt = (
      quizWindowEnd
      && quizWindowEnd < attemptExpiry
    )
      ? quizWindowEnd
      : attemptExpiry;

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: student._id,
      status: QUIZ_ATTEMPT_STATUSES.IN_PROGRESS,
      startedAt: now,
      expiresAt,
      totalMarks: quiz.totalMarks,
      answers: quiz.questions.map((question) => ({
        questionId: question._id,
        selectedOptionIndex: null,
        answeredAt: null,
      })),
    });

    return res.status(201).json({
      success: true,
      data: serializeAttempt(attempt, quiz, true),
      message: 'Quiz attempt started successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/quizzes/attempts/:attemptId
 *
 * Retrieves an attempt belonging to the authenticated student.
 */
export async function getStudentQuizAttemptController(
  req,
  res,
  next,
) {
  try {
    const studentId = getAuthenticatedUserId(req);
    const { attemptId } = req.params;

    if (!mongoose.isValidObjectId(attemptId)) {
      throw createControllerError(
        'The attempt ID is invalid.',
        'INVALID_ATTEMPT_ID',
        400,
      );
    }

    const student = await getActiveStudent(studentId);

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: student._id,
    }).exec();

    if (!attempt) {
      throw createControllerError(
        'The quiz attempt was not found.',
        'QUIZ_ATTEMPT_NOT_FOUND',
        404,
      );
    }

    const quiz = await Quiz.findById(attempt.quiz)
      .populate({
        path: 'course',
        model: Course,
        select: 'title code semester department batches sections status',
      })
      .exec();

    if (!quiz) {
      throw createControllerError(
        'The quiz associated with this attempt no longer exists.',
        'QUIZ_NOT_FOUND',
        404,
      );
    }

    // Re-check authorization on every attempt read.
    // This also blocks suspended students and students whose
    // course/batch/section access has since been revoked.
    if (!studentCanAccessQuiz(student, quiz)) {
      throw createControllerError(
        'You no longer have access to this quiz.',
        'QUIZ_ACCESS_DENIED',
        403,
      );
    }

    const now = new Date();

    if (
      attempt.status === QUIZ_ATTEMPT_STATUSES.IN_PROGRESS
      && now >= attempt.expiresAt
    ) {
      attempt.status = QUIZ_ATTEMPT_STATUSES.EXPIRED;
      await attempt.save();
    }

    return res.status(200).json({
      success: true,
      data: serializeAttempt(
        attempt,
        quiz,
        attempt.status === QUIZ_ATTEMPT_STATUSES.IN_PROGRESS,
      ),
    });
  } catch (error) {
    return next(error);
  }
}