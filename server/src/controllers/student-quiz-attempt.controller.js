import mongoose from 'mongoose';

import { User, USER_ROLES } from '../models/user.model.js';
import { Quiz, QUIZ_STATUSES } from '../models/quiz.model.js';
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

  if (!userId) {
    throw createControllerError(
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
      401,
    );
  }

  return userId;
}

function serializeQuestion(question) {
  return {
    id: question._id.toString(),
    questionText: question.questionText,
    options: question.options.map((option) => ({
      label: option.label,
      text: option.text,
    })),
    marks: question.marks,
  };
}

function serializeAttempt(attempt, quiz, includeQuestions = false) {
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

function studentMatchesQuiz(student, quiz) {
  if (
    quiz.department &&
    String(quiz.department) !== String(student.department)
  ) {
    return false;
  }

  const assignedBatches = (student.assignedBatches || [])
    .map(String);

  const assignedSections = (student.assignedSections || [])
    .map(String);

  if (Array.isArray(quiz.batches) && quiz.batches.length > 0) {
    const batchMatch = quiz.batches.some((batchId) =>
      assignedBatches.includes(String(batchId)),
    );

    if (!batchMatch) return false;
  }

  if (Array.isArray(quiz.sections) && quiz.sections.length > 0) {
    const sectionMatch = quiz.sections.some((sectionId) =>
      assignedSections.includes(String(sectionId)),
    );

    if (!sectionMatch) return false;
  }

  return true;
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

    const student = await User.findOne({
      _id: studentId,
      role: USER_ROLES.STUDENT,
    })
      .select('_id department assignedBatches assignedSections status')
      .lean()
      .exec();

    if (!student) {
      throw createControllerError(
        'The student account could not be found.',
        'STUDENT_NOT_FOUND',
        404,
      );
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      status: QUIZ_STATUSES.PUBLISHED,
    })
      .populate('course', 'name title code courseCode')
      .exec();

    if (!quiz) {
      throw createControllerError(
        'The quiz was not found or is not published.',
        'QUIZ_NOT_AVAILABLE',
        404,
      );
    }

    if (!studentMatchesQuiz(student, quiz)) {
      throw createControllerError(
        'You do not have access to this quiz.',
        'QUIZ_ACCESS_DENIED',
        403,
      );
    }

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
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
      !Number.isFinite(durationMinutes) ||
      durationMinutes <= 0
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

    const expiresAt =
      quizWindowEnd && quizWindowEnd < attemptExpiry
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

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: studentId,
    }).exec();

    if (!attempt) {
      throw createControllerError(
        'The quiz attempt was not found.',
        'QUIZ_ATTEMPT_NOT_FOUND',
        404,
      );
    }

    const quiz = await Quiz.findById(attempt.quiz).exec();

    if (!quiz) {
      throw createControllerError(
        'The quiz associated with this attempt no longer exists.',
        'QUIZ_NOT_FOUND',
        404,
      );
    }

    const now = new Date();

    if (
      attempt.status === QUIZ_ATTEMPT_STATUSES.IN_PROGRESS &&
      now >= attempt.expiresAt
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
}s