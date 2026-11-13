import { Router } from 'express';
import { z } from 'zod';

import {
  listFacultyQuizResultsController,
} from '../controllers/faculty-quiz-results.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

import { USER_ROLES } from '../models/user.model.js';

const facultyQuizResultsRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const listFacultyQuizResultsSchema = z.object({
  params: z.object({}).strict(),

  query: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional(),

    quizId: objectIdSchema.optional(),

    search: z.string().trim().max(100).optional(),
  }).strict(),

  body: z.object({}).strict(),
});

/**
 * List submitted quiz attempts for the authenticated Faculty or Mentor.
 *
 * GET /api/v1/quiz-results/faculty
 *
 * Access:
 * - Authenticated Faculty or Mentor.
 */
facultyQuizResultsRouter.get(
  '/faculty',
  authenticate,
  authorize(USER_ROLES.FACULTY, USER_ROLES.MENTOR),
  authRateLimiter,
  validate(listFacultyQuizResultsSchema),
  listFacultyQuizResultsController,
);

export default facultyQuizResultsRouter;