import mongoose from 'mongoose';

import { Quiz } from '../models/quiz.model.js';
import {
  QuizAttempt,
  QUIZ_ATTEMPT_STATUSES,
} from '../models/quiz-attempt.model.js';

function createControllerError(message, code, statusCode = 400) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function getAuthenticatedStudentId(req) {
  const studentId = req.user?._id ?? req.user?.id;

  if (!studentId) {
    throw createControllerError(
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
      401,
    );
  }

  return studentId;
}

function serializeAttempt(attempt) {
  return {
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
}

async function getOwnedAttempt(attemptId, studentId) {
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

  return attempt;
}

async function requireActiveAttempt(attempt) {
  if (attempt.status !== QUIZ_ATTEMPT_STATUSES.IN_PROGRESS) {
    throw createControllerError(
      'This quiz attempt is no longer active.',
      'QUIZ_ATTEMPT_NOT_ACTIVE',
      409,
    );
  }

  if (new Date() >= attempt.expiresAt) {
    attempt.status = QUIZ_ATTEMPT_STATUSES.EXPIRED;
    await attempt.save();

    throw createControllerError(
      'The quiz attempt has expired.',
      'QUIZ_ATTEMPT_EXPIRED',
      409,
    );
  }
}

/**
 * PATCH /api/v1/quizzes/attempts/:attemptId/answers
 *
 * Saves or updates one answer in the authenticated student's attempt.
 *
 * Request body:
 * {
 *   "questionId": "...",
 *   "selectedOptionIndex": 0
 * }
 *
 * Set selectedOptionIndex to null to clear an answer.
 */
export async function saveStudentQuizAnswerController(req, res, next) {
  try {
    const studentId = getAuthenticatedStudentId(req);
    const { attemptId } = req.params;
    const { questionId, selectedOptionIndex } = req.body ?? {};

    if (!mongoose.isValidObjectId(questionId)) {
      throw createControllerError(
        'The question ID is invalid.',
        'INVALID_QUESTION_ID',
        400,
      );
    }

    if (
      selectedOptionIndex !== null &&
      (
        !Number.isInteger(selectedOptionIndex) ||
        selectedOptionIndex < 0
      )
    ) {
      throw createControllerError(
        'The selected option index must be a non-negative integer or null.',
        'INVALID_SELECTED_OPTION',
        400,
      );
    }

    const attempt = await getOwnedAttempt(attemptId, studentId);

    await requireActiveAttempt(attempt);

    const quiz = await Quiz.findById(attempt.quiz).exec();

    if (!quiz) {
      throw createControllerError(
        'The quiz associated with this attempt no longer exists.',
        'QUIZ_NOT_FOUND',
        404,
      );
    }

    const question = quiz.questions.find(
      (item) => item._id.toString() === questionId,
    );

    if (!question) {
      throw createControllerError(
        'The question does not belong to this quiz.',
        'QUESTION_NOT_IN_QUIZ',
        400,
      );
    }

    if (
      selectedOptionIndex !== null &&
      selectedOptionIndex >= question.options.length
    ) {
      throw createControllerError(
        'The selected option does not exist for this question.',
        'INVALID_SELECTED_OPTION',
        400,
      );
    }

    const answer = attempt.answers.find(
      (item) => item.questionId.toString() === questionId,
    );

    if (!answer) {
      throw createControllerError(
        'The question is not part of this attempt.',
        'QUESTION_NOT_IN_ATTEMPT',
        400,
      );
    }

    answer.selectedOptionIndex = selectedOptionIndex;
    answer.answeredAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      data: serializeAttempt(attempt),
      message: 'Answer saved successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/quizzes/attempts/:attemptId/submit
 *
 * Submits an attempt and calculates the score on the server.
 * Correct answers are never accepted from the client.
 */
export async function submitStudentQuizAttemptController(req, res, next) {
  try {
    const studentId = getAuthenticatedStudentId(req);
    const { attemptId } = req.params;

    const attempt = await getOwnedAttempt(attemptId, studentId);

    if (attempt.status === QUIZ_ATTEMPT_STATUSES.SUBMITTED) {
      return res.status(200).json({
        success: true,
        data: serializeAttempt(attempt),
        message: 'This quiz attempt has already been submitted.',
      });
    }

    await requireActiveAttempt(attempt);

    const quiz = await Quiz.findById(attempt.quiz).exec();

    if (!quiz) {
      throw createControllerError(
        'The quiz associated with this attempt no longer exists.',
        'QUIZ_NOT_FOUND',
        404,
      );
    }

    let score = 0;

    for (const question of quiz.questions) {
      const answer = attempt.answers.find(
        (item) => item.questionId.toString() === question._id.toString(),
      );

      if (
        answer &&
        answer.selectedOptionIndex !== null &&
        answer.selectedOptionIndex === question.correctOptionIndex
      ) {
        score += question.marks;
      }
    }

    attempt.score = score;
    attempt.status = QUIZ_ATTEMPT_STATUSES.SUBMITTED;
    attempt.submittedAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      data: serializeAttempt(attempt),
      message: 'Quiz submitted successfully.',
    });
  } catch (error) {
    return next(error);
  }
}