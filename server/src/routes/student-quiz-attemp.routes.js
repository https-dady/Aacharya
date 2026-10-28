import { Router } from 'express';
import { z } from 'zod';

import {
  startStudentQuizAttemptController,
  getStudentQuizAttemptController,
} from '../controllers/student-quiz-attempt.controller.js';

import {
  saveStudentQuizAnswerController,
  submitStudentQuizAttemptController,
} from '../controllers/student-quiz-answer.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const studentQuizAttemptRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid ID is required.');

const startAttemptSchema = z.object({
  params: z.object({
    quizId: objectIdSchema,
  }).strict(),
});

const getAttemptSchema = z.object({
  params: z.object({
    attemptId: objectIdSchema,
  }).strict(),
});

const saveAnswerSchema = z.object({
  params: z.object({
    attemptId: objectIdSchema,
  }).strict(),

  body: z.object({
    questionId: objectIdSchema,

    selectedOptionIndex: z
      .number()
      .int()
      .nonnegative()
      .nullable(),
  }).strict(),
});

const submitAttemptSchema = z.object({
  params: z.object({
    attemptId: objectIdSchema,
  }).strict(),
});

/**
 * Start or resume a quiz attempt.
 *
 * POST /api/v1/quizzes/:quizId/attempts
 */
studentQuizAttemptRouter.post(
  '/:quizId/attempts',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  validate(startAttemptSchema),
  startStudentQuizAttemptController,
);

/**
 * Save or update an answer.
 *
 * PATCH /api/v1/quizzes/attempts/:attemptId/answers
 */
studentQuizAttemptRouter.patch(
  '/attempts/:attemptId/answers',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  validate(saveAnswerSchema),
  saveStudentQuizAnswerController,
);

/**
 * Submit a quiz attempt.
 *
 * POST /api/v1/quizzes/attempts/:attemptId/submit
 */
studentQuizAttemptRouter.post(
  '/attempts/:attemptId/submit',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  validate(submitAttemptSchema),
  submitStudentQuizAttemptController,
);

/**
 * Retrieve an existing attempt.
 *
 * GET /api/v1/quizzes/attempts/:attemptId
 */
studentQuizAttemptRouter.get(
  '/attempts/:attemptId',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  validate(getAttemptSchema),
  getStudentQuizAttemptController,
);

export default studentQuizAttemptRouter;