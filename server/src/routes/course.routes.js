import { Router } from 'express';

import {
  listMyCoursesController,
} from '../controllers/course.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const courseRouter = Router();

/**
 * Retrieve courses assigned to the authenticated student.
 *
 * GET /api/v1/courses/me
 */
courseRouter.get(
  '/me',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  listMyCoursesController,
);

export default courseRouter;