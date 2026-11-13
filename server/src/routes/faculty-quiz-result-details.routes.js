import { Router } from 'express';
import { z } from 'zod';

import {
  getFacultyQuizResultDetailsController,
} from '../controllers/faculty-quiz-result-details.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

import { USER_ROLES } from '../models/user.model.js';

const facultyQuizResultDetailsRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const getFacultyQuizResultDetailsSchema = z.object({
  params: z.object({
    attemptId: objectIdSchema,
  }).strict(),

  query: z.object({}).strict(),

  body: z.object({}).strict(),
});

/**
 * Get an individual submitted quiz attempt.
 *
 * GET /api/v1/quiz-results/faculty/:attemptId
 *
 * Access:
 * - Authenticated Faculty only.
 * - Faculty must own the assigned course.
 */
facultyQuizResultDetailsRouter.get(
  '/faculty/:attemptId',
  authenticate,
  authorize(USER_ROLES.FACULTY),
  authRateLimiter,
  validate(getFacultyQuizResultDetailsSchema),
  getFacultyQuizResultDetailsController,
);

export default facultyQuizResultDetailsRouter;