import { Router } from 'express';
import { z } from 'zod';

import {
  startStudentQuizAttemptController,
  getStudentQuizAttemptController,
} from '../controllers/student-quiz-attempt.controller.js';

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

/**
 * Start or resume a student's quiz attempt.
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
 * Retrieve an attempt owned by the authenticated student.
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